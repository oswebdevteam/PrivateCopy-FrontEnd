import { queryOptions } from "@tanstack/react-query";

import { api } from "./index";
import type { Window } from "./types";

export const queries = {
	leaderboard: (window: Window, asset?: string) =>
		queryOptions({
			queryKey: ["leaderboard", window, asset ?? "all-assets"] as const,
			queryFn: () => api.leaderboard(window, asset),
			staleTime: 30_000,
		}),

	strategy: (strategyId: string) =>
		queryOptions({
			queryKey: ["strategy", strategyId] as const,
			queryFn: () => api.strategy(strategyId),
			staleTime: 30_000,
		}),

	balance: (accountId: string | null) =>
		queryOptions({
			queryKey: ["balance", accountId] as const,
			queryFn: () => api.balance(),
			enabled: accountId !== null,
			staleTime: 15_000,
		}),

	keys: (accountId: string | null) =>
		queryOptions({
			queryKey: ["keys", accountId] as const,
			queryFn: () => api.keys(),
			enabled: accountId !== null,
			staleTime: 15_000,
		}),

	copySettings: (keyId: string) =>
		queryOptions({
			queryKey: ["copy-settings", keyId] as const,
			queryFn: () => api.copySettings(keyId),
		}),

	copyOrders: (keyId: string) =>
		queryOptions({
			queryKey: ["copy-orders", keyId] as const,
			queryFn: () => api.copyOrders(keyId),
			refetchInterval: 15_000,
			staleTime: 5_000,
		}),
};
