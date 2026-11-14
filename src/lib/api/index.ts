import { DEMO_MODE, newIdempotencyKey, request, setSession } from "./client";
import {
	DEMO_ACCOUNT,
	demoBalances,
	demoKeys,
	demoLeaderboard,
	demoOrders,
	demoSaveSettings,
	demoSettings,
	demoSoldKeys,
	demoStrategy,
} from "./demo";
import type {
	AccessKeyView,
	BalancesResponse,
	CopyOrderView,
	CreateStrategyRequest,
	FollowerSettings,
	LeaderboardEntry,
	NonceResponse,
	ShieldRequest,
	StrategyDetail,
	StrategyView,
	TokenResponse,
	TradeRequest,
	TradeResponse,
	UnshieldRequest,
	VaultQuoteResponse,
	Window,
} from "./types";

/** Demo latency, so loading states are exercised rather than skipped. */
function settle<T>(value: T, ms = 260): Promise<T> {
	return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const api = {
	leaderboard(
		window: Window,
		asset?: string,
	): Promise<Array<LeaderboardEntry>> {
		if (DEMO_MODE) {
			return settle(demoLeaderboard(window, asset));
		}
		const query = new URLSearchParams({ window });
		if (asset) {
			query.set("asset", asset);
		}
		return request(`/v1/leaderboard?${query.toString()}`);
	},

	strategy(strategyId: string): Promise<StrategyDetail> {
		if (DEMO_MODE) {
			const detail = demoStrategy(strategyId);
			if (!detail) {
				return Promise.reject(new Error("strategy not found"));
			}
			return settle(detail);
		}
		return request(`/v1/strategies/${strategyId}`);
	},

	balance(): Promise<BalancesResponse> {
		if (DEMO_MODE) {
			return settle(demoBalances());
		}
		return request("/v1/vault/balance", { withOneClickSession: true });
	},

	shield(body: ShieldRequest): Promise<VaultQuoteResponse> {
		if (DEMO_MODE) {
			return Promise.reject(
				new Error(
					"Shielding needs a live 1Click session. Set VITE_API_URL to run it.",
				),
			);
		}
		return request("/v1/vault/shield", {
			method: "POST",
			body,
			idempotencyKey: newIdempotencyKey(),
			withOneClickSession: true,
		});
	},

	unshield(body: UnshieldRequest): Promise<VaultQuoteResponse> {
		if (DEMO_MODE) {
			return Promise.reject(
				new Error(
					"Withdrawing needs a live 1Click session. Set VITE_API_URL to run it.",
				),
			);
		}
		return request("/v1/vault/unshield", {
			method: "POST",
			body,
			idempotencyKey: newIdempotencyKey(),
			withOneClickSession: true,
		});
	},

	createStrategy(body: CreateStrategyRequest): Promise<StrategyView> {
		if (DEMO_MODE) {
			return Promise.reject(
				new Error("Registering a strategy needs a live 1Click session."),
			);
		}
		return request("/v1/strategies", {
			method: "POST",
			body,
			withOneClickSession: true,
		});
	},

	trade(strategyId: string, body: TradeRequest): Promise<TradeResponse> {
		if (DEMO_MODE) {
			return Promise.reject(new Error("Trading needs a live 1Click session."));
		}
		return request(`/v1/strategies/${strategyId}/trades`, {
			method: "POST",
			body,
			idempotencyKey: newIdempotencyKey(),
			withOneClickSession: true,
		});
	},

	keys(): Promise<Array<AccessKeyView>> {
		if (DEMO_MODE) {
			return settle([...demoKeys(), ...demoSoldKeys()]);
		}
		return request("/v1/keys");
	},

	revokeKey(keyId: string): Promise<void> {
		if (DEMO_MODE) {
			return settle(undefined);
		}
		return request(`/v1/keys/${keyId}/revoke`, { method: "POST" });
	},

	copySettings(keyId: string): Promise<FollowerSettings> {
		// The server has no read endpoint for settings; the client keeps the
		// last saved copy and falls back to defaults.
		return settle(demoSettings(keyId), DEMO_MODE ? 200 : 0);
	},

	saveCopySettings(keyId: string, settings: FollowerSettings): Promise<void> {
		demoSaveSettings(keyId, settings);
		if (DEMO_MODE) {
			return settle(undefined);
		}
		return request(`/v1/copy/${keyId}/settings`, {
			method: "PUT",
			body: settings,
			withOneClickSession: true,
		});
	},

	copyOrders(keyId: string): Promise<Array<CopyOrderView>> {
		if (DEMO_MODE) {
			return settle(demoOrders(keyId));
		}
		return request(`/v1/copy/${keyId}/orders`);
	},

	pauseCopy(keyId: string): Promise<void> {
		if (DEMO_MODE) {
			const current = demoSettings(keyId);
			demoSaveSettings(keyId, { ...current, paused: true });
			return settle(undefined);
		}
		return request(`/v1/copy/${keyId}/pause`, { method: "POST" });
	},

	nonce(accountId: string): Promise<NonceResponse> {
		return request("/v1/auth/nonce", {
			method: "POST",
			body: { account_id: accountId },
		});
	},

	verify(payload: {
		account_id: string;
		public_key: string;
		signature: string;
		nonce: string;
		message: string;
		recipient: string;
		callback_url?: string;
	}): Promise<TokenResponse> {
		return request("/v1/auth/verify", { method: "POST", body: payload });
	},
};

/**
 * Demo sign-in: adopts the seeded account, no wallet involved. Live sign-in is
 * the NEP-413 flow in `lib/near/wallet.ts`, which lives outside this module so
 * the wallet selector is only loaded when a real backend is configured.
 */
export function signInAsDemoAccount(): void {
	setSession(DEMO_ACCOUNT, null);
}
