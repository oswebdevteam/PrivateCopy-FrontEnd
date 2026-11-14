import type {
	AccessKeyView,
	AttestationView,
	BalancesResponse,
	CopyOrderView,
	FollowerSettings,
	LeaderboardEntry,
	StrategyDetail,
	StrategyView,
	Window,
} from "./types";

/**
 * Seeded demo data. Time-compressed attestation history so the leaderboard and
 * the copy flow can be shown without waiting days (design doc, section 14).
 *
 * Every number here is one the real API would return, with the same shape, so
 * screens never branch on demo vs live.
 */

const USDC = "nep141:usdc.fakes.testnet";
const NEAR = "nep141:wrap.testnet";
const ETH = "nep141:eth.fakes.testnet";
const BTC = "nep141:btc.fakes.testnet";

export const DEMO_ACCOUNT = "demo.testnet";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function iso(offsetMs: number): string {
	return new Date(Date.now() + offsetMs).toISOString();
}

/** Deterministic hex digest, so demo roots and signatures look like the real thing. */
function root(seed: string): string {
	let hash = 0x811c9dc5;
	let hex = "";
	for (let round = 0; round < 8; round += 1) {
		for (const character of `${seed}:${round}`) {
			hash =
				Math.imul(hash ^ (character.codePointAt(0) ?? 0), 0x01000193) >>> 0;
		}
		hex += hash.toString(16).padStart(8, "0");
	}
	return `0x${hex}`;
}

interface DemoStrategy {
	strategy: StrategyView;
	twr_bps: number;
	drawdown_bps: number;
	nav_bucket: string;
	trade_count_bucket: string;
	curve: Array<number>;
}

const STRATEGIES: Array<DemoStrategy> = [
	{
		strategy: {
			strategy_id: "st_01HQZK7M8N3P4R5S6T7V8W9X0Y",
			owner: "atlas.testnet",
			name: "Atlas Momentum",
			vault_account: "atlas-vault.testnet",
			assets: [USDC, NEAR, ETH],
			live_price: "25000000",
			delayed_price: "8000000",
			key_duration_seconds: 30 * 86_400,
			max_followers: 250,
			status: "active",
			follower_count: 134,
		},
		twr_bps: 1_842,
		drawdown_bps: 412,
		nav_bucket: "100k–250k",
		trade_count_bucket: "50–100",
		curve: [
			0, 160, 240, 190, 420, 610, 580, 760, 940, 1180, 1120, 1390, 1610, 1842,
		],
	},
	{
		strategy: {
			strategy_id: "st_02HQZK7M8N3P4R5S6T7V8W9X0Y",
			owner: "nocturne.testnet",
			name: "Nocturne Basis",
			vault_account: "nocturne-vault.testnet",
			assets: [USDC, BTC],
			live_price: "40000000",
			delayed_price: null,
			key_duration_seconds: 14 * 86_400,
			max_followers: 60,
			status: "active",
			follower_count: 58,
		},
		twr_bps: 940,
		drawdown_bps: 118,
		nav_bucket: "250k–1M",
		trade_count_bucket: "100–250",
		curve: [0, 90, 150, 210, 260, 300, 380, 440, 520, 610, 700, 780, 860, 940],
	},
	{
		strategy: {
			strategy_id: "st_03HQZK7M8N3P4R5S6T7V8W9X0Y",
			owner: "kestrel.testnet",
			name: "Kestrel Mean Reversion",
			vault_account: "kestrel-vault.testnet",
			assets: [USDC, NEAR],
			live_price: "12000000",
			delayed_price: "4000000",
			key_duration_seconds: 7 * 86_400,
			max_followers: 500,
			status: "active",
			follower_count: 71,
		},
		twr_bps: 612,
		drawdown_bps: 734,
		nav_bucket: "25k–100k",
		trade_count_bucket: "250+",
		curve: [0, 210, 120, 340, 180, 260, 470, 300, 420, 540, 390, 520, 580, 612],
	},
	{
		strategy: {
			strategy_id: "st_04HQZK7M8N3P4R5S6T7V8W9X0Y",
			owner: "meridian.testnet",
			name: "Meridian Carry",
			vault_account: "meridian-vault.testnet",
			assets: [USDC, ETH, BTC],
			live_price: "60000000",
			delayed_price: "20000000",
			key_duration_seconds: 30 * 86_400,
			max_followers: 100,
			status: "active",
			follower_count: 96,
		},
		twr_bps: 428,
		drawdown_bps: 96,
		nav_bucket: "1M+",
		trade_count_bucket: "10–50",
		curve: [0, 40, 90, 120, 150, 190, 230, 260, 290, 330, 360, 390, 410, 428],
	},
	{
		strategy: {
			strategy_id: "st_05HQZK7M8N3P4R5S6T7V8W9X0Y",
			owner: "vesper.testnet",
			name: "Vesper Breakout",
			vault_account: "vesper-vault.testnet",
			assets: [USDC, NEAR, BTC],
			live_price: "18000000",
			delayed_price: "6000000",
			key_duration_seconds: 14 * 86_400,
			max_followers: 150,
			status: "paused",
			follower_count: 23,
		},
		twr_bps: -214,
		drawdown_bps: 1_180,
		nav_bucket: "25k–100k",
		trade_count_bucket: "50–100",
		curve: [
			0, 180, 90, -60, 140, -40, -180, -90, 60, -120, -260, -180, -240, -214,
		],
	},
];

/** The strategy the demo account owns, shown in the trader studio. */
export const DEMO_OWNED_STRATEGY_ID = STRATEGIES[0].strategy.strategy_id;

export const DEMO_CURVES: Record<string, Array<number>> = Object.fromEntries(
	STRATEGIES.map((entry) => [entry.strategy.strategy_id, entry.curve]),
);

const WINDOW_SCALE: Record<Window, number> = {
	"7d": 0.42,
	"30d": 1,
	all: 1.65,
};

export function demoLeaderboard(
	window: Window,
	asset?: string,
): Array<LeaderboardEntry> {
	const scale = WINDOW_SCALE[window];
	return STRATEGIES.filter(
		(entry) => !asset || entry.strategy.assets.includes(asset),
	)
		.map((entry) => ({
			strategy_id: entry.strategy.strategy_id,
			name: entry.strategy.name,
			assets: entry.strategy.assets,
			twr_bps: Math.round(entry.twr_bps * scale),
			drawdown_bps: Math.round(entry.drawdown_bps * scale),
			nav_bucket: entry.nav_bucket,
			trade_count_bucket: entry.trade_count_bucket,
			period_end: iso(-HOUR),
			snapshot_root: root(entry.strategy.strategy_id.slice(3, 9)),
			follower_count: entry.strategy.follower_count,
		}))
		.sort((left, right) => right.twr_bps - left.twr_bps);
}

export function demoStrategy(strategyId: string): StrategyDetail | null {
	const entry = STRATEGIES.find(
		(item) => item.strategy.strategy_id === strategyId,
	);
	if (!entry) {
		return null;
	}
	const attestations: Array<AttestationView> = entry.curve.map((twr, index) => {
		const end = -(entry.curve.length - 1 - index) * 12 * HOUR;
		return {
			strategy_id: strategyId,
			window: "30d",
			period_start: iso(end - 30 * DAY),
			period_end: iso(end),
			twr_bps: twr,
			drawdown_bps: Math.round(
				entry.drawdown_bps * ((index + 1) / entry.curve.length),
			),
			nav_bucket: entry.nav_bucket,
			trade_count_bucket: entry.trade_count_bucket,
			snapshot_root: root(`${index}${strategyId.slice(3, 7)}`),
			tee_quote: `sgx:${root(`q${index}`).slice(2, 42)}`,
			signature: `ed25519:${root(`s${index}`).slice(2, 50)}`,
			tx_hash: index % 2 === 0 ? root(`t${index}`).slice(2, 46) : null,
			created_at: iso(end + 60_000),
		};
	});
	return { strategy: entry.strategy, attestations: attestations.reverse() };
}

export function demoBalances(): BalancesResponse {
	return {
		balances: [
			{ tokenId: USDC, available: "12450320000", source: "private" },
			{
				tokenId: NEAR,
				available: "840000000000000000000000000",
				source: "private",
			},
			{ tokenId: ETH, available: "1420000000000000000", source: "private" },
		],
	};
}

export const DEMO_PUBLIC_BALANCES: Array<{
	tokenId: string;
	available: string;
}> = [
	{ tokenId: USDC, available: "3000000000" },
	{ tokenId: NEAR, available: "126000000000000000000000000" },
];

export function demoKeys(): Array<AccessKeyView> {
	return [
		{
			key_id: "key_01HQZK7M8N3P4R5S6T7V8W9X0Y",
			strategy_id: STRATEGIES[1].strategy.strategy_id,
			holder: DEMO_ACCOUNT,
			agent_pubkey: "x25519:8Ht4Qm2VxJpR7sNf1LbYc3Kd9Wg5Tz6Aq0Ue",
			tier: "live",
			expires_at: iso(9 * DAY),
			status: "active",
		},
		{
			key_id: "key_02HQZK7M8N3P4R5S6T7V8W9X0Y",
			strategy_id: STRATEGIES[3].strategy.strategy_id,
			holder: DEMO_ACCOUNT,
			agent_pubkey: "x25519:3Bf8Km5PwQnT2xLd6Ryc9Jh4Vg7Zs1Mo0Ai",
			tier: "delayed",
			expires_at: iso(21 * DAY),
			status: "active",
		},
		{
			key_id: "key_03HQZK7M8N3P4R5S6T7V8W9X0Y",
			strategy_id: STRATEGIES[2].strategy.strategy_id,
			holder: DEMO_ACCOUNT,
			agent_pubkey: "x25519:7Yn2Lq9TcWmP4zKf8Dbs3Rh6Vj1Xg5Uo0Ei",
			tier: "live",
			expires_at: iso(-2 * DAY),
			status: "expired",
		},
	];
}

/** Keys the demo trader has sold on their own strategy. */
export function demoSoldKeys(): Array<AccessKeyView> {
	return [
		{
			key_id: "key_11HQZK7M8N3P4R5S6T7V8W9X0Y",
			strategy_id: DEMO_OWNED_STRATEGY_ID,
			holder: "follower-one.testnet",
			agent_pubkey: "x25519:2Qp7Rn4McXvT8yLd5Fbs1Kh9Wj3Zg6Uo0Ai",
			tier: "live",
			expires_at: iso(17 * DAY),
			status: "active",
		},
		{
			key_id: "key_12HQZK7M8N3P4R5S6T7V8W9X0Y",
			strategy_id: DEMO_OWNED_STRATEGY_ID,
			holder: "copybot.testnet",
			agent_pubkey: "x25519:9Jd3Vn8QcTmP2xKf4Rbs7Lh1Wg5Zo0Ue6Ai",
			tier: "delayed",
			expires_at: iso(4 * DAY),
			status: "active",
		},
		{
			key_id: "key_13HQZK7M8N3P4R5S6T7V8W9X0Y",
			strategy_id: DEMO_OWNED_STRATEGY_ID,
			holder: "leaker.testnet",
			agent_pubkey: "x25519:5Tf1Km7PwQnR3xLd9Rbc2Jh8Vg4Zs6Mo0Ai",
			tier: "live",
			expires_at: iso(11 * DAY),
			status: "revoked",
		},
	];
}

const DEFAULT_SETTINGS: FollowerSettings = {
	multiplier_bps: 10_000,
	trade_cap_bps: 2_000,
	daily_loss_bps: 500,
	drawdown_stop_bps: 2_500,
	max_slippage_bps: 50,
	copy_vault_account: "demo-copy-vault.testnet",
	paused: false,
};

const settingsByKey = new Map<string, FollowerSettings>();

export function demoSettings(keyId: string): FollowerSettings {
	return settingsByKey.get(keyId) ?? { ...DEFAULT_SETTINGS };
}

export function demoSaveSettings(keyId: string, settings: FollowerSettings) {
	settingsByKey.set(keyId, settings);
}

export function demoOrders(keyId: string): Array<CopyOrderView> {
	const strategyId =
		demoKeys().find((key) => key.key_id === keyId)?.strategy_id ?? "st_demo";
	const rows: Array<
		[number, string, string | null, string | null, number | null, number]
	> = [
		[142, "settled", null, "4820000000", 18, 0.4],
		[141, "settled", null, "4810000000", 31, 2.6],
		[140, "skipped", "trade_cap_bps exceeded", null, null, 5.1],
		[139, "settled", null, "2400000000", 12, 9.8],
		[138, "refunded", "quote expired before deposit", "2400000000", null, 14.2],
		[137, "skipped", "daily_loss_bps reached", null, null, 20.5],
		[136, "settled", null, "4760000000", 24, 27.0],
		[135, "failed", "solver returned no fill", "1200000000", null, 33.3],
	];
	return rows.map(([seq, state, skip, amount, slippage, hoursAgo]) => ({
		key_id: keyId,
		strategy_id: strategyId,
		seq,
		state,
		skip_reason: skip,
		quote_id: state === "skipped" ? null : `q_${root(`${seq}`).slice(2, 14)}`,
		status_ref: state === "skipped" ? null : root(`r${seq}`).slice(2, 18),
		amount_in: amount,
		copy_slippage_bps: slippage,
		created_at: iso(-hoursAgo * HOUR),
		updated_at: iso(-hoursAgo * HOUR + 42_000),
	}));
}

/** Fills on the trader's own strategy — private to the trader. */
export function demoOwnFills(): Array<{
	seq: number;
	ts: string;
	sell: string;
	buy: string;
	amount_in: string;
	amount_out: string;
	epoch: number;
}> {
	return [
		{
			seq: 142,
			ts: iso(-0.4 * HOUR),
			sell: USDC,
			buy: NEAR,
			amount_in: "48200000000",
			amount_out: "19400000000000000000000000000",
			epoch: 7,
		},
		{
			seq: 141,
			ts: iso(-2.6 * HOUR),
			sell: NEAR,
			buy: USDC,
			amount_in: "18800000000000000000000000000",
			amount_out: "48100000000",
			epoch: 7,
		},
		{
			seq: 140,
			ts: iso(-5.1 * HOUR),
			sell: USDC,
			buy: ETH,
			amount_in: "24000000000",
			amount_out: "7100000000000000000",
			epoch: 6,
		},
		{
			seq: 139,
			ts: iso(-9.8 * HOUR),
			sell: ETH,
			buy: USDC,
			amount_in: "6900000000000000000",
			amount_out: "23600000000",
			epoch: 6,
		},
	];
}
