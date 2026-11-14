import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AssetChips } from "#/components/AssetChips";
import { AttestationBadge } from "#/components/AttestationBadge";
import { Badge, DisclosureTag, StateBadge } from "#/components/ui/Badge";
import { Button } from "#/components/ui/Button";
import { Copyable } from "#/components/ui/Copyable";
import { Alert, EmptyState, Rows, Spinner } from "#/components/ui/Feedback";
import { Field, Select, TextInput } from "#/components/ui/Field";
import { Modal } from "#/components/ui/Modal";
import { Panel, PanelHeader } from "#/components/ui/Panel";
import { Stat } from "#/components/ui/Stat";
import { api } from "#/lib/api";
import { DEMO_MODE } from "#/lib/api/client";
import { DEMO_OWNED_STRATEGY_ID, demoOwnFills } from "#/lib/api/demo";
import { queries } from "#/lib/api/queries";
import {
	assetDecimals,
	assetSymbol,
	bps,
	dateTime,
	duration,
	relative,
	units,
} from "#/lib/format";
import { useSession } from "#/lib/useSession";

export const Route = createFileRoute("/studio")({ component: StudioPage });

function StudioPage() {
	const session = useSession();
	const strategyId = DEMO_MODE ? DEMO_OWNED_STRATEGY_ID : null;
	const detail = useQuery({
		...queries.strategy(strategyId ?? ""),
		enabled: strategyId !== null,
	});
	const keys = useQuery(queries.keys(session.accountId));
	const [ticketOpen, setTicketOpen] = useState(false);

	if (!session.accountId) {
		return (
			<main className="page-wrap px-4 pt-10">
				<Panel>
					<EmptyState
						title="Connect a NEAR account"
						body="The studio is where a trader registers a strategy, trades it privately and sells access."
					/>
				</Panel>
			</main>
		);
	}

	if (strategyId === null) {
		return (
			<main className="page-wrap px-4 pt-10">
				<Panel>
					<EmptyState
						title="No strategy registered"
						body="Registering a strategy needs a live backend and a 1Click session for the vault account."
					/>
				</Panel>
			</main>
		);
	}

	const strategy = detail.data?.strategy;
	const attestations = detail.data?.attestations ?? [];
	const latest = attestations[0];
	const sold = (keys.data ?? []).filter(
		(key) => key.strategy_id === strategyId,
	);
	const active = sold.filter((key) => key.status === "active");
	const fills = demoOwnFills();

	return (
		<main className="page-wrap px-4 pt-8 pb-4">
			<header className="rise-in mb-6 flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="kicker mb-2">Trader studio</p>
					<h1 className="m-0 text-3xl font-extrabold tracking-tight">
						{strategy?.name ?? "Strategy"}
					</h1>
					<p className="m-0 mt-2 flex flex-wrap items-center gap-x-3 text-sm text-[var(--ink-soft)]">
						{strategy ? <AssetChips assets={strategy.assets} /> : null}
						{strategy ? (
							<span className="num">{strategy.vault_account}</span>
						) : null}
						{latest ? <AttestationBadge attestation={latest} /> : null}
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="primary" onClick={() => setTicketOpen(true)}>
						New trade
					</Button>
					{strategy ? (
						<Link
							to="/strategies/$strategyId"
							params={{ strategyId }}
							className="btn btn-ghost no-underline"
						>
							Public page
						</Link>
					) : null}
				</div>
			</header>

			<section className="rise-in mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<Stat
					label="Attested TWR"
					disclosure="attested"
					value={latest ? bps(latest.twr_bps) : "—"}
					tone={latest && latest.twr_bps >= 0 ? "up" : "down"}
				/>
				<Stat
					label="Active keys"
					disclosure="public"
					value={active.length}
					hint={strategy ? `cap ${strategy.max_followers}` : undefined}
				/>
				<Stat
					label="Access revenue"
					disclosure="private"
					value={
						strategy
							? `$${units(String(BigInt(strategy.live_price) * BigInt(active.length)), 6, 0)}`
							: "—"
					}
					hint="keys sold × live price, this period"
				/>
				<Stat
					label="Fills this epoch"
					disclosure="private"
					value={fills.filter((fill) => fill.epoch === fills[0]?.epoch).length}
					hint="your own trades, never public"
				/>
			</section>

			<div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
				<Panel className="rise-in overflow-hidden">
					<PanelHeader
						kicker="Private to you"
						title="Recent fills"
						description="Recorded by the strategy service, which emits one encrypted signal per fill to key holders."
						actions={<DisclosureTag kind="private" />}
					/>
					<div className="overflow-x-auto">
						<table className="grid-table min-w-[34rem]">
							<thead>
								<tr>
									<th>Seq</th>
									<th>When</th>
									<th>Sold</th>
									<th>Bought</th>
									<th className="text-right">Epoch</th>
								</tr>
							</thead>
							<tbody>
								{fills.map((fill) => (
									<tr key={fill.seq}>
										<td className="num text-[var(--ink-faint)]">#{fill.seq}</td>
										<td className="num whitespace-nowrap">
											{relative(fill.ts)}
										</td>
										<td className="num">
											{units(fill.amount_in, assetDecimals(fill.sell), 2)}{" "}
											<span className="text-[var(--ink-faint)]">
												{assetSymbol(fill.sell)}
											</span>
										</td>
										<td className="num">
											{units(fill.amount_out, assetDecimals(fill.buy), 2)}{" "}
											<span className="text-[var(--ink-faint)]">
												{assetSymbol(fill.buy)}
											</span>
										</td>
										<td className="num text-right text-[var(--ink-soft)]">
											{fill.epoch}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Panel>

				<Panel className="rise-in overflow-hidden">
					<PanelHeader
						kicker="Access keys sold"
						title="Subscribers"
						description="Revoking a key rotates the signal epoch, so the revoked holder can decrypt nothing further."
					/>
					{keys.isPending ? (
						<Rows rows={3} />
					) : sold.length === 0 ? (
						<EmptyState title="No keys sold yet" />
					) : (
						<ul className="m-0 list-none divide-y divide-[var(--line)] p-0">
							{sold.map((key) => (
								<KeyRow key={key.key_id} accessKey={key} />
							))}
						</ul>
					)}
				</Panel>
			</div>

			{strategy ? (
				<Panel className="rise-in mt-5">
					<PanelHeader kicker="Settings" title="Strategy configuration" />
					<dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 p-5 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
						<dt className="text-[var(--ink-faint)]">Live price</dt>
						<dd className="num m-0">${units(strategy.live_price, 6, 2)}</dd>
						<dt className="text-[var(--ink-faint)]">Delayed price</dt>
						<dd className="num m-0">
							{strategy.delayed_price
								? `$${units(strategy.delayed_price, 6, 2)}`
								: "not offered"}
						</dd>
						<dt className="text-[var(--ink-faint)]">Key duration</dt>
						<dd className="m-0">{duration(strategy.key_duration_seconds)}</dd>
						<dt className="text-[var(--ink-faint)]">Max followers</dt>
						<dd className="num m-0">{strategy.max_followers}</dd>
						<dt className="text-[var(--ink-faint)]">Status</dt>
						<dd className="m-0">
							<Badge tone={strategy.status === "active" ? "up" : "warn"}>
								{strategy.status}
							</Badge>
						</dd>
						<dt className="text-[var(--ink-faint)]">Strategy id</dt>
						<dd className="m-0">
							<Copyable value={strategy.strategy_id} head={12} tail={6} />
						</dd>
					</dl>
				</Panel>
			) : null}

			<TradeTicket
				open={ticketOpen}
				strategyId={strategyId}
				assets={strategy?.assets ?? []}
				onClose={() => setTicketOpen(false)}
			/>
		</main>
	);
}

function KeyRow({
	accessKey,
}: {
	accessKey: {
		key_id: string;
		holder: string;
		tier: string;
		status: string;
		expires_at: string;
		agent_pubkey: string;
	};
}) {
	const client = useQueryClient();
	const [confirming, setConfirming] = useState(false);
	const revoke = useMutation({
		mutationFn: () => api.revokeKey(accessKey.key_id),
		onSuccess: () => {
			setConfirming(false);
			void client.invalidateQueries({ queryKey: ["keys"] });
		},
	});

	return (
		<li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
			<div className="min-w-0">
				<p className="num m-0 text-sm font-semibold">{accessKey.holder}</p>
				<p className="m-0 mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-faint)]">
					<span className="capitalize">{accessKey.tier}</span>
					<span>·</span>
					<span>expires {relative(accessKey.expires_at)}</span>
					<Copyable value={accessKey.agent_pubkey} head={10} tail={4} />
				</p>
			</div>
			<div className="flex items-center gap-2">
				<StateBadge state={accessKey.status} />
				{accessKey.status === "active" ? (
					<Button
						size="sm"
						variant="danger"
						onClick={() => setConfirming(true)}
					>
						Revoke
					</Button>
				) : null}
			</div>

			<Modal
				open={confirming}
				title="Revoke access"
				onClose={() => setConfirming(false)}
				footer={
					<>
						<Button onClick={() => setConfirming(false)}>Cancel</Button>
						<Button
							variant="danger"
							disabled={revoke.isPending}
							onClick={() => revoke.mutate()}
						>
							{revoke.isPending ? (
								<Spinner label="Revoking" />
							) : (
								"Revoke and rotate epoch"
							)}
						</Button>
					</>
				}
			>
				<p className="mt-0 text-sm text-[var(--ink-soft)]">
					<span className="num">{accessKey.holder}</span> stops receiving
					signals immediately and the signal epoch rotates, so their copy of the
					epoch key is useless. Signals they have already received cannot be
					recalled.
				</p>
				{revoke.isError ? (
					<Alert tone="error" title="Revoke failed">
						{(revoke.error as Error).message}
					</Alert>
				) : null}
			</Modal>
		</li>
	);
}

/** The trade ticket is also the signal source: one fill, one encrypted signal. */
function TradeTicket({
	open,
	strategyId,
	assets,
	onClose,
}: {
	open: boolean;
	strategyId: string;
	assets: Array<string>;
	onClose: () => void;
}) {
	const [sell, setSell] = useState(assets[0] ?? "");
	const [buy, setBuy] = useState(assets[1] ?? "");
	const [amount, setAmount] = useState("");
	const [slippage, setSlippage] = useState(50);

	const trade = useMutation({
		mutationFn: () =>
			api.trade(strategyId, {
				sell_asset: sell,
				buy_asset: buy,
				amount: amount.trim(),
				max_slippage_bps: slippage,
			}),
	});

	return (
		<Modal
			open={open}
			title="Private trade"
			onClose={onClose}
			footer={
				<>
					<Button onClick={onClose}>Cancel</Button>
					<Button
						variant="primary"
						disabled={
							!sell ||
							!buy ||
							sell === buy ||
							amount.trim() === "" ||
							trade.isPending
						}
						onClick={() => trade.mutate()}
					>
						{trade.isPending ? (
							<Spinner label="Settling" />
						) : (
							"Execute privately"
						)}
					</Button>
				</>
			}
		>
			<div className="space-y-4">
				<div className="grid grid-cols-2 gap-3">
					<Field label="Sell">
						<Select
							value={sell}
							onChange={(event) => setSell(event.target.value)}
						>
							{assets.map((asset) => (
								<option key={asset} value={asset}>
									{assetSymbol(asset)}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Buy">
						<Select
							value={buy}
							onChange={(event) => setBuy(event.target.value)}
						>
							{assets.map((asset) => (
								<option key={asset} value={asset}>
									{assetSymbol(asset)}
								</option>
							))}
						</Select>
					</Field>
				</div>

				<Field
					label="Amount in smallest units"
					hint="Amounts are integers in smallest units, exactly as the API takes them."
				>
					<TextInput
						className="field num"
						inputMode="numeric"
						placeholder="48200000000"
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
					/>
				</Field>

				<Field label="Max slippage" suffix={`${(slippage / 100).toFixed(2)}%`}>
					<input
						type="range"
						min={0}
						max={500}
						step={5}
						value={slippage}
						onChange={(event) => setSlippage(Number(event.target.value))}
						className="w-full accent-[var(--brand)]"
					/>
				</Field>

				<Alert tone="info" title="What leaves this screen">
					The swap settles on the confidential shard. Key holders receive an
					encrypted signal carrying the direction and a size in basis points of
					your NAV — never your absolute size.
				</Alert>

				{trade.isError ? (
					<Alert tone="error" title="Trade failed">
						{(trade.error as Error).message}
					</Alert>
				) : null}

				{trade.isSuccess ? (
					<Alert tone="info" title={`Settled — signal #${trade.data.seq}`}>
						Epoch {trade.data.epoch}. Signal valid until{" "}
						{dateTime(trade.data.signal_valid_until)}.
					</Alert>
				) : null}
			</div>
		</Modal>
	);
}
