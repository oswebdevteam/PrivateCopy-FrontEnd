import { Buffer } from "buffer";

// `signMessage` takes a Buffer nonce, and the redirect wallets call
// `nonce.toString("base64")` on it. Vite ships no Node globals, so the polyfill
// has to land before the selector is imported anywhere.
if (typeof globalThis.Buffer === "undefined") {
	globalThis.Buffer = Buffer;
}

import type { WalletSelector } from "@near-wallet-selector/core";
import { setupWalletSelector } from "@near-wallet-selector/core";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";

import { api } from "#/lib/api";
import { clearSession, setSession } from "#/lib/api/client";

const NETWORK = (import.meta.env.VITE_NEAR_NETWORK ?? "testnet") as
	| "testnet"
	| "mainnet";

/**
 * Sign-in survives two separate redirects with MyNearWallet — one to connect
 * the account, one to sign the challenge — so the intent and the challenge are
 * both parked in sessionStorage and picked up again on return.
 */
const INTENT_KEY = "privatecopy.signin-intent";
const CHALLENGE_KEY = "privatecopy.signin-challenge";

interface ParkedChallenge {
	accountId: string;
	message: string;
	recipient: string;
	nonce: string;
	callbackUrl: string;
}

export type SignInResult = "signed-in" | "redirecting" | "idle";

let selectorPromise: Promise<WalletSelector> | null = null;
let modal: WalletSelectorModal | null = null;

export function getSelector(): Promise<WalletSelector> {
	if (!selectorPromise) {
		selectorPromise = setupWalletSelector({
			network: NETWORK,
			modules: [setupMyNearWallet()],
		});
	}
	return selectorPromise;
}

async function getModal(): Promise<WalletSelectorModal> {
	const selector = await getSelector();
	if (!modal) {
		// No contract is called during sign-in; the key registry id belongs here
		// once buying a key is wired.
		modal = setupModal(selector, { contractId: "" });
	}
	return modal;
}

function activeAccount(selector: WalletSelector): string | null {
	return (
		selector.store.getState().accounts.find((item) => item.active)?.accountId ??
		null
	);
}

/** Resolves once the user picks a wallet and it reports an account. */
function waitForAccount(selector: WalletSelector): Promise<string> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			subscription.unsubscribe();
			reject(new Error("Wallet sign-in timed out."));
		}, 180_000);
		const subscription = selector.store.observable.subscribe((state) => {
			const accountId = state.accounts.find((item) => item.active)?.accountId;
			if (accountId) {
				clearTimeout(timeout);
				subscription.unsubscribe();
				resolve(accountId);
			}
		});
	});
}

/**
 * NEP-413 sign-in: the server issues a nonce, the wallet signs it with a
 * full-access key, and the signature is exchanged for a JWT. An in-page wallet
 * returns the signature directly; a redirect wallet navigates away and comes
 * back with it in the URL, which `resumeSignIn` finishes.
 */
export async function walletSignIn(): Promise<SignInResult> {
	window.sessionStorage.setItem(INTENT_KEY, "1");
	const selector = await getSelector();

	let accountId = activeAccount(selector);
	if (!accountId) {
		const walletModal = await getModal();
		walletModal.show();
		// Connecting may itself navigate away; if it does, the account lands in
		// the store on return and `resumeSignIn` carries on from there.
		accountId = await waitForAccount(selector);
		walletModal.hide();
	}

	return requestSignature(accountId);
}

async function requestSignature(accountId: string): Promise<SignInResult> {
	const selector = await getSelector();
	const wallet = await selector.wallet();
	if (!wallet.signMessage) {
		window.sessionStorage.removeItem(INTENT_KEY);
		throw new Error(
			`${wallet.metadata.name} cannot sign messages. Use MyNearWallet.`,
		);
	}

	const challenge = await api.nonce(accountId);
	const callbackUrl = `${window.location.origin}${window.location.pathname}`;
	const parked: ParkedChallenge = {
		accountId,
		message: challenge.message,
		recipient: challenge.recipient,
		nonce: challenge.nonce,
		callbackUrl,
	};
	window.sessionStorage.setItem(CHALLENGE_KEY, JSON.stringify(parked));

	const signed = await wallet.signMessage({
		message: challenge.message,
		recipient: challenge.recipient,
		nonce: Buffer.from(challenge.nonce, "base64"),
		callbackUrl,
	});

	// A redirect wallet navigates away instead of returning a signature.
	if (!signed) {
		return "redirecting";
	}

	await exchange(parked, signed.publicKey, signed.signature);
	return "signed-in";
}

/**
 * Called on every load. Finishes whichever half of the flow a redirect
 * interrupted: the signature coming back in the URL, or an account that
 * connected but has not signed the challenge yet.
 */
export async function resumeSignIn(hasSession: boolean): Promise<SignInResult> {
	if (
		typeof window === "undefined" ||
		window.sessionStorage.getItem(INTENT_KEY) === null
	) {
		return "idle";
	}

	const parked = window.sessionStorage.getItem(CHALLENGE_KEY);
	const signature = readParam("signature");
	const publicKey = readParam("publicKey");

	if (parked && signature && publicKey) {
		const challenge = JSON.parse(parked) as ParkedChallenge;
		const accountId = readParam("accountId") ?? challenge.accountId;
		window.history.replaceState({}, "", challenge.callbackUrl);
		await exchange({ ...challenge, accountId }, publicKey, signature);
		return "signed-in";
	}

	if (hasSession) {
		finish();
		return "idle";
	}

	// Connected but unsigned: the account redirect landed, the challenge has
	// not been signed yet.
	const selector = await getSelector();
	const accountId = activeAccount(selector);
	return accountId ? requestSignature(accountId) : "idle";
}

function readParam(name: string): string | null {
	const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
	return (
		hash.get(name) ?? new URLSearchParams(window.location.search).get(name)
	);
}

async function exchange(
	challenge: ParkedChallenge,
	publicKey: string,
	signature: string,
) {
	try {
		const token = await api.verify({
			account_id: challenge.accountId,
			public_key: publicKey,
			signature,
			nonce: challenge.nonce,
			message: challenge.message,
			recipient: challenge.recipient,
			callback_url: challenge.callbackUrl,
		});
		setSession(challenge.accountId, token.access_token);
	} finally {
		finish();
	}
}

function finish() {
	window.sessionStorage.removeItem(INTENT_KEY);
	window.sessionStorage.removeItem(CHALLENGE_KEY);
}

export async function walletSignOut() {
	finish();
	clearSession();
	try {
		const selector = await getSelector();
		if (selector.isSignedIn()) {
			const wallet = await selector.wallet();
			await wallet.signOut();
		}
	} catch {
		// Signing out of the app is what matters; a wallet that refuses to
		// forget the connection must not strand the session.
	}
}
