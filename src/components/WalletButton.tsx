import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "#/components/ui/Button";
import { Alert } from "#/components/ui/Feedback";
import { Modal } from "#/components/ui/Modal";
import { signIn } from "#/lib/api";
import { clearSession, DEMO_MODE, setOneClickSession } from "#/lib/api/client";
import { shorten } from "#/lib/format";
import { useSession } from "#/lib/useSession";

export function WalletButton() {
	const session = useSession();
	const client = useQueryClient();
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [sessionToken, setSessionToken] = useState("");

	if (!session.accountId) {
		return (
			<>
				<Button
					variant="primary"
					size="sm"
					onClick={() => {
						setError(null);
						signIn()
							.then(() => client.invalidateQueries())
							.catch((cause: Error) => setError(cause.message));
					}}
				>
					Connect NEAR
				</Button>
				{error ? (
					<Modal
						open
						title="Sign-in unavailable"
						onClose={() => setError(null)}
					>
						<Alert tone="error" title="Wallet not connected">
							{error}
						</Alert>
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
						<Button
							variant="danger"
							onClick={() => {
								clearSession();
								void client.invalidateQueries();
								setOpen(false);
							}}
						>
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
