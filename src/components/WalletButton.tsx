import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "#/components/ui/Button";
import { Alert, Spinner } from "#/components/ui/Feedback";
import { Modal } from "#/components/ui/Modal";
import { signInAsDemoAccount } from "#/lib/api";
import { clearSession, DEMO_MODE, setOneClickSession } from "#/lib/api/client";
import { shorten } from "#/lib/format";
import { useSession } from "#/lib/useSession";

export function WalletButton() {
	const session = useSession();
	const client = useQueryClient();
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [sessionToken, setSessionToken] = useState("");

	// MyNearWallet redirects twice — once to connect the account, once to sign
	// the challenge — so every load checks whether a sign-in is mid-flight and
	// carries it to the end.
	const hasSession = session.token !== null;
	useEffect(() => {
		if (DEMO_MODE) {
			return;
		}
		let cancelled = false;
		void import("#/lib/near/wallet")
			.then(({ resumeSignIn }) => resumeSignIn(hasSession))
			.then((result) => {
				if (result === "signed-in" && !cancelled) {
					void client.invalidateQueries();
				}
			})
			.catch((cause: Error) => {
				if (!cancelled) {
					setError(cause.message);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [client, hasSession]);

	async function connect() {
		setError(null);
		setBusy(true);
		try {
			if (DEMO_MODE) {
				signInAsDemoAccount();
			} else {
				const { walletSignIn } = await import("#/lib/near/wallet");
				const result = await walletSignIn();
				if (result === "redirecting") {
					return;
				}
			}
			await client.invalidateQueries();
		} catch (cause) {
			setError((cause as Error).message);
		} finally {
			setBusy(false);
		}
	}

	async function disconnect() {
		if (DEMO_MODE) {
			clearSession();
		} else {
			const { walletSignOut } = await import("#/lib/near/wallet");
			await walletSignOut();
		}
		await client.invalidateQueries();
		setOpen(false);
	}

	if (!session.accountId) {
		return (
			<>
				<Button
					variant="primary"
					size="sm"
					disabled={busy}
					onClick={() => void connect()}
				>
					{busy ? <Spinner label="Connecting" /> : "Connect NEAR"}
				</Button>
				{error ? (
					<Modal open title="Could not connect" onClose={() => setError(null)}>
						<Alert tone="error" title="Sign-in failed">
							{error}
						</Alert>
						<p className="mt-3 mb-0 text-xs text-[var(--ink-faint)]">
							Sign-in signs a NEP-413 challenge with a full-access key, so the
							wallet has to support message signing — Meteor and MyNearWallet
							do. The account must exist on{" "}
							{import.meta.env.VITE_NEAR_NETWORK ?? "testnet"}.
						</p>
					</Modal>
				) : null}
			</>
		);
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="btn btn-ghost btn-sm"
			>
				<span
					className="h-1.5 w-1.5 rounded-full"
					style={{ background: "var(--attested)" }}
				/>
				<span className="num">{shorten(session.accountId, 10, 8)}</span>
			</button>

			<Modal
				open={open}
				title="Account"
				onClose={() => setOpen(false)}
				footer={
					<>
						<Button onClick={() => setOpen(false)}>Close</Button>
						<Button variant="danger" onClick={() => void disconnect()}>
							Sign out
						</Button>
					</>
				}
			>
				<dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
					<dt className="text-[var(--ink-faint)]">Account</dt>
					<dd className="num m-0">{session.accountId}</dd>
					<dt className="text-[var(--ink-faint)]">API session</dt>
					<dd className="m-0">
						{DEMO_MODE
							? "Demo fixtures (no backend)"
							: session.token
								? "JWT held"
								: "none"}
					</dd>
					<dt className="text-[var(--ink-faint)]">1Click session</dt>
					<dd className="m-0">
						{session.oneClickSession ? "Held in memory" : "not set"}
					</dd>
				</dl>

				{DEMO_MODE ? null : (
					<div className="space-y-2">
						<label
							className="block text-sm font-semibold"
							htmlFor="oneclick-session"
						>
							1Click user session
						</label>
						<input
							id="oneclick-session"
							className="field num"
							placeholder="paste session token"
							value={sessionToken}
							onChange={(event) => setSessionToken(event.target.value)}
						/>
						<p className="m-0 text-xs text-[var(--ink-faint)]">
							Required to read confidential balances, register a strategy or
							configure a copy vault. Kept in memory only — never stored, never
							logged — so it must be supplied again after a reload.
						</p>
						<Button
							onClick={() => {
								setOneClickSession(sessionToken.trim());
								void client.invalidateQueries();
							}}
						>
							Hold session
						</Button>
					</div>
				)}
			</Modal>
		</>
	);
}
