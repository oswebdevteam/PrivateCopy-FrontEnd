import type { ApiErrorBody } from "./types";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

/**
 * With no `VITE_API_URL` the app runs against seeded fixtures (the demo mode
 * from the design doc, section 14) so every screen is reviewable without a
 * backend, a private shard or a funded testnet account.
 */
export const DEMO_MODE = BASE_URL === "";

export class ApiError extends Error {
	readonly code: string;
	readonly retryable: boolean;
	readonly status: number;

	constructor(status: number, body: ApiErrorBody) {
		super(body.message);
		this.name = "ApiError";
		this.code = body.code;
		this.retryable = body.retryable;
		this.status = status;
	}
}

export interface SessionState {
	accountId: string | null;
	token: string | null;
	/** 1Click user session. Memory-only, exactly like the server's copy. */
	oneClickSession: string | null;
}

const STORAGE_KEY = "privatecopy.session";

/** Replaced, never mutated, so `useSyncExternalStore` sees a new snapshot. */
let snapshot: SessionState = {
	accountId: null,
	token: null,
	oneClickSession: null,
};
let restored = false;
const listeners = new Set<() => void>();

function update(next: Partial<SessionState>) {
	snapshot = { ...snapshot, ...next };
	for (const listener of listeners) {
		listener();
	}
}

export function subscribeSession(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function getSession(): SessionState {
	return snapshot;
}

export function restoreSession() {
	if (typeof window === "undefined" || restored) {
		return;
	}
	restored = true;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return;
		}
		const parsed = JSON.parse(raw) as {
			accountId?: string;
			token?: string;
			demo?: boolean;
		};
		// A session from the other mode is useless: demo accounts have no JWT,
		// and a live JWT means nothing to the fixtures. An entry without the
		// flag predates it and is discarded too.
		if (parsed.demo !== DEMO_MODE) {
			window.localStorage.removeItem(STORAGE_KEY);
			return;
		}
		if (parsed.accountId) {
			update({ accountId: parsed.accountId, token: parsed.token ?? null });
		}
	} catch {
		window.localStorage.removeItem(STORAGE_KEY);
	}
}

export function setSession(accountId: string, token: string | null) {
	if (typeof window !== "undefined") {
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ accountId, token }),
		);
	}
	update({ accountId, token });
}

export function clearSession() {
	if (typeof window !== "undefined") {
		window.localStorage.removeItem(STORAGE_KEY);
	}
	update({ accountId: null, token: null, oneClickSession: null });
}

export function setOneClickSession(value: string | null) {
	update({ oneClickSession: value && value.length > 0 ? value : null });
}

export interface RequestOptions {
	method?: "GET" | "POST" | "PUT";
	body?: unknown;
	/** Required by the server on every POST that moves value. */
	idempotencyKey?: string;
	/** Forwards the memory-only 1Click user session. */
	withOneClickSession?: boolean;
	signal?: AbortSignal;
}

export async function request<T>(
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const headers = new Headers({ accept: "application/json" });
	if (options.body !== undefined) {
		headers.set("content-type", "application/json");
	}
	if (snapshot.token) {
		headers.set("authorization", `Bearer ${snapshot.token}`);
	}
	if (options.idempotencyKey) {
		headers.set("idempotency-key", options.idempotencyKey);
	}
	if (options.withOneClickSession && snapshot.oneClickSession) {
		headers.set("x-1click-session", snapshot.oneClickSession);
	}

	const response = await fetch(`${BASE_URL}${path}`, {
		method: options.method ?? "GET",
		headers,
		body: options.body === undefined ? undefined : JSON.stringify(options.body),
		signal: options.signal,
	});

	if (!response.ok) {
		throw new ApiError(response.status, await errorBody(response));
	}
	if (response.status === 204) {
		return undefined as T;
	}
	return (await response.json()) as T;
}

async function errorBody(response: Response): Promise<ApiErrorBody> {
	try {
		const parsed = (await response.json()) as Partial<ApiErrorBody>;
		return {
			code: parsed.code ?? "unknown",
			message: parsed.message ?? response.statusText,
			retryable: parsed.retryable ?? false,
		};
	} catch {
		return { code: "unknown", message: response.statusText, retryable: false };
	}
}

export function newIdempotencyKey(): string {
	return crypto.randomUUID();
}

/** `GET /v1/signals/{id}` is a WebSocket; the URL mirrors the REST base. */
export function signalSocketUrl(strategyId: string, keyId: string): string {
	const base = BASE_URL || window.location.origin;
	const url = new URL(`${base}/v1/signals/${strategyId}`);
	url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
	url.searchParams.set("key_id", keyId);
	return url.toString();
}
