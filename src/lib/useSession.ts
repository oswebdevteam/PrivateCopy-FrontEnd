import { useSyncExternalStore } from "react";
import type { SessionState } from "./api/client";
import { getSession, restoreSession, subscribeSession } from "./api/client";

const SERVER_SNAPSHOT: SessionState = {
	accountId: null,
	token: null,
	oneClickSession: null,
};

/** Subscribes to the module-level session so every screen agrees on who is signed in. */
export function useSession(): SessionState {
	return useSyncExternalStore(
		subscribeSession,
		() => {
			restoreSession();
			return getSession();
		},
		() => SERVER_SNAPSHOT,
	);
}
