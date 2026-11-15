import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { DisclosureTag } from "#/components/ui/Badge";
import { Button } from "#/components/ui/Button";
import { Alert, EmptyState, Rows, Spinner } from "#/components/ui/Feedback";
import { Field, TextInput } from "#/components/ui/Field";
import { Modal } from "#/components/ui/Modal";
import { Panel, PanelHeader } from "#/components/ui/Panel";
import { api } from "#/lib/api";
import { DEMO_MODE } from "#/lib/api/client";
import { DEMO_PUBLIC_BALANCES } from "#/lib/api/demo";
import { queries } from "#/lib/api/queries";
import { assetDecimals, assetSymbol, units } from "#/lib/format";
import { useSession } from "#/lib/useSession";

export const Route = createFileRoute("/vault")({ component: VaultPage });

type Flow = { kind: "shield" | "unshield"; asset: string } | null;

function VaultPage() {
	const session = useSession();
	const balances = useQuery(
		queries.balance(session.accountId, session.oneClickSession),
	);
	const [flow, setFlow] = useState<Flow>(null);

	if (!session.accountId) {
		return (
			<main className="page-wrap px-4 pt-10">
				<Panel>
					<EmptyState
						title="Connect a NEAR account"
						body="Your vault holds the confidential balance that strategies and copy agents trade against."
					/>
				</Panel>
			</main>
		);
	}

	return (
		<main className="page-wrap px-4 pt-8 pb-4">
			<header className="rise-in mb-6">
				<p className="kicker mb-2">Vault</p>
				<h1 className="m-0 text-3xl font-extrabold tracking-tight">
					Public and confidential
				</h1>
				<p className="m-0 mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">
					Shielding moves a public balance onto the confidential shard, where
					swaps settle without revealing amounts. Withdrawing reverses it. Both
					run through 1Click as one confirm, and both are visible on public NEAR
					only as a transfer to the treasury.
				</p>
			</header>

			<div className="grid gap-5 lg:grid-cols-2">
				<Panel className="rise-in overflow-hidden">
					<PanelHeader
						kicker="On public NEAR"
						title="Public balance"
						description="Anyone can see these. They are the only amounts an observer learns."
						actions={<DisclosureTag kind="public" />}
					/>
					{DEMO_MODE ? (
						<BalanceTable
							rows={DEMO_PUBLIC_BALANCES}
							action={(asset) => (
								<Button
									size="sm"
									variant="primary"
									onClick={() => setFlow({ kind: "shield", asset })}
								>
									Shield
								</Button>
							)}
						/>
					) : (
						<EmptyState
							title="Public balances not wired"
							body="The server exposes confidential balances only; public balances come straight from NEAR RPC."
						/>
					)}
				</Panel>

				<Panel className="rise-in overflow-hidden">
					<PanelHeader
						kicker="On the confidential shard"
						title="Confidential balance"
						description="Read through your 1Click session. Nobody else — including the leaderboard — sees these."
						actions={<DisclosureTag kind="private" />}
					/>
					{!DEMO_MODE && !session.oneClickSession ? (
						<EmptyState
							title="1Click session needed"
							body="Confidential balances are read through your own 1Click session, which the server never stores. Open the account menu and paste one to see them."
						/>
					) : balances.isPending ? (
						<Rows rows={3} />
					) : balances.isError ? (
						<div className="p-5">
							<Alert tone="error" title="Could not read confidential balances">
								{(balances.error as Error).message}
							</Alert>
						</div>
					) : balances.data.balances.length === 0 ? (
						<EmptyState
							title="Nothing shielded yet"
							body="Shield a public balance to start."
						/>
					) : (
						<BalanceTable
							rows={balances.data.balances}
							action={(asset) => (
								<Button
									size="sm"
									onClick={() => setFlow({ kind: "unshield", asset })}
								>
									Withdraw
								</Button>
							)}
						/>
					)}
				</Panel>
			</div>

			<div className="mt-5">
				<Alert tone="warn" title="Screenshot warning">
					The confidential column is private to you. Anything you share from it
					— a screenshot, a paste — discloses what the shard was built to hide.
				</Alert>
			</div>

			<TransferModal flow={flow} onClose={() => setFlow(null)} />
		</main>
	);
}

function BalanceTable({
	rows,
	action,
}: {
	rows: Array<{ tokenId: string; available: string }>;
	action: (asset: string) => React.ReactNode;
}) {
	return (
		<table className="grid-table">
			<thead>
				<tr>
					<th>Asset</th>
					<th className="text-right">Available</th>
					<th className="text-right" />
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.tokenId}>
						<td>
							<span className="font-semibold">{assetSymbol(row.tokenId)}</span>
							<span className="num ml-2 text-xs text-[var(--ink-faint)]">
								{row.tokenId}
							</span>
						</td>
						<td className="num text-right font-semibold">
							{units(row.available, assetDecimals(row.tokenId), 4)}
						</td>
						<td className="text-right">{action(row.tokenId)}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

/**
 * Shield and withdraw are a three-call 1Click sequence (preview quote, real
 * quote, signed intent). The UI keeps it to one confirm and reports progress.
 */
function TransferModal({ flow, onClose }: { flow: Flow; onClose: () => void }) {
	const client = useQueryClient();
	const [amount, setAmount] = useState("");
	const shielding = flow?.kind === "shield";
	const decimals = flow ? assetDecimals(flow.asset) : 6;

	const transfer = useMutation({
		mutationFn: async () => {
			if (!flow) {
				throw new Error("no transfer in progress");
			}
			const smallest = toSmallestUnits(amount, decimals);
			return shielding
				? api.shield({ asset: flow.asset, amount: smallest, source: "intents" })
				: api.unshield({ asset: flow.asset, amount: smallest });
		},
		onSuccess: () => client.invalidateQueries({ queryKey: ["balance"] }),
	});

	const close = () => {
		transfer.reset();
		setAmount("");
		onClose();
	};

	const parsed = Number(amount);
	const valid = amount.trim() !== "" && Number.isFinite(parsed) && parsed > 0;

	return (
		<Modal
			open={flow !== null}
			title={shielding ? "Shield into confidential" : "Withdraw to public"}
			onClose={close}
			footer={
				<>
					<Button onClick={close}>Cancel</Button>
					<Button
						variant="primary"
						disabled={!valid || transfer.isPending}
						onClick={() => transfer.mutate()}
					>
						{transfer.isPending ? (
							<Spinner label="Quoting" />
						) : shielding ? (
							"Shield"
						) : (
							"Withdraw"
						)}
					</Button>
				</>
			}
		>
			{flow ? (
				<div className="space-y-4">
					<Field
						label={`Amount (${assetSymbol(flow.asset)})`}
						hint={
							shielding
								? "Moves to the treasury, then a matching confidential balance is minted on the private shard."
								: "Unshields back to your public intents balance. The withdrawal itself is visible on public NEAR."
						}
					>
						<TextInput
							className="field num"
							inputMode="decimal"
							placeholder="0.00"
							value={amount}
							onChange={(event) => setAmount(event.target.value)}
						/>
					</Field>

					<ul className="m-0 list-none space-y-1.5 p-0 text-xs text-[var(--ink-soft)]">
						<li className="flex items-center gap-2">
							<DisclosureTag kind="public" withLabel={false} /> an observer sees
							a transfer of this size
						</li>
						<li className="flex items-center gap-2">
							<DisclosureTag kind="private" withLabel={false} /> every trade
							afterwards is hidden
						</li>
					</ul>

					{transfer.isError ? (
						<Alert tone="error" title="Transfer failed">
							{(transfer.error as Error).message}
						</Alert>
					) : null}

					{transfer.isSuccess ? (
						<Alert tone="info" title="Quote accepted">
							{transfer.data.quote.quote.depositAddress ? (
								<>
									Deposit address{" "}
									<span className="num">
										{transfer.data.quote.quote.depositAddress}
									</span>
									. The signed intent has been generated; settlement is tracked
									by the backend.
								</>
							) : (
								"The signed intent has been generated; settlement is tracked by the backend."
							)}
						</Alert>
					) : null}
				</div>
			) : null}
		</Modal>
	);
}

/** Decimal string -> smallest-unit integer string, without touching floats. */
function toSmallestUnits(value: string, decimals: number): string {
	const [whole, fraction = ""] = value.trim().split(".");
	const padded = fraction.padEnd(decimals, "0").slice(0, decimals);
	return `${whole.replace(/^0+(?=\d)/, "")}${padded}`.replace(/^0+(?=\d)/, "");
}
