/**
 * Wire types for the PrivateCopy server (see the backend's `src/api`).
 * Our own endpoints serialize snake_case; the nested 1Click payloads are
 * camelCase because they come straight from the 1Click API.
 */

export type Window = "7d" | "30d" | "all";

export type StrategyStatus = "active" | "paused";
export type AccessTier = "live" | "delayed";
export type AccessKeyStatus = "active" | "expired" | "revoked";

export type CopyState =
	| "received"
	| "sized"
	| "quoted"
	| "funded"
	| "settled"
	| "skipped"
	| "refunded"
	| "failed";

export interface LeaderboardEntry {
	strategy_id: string;
	name: string;
	assets: Array<string>;
	twr_bps: number;
	drawdown_bps: number;
	nav_bucket: string;
	trade_count_bucket: string;
	period_end: string;
	snapshot_root: string;
	follower_count: number;
}

export interface StrategyView {
	strategy_id: string;
	owner: string;
	name: string;
	vault_account: string;
	assets: Array<string>;
	live_price: string;
	delayed_price: string | null;
	key_duration_seconds: number;
	max_followers: number;
	status: string;
	follower_count: number;
}

export interface AttestationView {
	strategy_id: string;
	window: string;
	period_start: string;
	period_end: string;
	twr_bps: number;
	drawdown_bps: number;
	nav_bucket: string;
	trade_count_bucket: string;
	snapshot_root: string;
	tee_quote: string;
	signature: string;
	tx_hash: string | null;
	created_at: string;
}

export interface StrategyDetail {
	strategy: StrategyView;
	attestations: Array<AttestationView>;
}

export interface AccessKeyView {
	key_id: string;
	strategy_id: string;
	holder: string;
	agent_pubkey: string;
	tier: string;
	expires_at: string;
	status: string;
}

export interface FollowerSettings {
	multiplier_bps: number;
	trade_cap_bps: number;
	daily_loss_bps: number;
	drawdown_stop_bps: number;
	max_slippage_bps: number;
	copy_vault_account: string;
	paused: boolean;
}

export interface CopyOrderView {
	key_id: string;
	strategy_id: string;
	seq: number;
	state: string;
	skip_reason: string | null;
	quote_id: string | null;
	status_ref: string | null;
	amount_in: string | null;
	copy_slippage_bps: number | null;
	created_at: string;
	updated_at: string;
}

export interface BalanceEntry {
	tokenId: string;
	available: string;
	source: "private";
}

export interface BalancesResponse {
	balances: Array<BalanceEntry>;
}

export interface Quote {
	depositAddress: string | null;
	depositMemo: string | null;
	amountIn: string;
	amountInFormatted: string;
	amountInUsd: string;
	minAmountIn: string;
	amountOut: string;
	amountOutFormatted: string;
	amountOutUsd: string;
	minAmountOut: string;
	deadline: string | null;
	timeWhenInactive: string | null;
	timeEstimate: number;
}

export interface QuoteResponse {
	correlationId: string;
	timestamp: string;
	signature: string;
	quoteRequest: unknown;
	quote: Quote;
}

export interface VaultQuoteResponse {
	preview: QuoteResponse;
	quote: QuoteResponse;
	intent: { intent: unknown; correlationId: string } | null;
}

export interface ShieldRequest {
	asset: string;
	amount: string;
	source: "intents" | "origin_chain";
}

export interface UnshieldRequest {
	asset: string;
	amount: string;
}

export interface CreateStrategyRequest {
	name: string;
	vault_account: string;
	assets: Array<string>;
	live_price: string;
	delayed_price: string | null;
	key_duration_seconds: number;
	max_followers: number;
}

export interface TradeRequest {
	sell_asset: string;
	buy_asset: string;
	amount: string;
	max_slippage_bps: number;
}

export interface TradeResponse {
	status: string;
	seq: number;
	epoch: number;
	deposit_address: string;
	amount_in: string;
	amount_out: string;
	signal_valid_until: string;
	near_tx_hashes: Array<string>;
}

export interface NonceResponse {
	nonce: string;
	message: string;
	recipient: string;
	expires_at: string;
}

export interface TokenResponse {
	access_token: string;
	expires_at: string;
}

/** Single error shape used by every endpoint. */
export interface ApiErrorBody {
	code: string;
	message: string;
	retryable: boolean;
}
