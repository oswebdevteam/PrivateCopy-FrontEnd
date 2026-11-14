import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AssetChips } from "#/components/AssetChips";
import { AttestationBadge } from "#/components/AttestationBadge";
import { AttestationChart } from "#/components/charts/AttestationChart";
import { RiskMeter } from "#/components/RiskMeter";
import { Badge, DisclosureTag } from "#/components/ui/Badge";
import { Button } from "#/components/ui/Button";
import { Copyable } from "#/components/ui/Copyable";
import { Alert, EmptyState, Rows } from "#/components/ui/Feedback";
import { Modal } from "#/components/ui/Modal";
import { Panel, PanelHeader } from "#/components/ui/Panel";
import { Segmented } from "#/components/ui/Segmented";
import { Stat } from "#/components/ui/Stat";
import { queries } from "#/lib/api/queries";
import type { AttestationView, StrategyView } from "#/lib/api/types";
import { bps, bpsPlain, dateTime, duration, units } from "#/lib/format";
import { useSession } from "#/lib/useSession";

/** Windows the attestor publishes, in the order the UI offers them. */
const WINDOW_ORDER: Array<string> = ["7d", "30d", "all"];

type Tier = "live" | "delayed";

export const Route = createFileRoute("/strategies/$strategyId")({
	component: StrategyPage,
});

function StrategyPage() {
	const { strategyId } = Route.useParams();
	const detail = useQuery(queries.strategy(strategyId));
	const [buying, setBuying] = useState<Tier | null>(null);
	const [window, setWindow] = useState<string | null>(null);

	if (detail.isPending) {
		return (
			<main className="page-wrap px-4 pt-10">
				<Panel>
					<Rows rows={6} />
				</Panel>
			</main>
		);
	}

	if (detail.isError) {
		return (
			<main className="page-wrap px-4 pt-10">
				<Panel>
					<EmptyState
						title="Strategy not found"
						body={
							<>
								{(detail.error as Error).message}.{" "}
								<Link to="/" className="text-[var(--brand-ink)]">
									Back to the leaderboard
								</Link>
							</>
						}
					/>
				</Panel>
			</main>
		);
	}

	const { strategy } = detail.data;

	// The API returns every window in one list, so the page picks one: mixing
	// 7d, 30d and all-time returns on a single curve would be meaningless.
	const windows = WINDOW_ORDER.filter((candidate) =>
		detail.data.attestations.some((item) => item.window === candidate),
	);
	const selected =
		window && windows.includes(window) ? window : (windows[1] ?? windows[0]);
	const attestations = detail.data.attestations.filter(
		(item) => item.window === selected,
	);
	const latest = attestations[0];

	return (
		<main className="page-wrap px-4 pt-8 pb-4">
			<Link
				to="/"
				className="mb-5 inline-block text-sm text-[var(--ink-soft)] no-underline hover:text-[var(--ink)]"
			>
				← Leaderboard
			</Link>

			<div className="grid gap-5 lg:grid-cols-[1.7fr_1fr] lg:items-start">
				<div className="space-y-5">
					<Header strategy={strategy} latest={latest} />

					<section className="rise-in grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<Stat
							label={`Attested return · ${selected ?? "—"}`}
							disclosure="attested"
							value={latest ? bps(latest.twr_bps) : "—"}
							tone={latest && latest.twr_bps >= 0 ? "up" : "down"}
							hint="time-weighted, computed in the TEE"
						/>
						<Stat
							label="Risk"
							disclosure="attested"
							value={
								latest ? (
									<span className="flex items-center">
										<RiskMeter drawdownBps={latest.drawdown_bps} />
									</span>
								) : (
									"—"
								)
							}
							hint={
								latest
									? `max drawdown -${bpsPlain(latest.drawdown_bps)}`
									: undefined
							}
						/>
						<Stat
							label="NAV band"
							disclosure="attested"
							value={latest?.nav_bucket ?? "—"}
							hint="bucketed so size does not leak"
						/>
						<Stat
							label="Copiers"
							disclosure="public"
							value={strategy.follower_count}
							hint={`${strategy.max_followers - strategy.follower_count} seats left of ${strategy.max_followers}`}
						/>
					</section>

					<Panel className="rise-in overflow-hidden">
						<PanelHeader
							kicker="Attested time-weighted return"
							title="Track record"
							description="Each point is one signed attestation computed inside the TEE from confidential balances."
							actions={
								<div className="flex items-center gap-2">
									{windows.length > 1 ? (
										<Segmented
											label="Attestation window"
											value={selected}
											onChange={setWindow}
											options={windows.map((candidate) => ({
												value: candidate,
												label: candidate,
											}))}
										/>
									) : null}
									<DisclosureTag kind="attested" />
								</div>
							}
						/>
						<div className="pt-3">
							<AttestationChart attestations={attestations} />
						</div>
						<details className="border-t border-[var(--line)]">
							<summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]">
								{attestations.length} attestations — open the signed history
							</summary>
							<div className="max-h-72 overflow-y-auto">
								<table className="grid-table">
									<thead className="sticky top-0 bg-[var(--panel-strong)]">
										<tr>
											<th>Period end</th>
											<th className="text-right">Return</th>
											<th className="text-right">Drawdown</th>
											<th>Snapshot root</th>
											<th className="text-right">Evidence</th>
										</tr>
									</thead>
									<tbody>
										{attestations.map((attestation) => (
											<tr
												key={`${attestation.period_end}-${attestation.snapshot_root}`}
											>
												<td className="num whitespace-nowrap">
													{dateTime(attestation.period_end)}
												</td>
												<td
													className="num text-right font-semibold"
													style={{
														color:
															attestation.twr_bps >= 0
																? "var(--up)"
																: "var(--down)",
													}}
												>
													{bps(attestation.twr_bps)}
												</td>
												<td className="num text-right text-[var(--ink-soft)]">
													-{bpsPlain(attestation.drawdown_bps)}
												</td>
												<td>
													<Copyable
														value={attestation.snapshot_root}
														head={8}
														tail={6}
													/>
												</td>
												<td className="text-right">
													<AttestationBadge
														attestation={attestation}
														label="Verify"
													/>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</details>
					</Panel>

					<Panel className="rise-in">
						<PanelHeader
							kicker="Before you copy"
							title="What you see, and what you never will"
						/>
						<ul className="m-0 list-none space-y-3 p-5 text-sm">
							<Fact kind="attested">
								Return, drawdown and NAV band come from the TEE attestor and are
								signed. Open any attestation above to check the signature and
								snapshot root.
							</Fact>
							<Fact kind="public">
								Copiers, assets, pricing and key expiry are on public NEAR. So
								is the fact that you bought a key.
							</Fact>
							<Fact kind="private">
								Positions, order sizes and entry timing stay on the confidential
								shard. A key buys you the trader's signals — direction and size
								as a share of their NAV — never their book.
							</Fact>
						</ul>
					</Panel>
				</div>

				<div className="space-y-5 lg:sticky lg:top-20">
					<AccessCard strategy={strategy} onBuy={setBuying} />

					<Panel className="rise-in">
						<PanelHeader kicker="On-chain" title="Accounts" />
						<dl className="m-0 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 p-5 text-sm">
							<dt className="text-[var(--ink-faint)]">Strategy</dt>
							<dd className="m-0">
								<Copyable value={strategy.strategy_id} head={10} tail={6} />
							</dd>
							<dt className="text-[var(--ink-faint)]">Owner</dt>
							<dd className="num m-0">{strategy.owner}</dd>
							<dt className="text-[var(--ink-faint)]">Vault</dt>
							<dd className="num m-0">{strategy.vault_account}</dd>
							<dt className="text-[var(--ink-faint)]">Assets</dt>
							<dd className="m-0">
								<AssetChips assets={strategy.assets} max={6} />
							</dd>
						</dl>
					</Panel>
				</div>
			</div>

			<BuyModal
				tier={buying}
				strategyName={strategy.name}
				price={
					buying === "delayed" ? strategy.delayed_price : strategy.live_price
				}
				durationSeconds={strategy.key_duration_seconds}
				onClose={() => setBuying(null)}
			/>
		</main>
	);
}

function Header({
	strategy,
	latest,
}: {
	strategy: StrategyView;
	latest: AttestationView | undefined;
}) {
	return (
		<header className="rise-in flex flex-wrap items-start gap-4">
			<div className="min-w-0">
				<div className="mb-2 flex flex-wrap items-center gap-2">
					<Badge tone={strategy.status === "active" ? "up" : "warn"} dot>
						{strategy.status}
					</Badge>
					{latest ? <AttestationBadge attestation={latest} /> : null}
				</div>
				<h1 className="m-0 text-3xl font-extrabold tracking-tight">
					{strategy.name}
				</h1>
				<p className="m-0 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--ink-soft)]">
					<span className="num">by {strategy.owner}</span>
					<span>·</span>
					<AssetChips assets={strategy.assets} />
				</p>
			</div>
		</header>
	);
}

/**
 * The sell-access card, modelled on a signal marketplace listing: tier, price,
 * what the period is, how many seats remain, one action. Everything a buyer
 * needs is here, so the decision never requires scrolling back up.
 */
function AccessCard({
	strategy,
	onBuy,
}: {
	strategy: StrategyView;
	onBuy: (tier: Tier) => void;
}) {
	const [tier, setTier] = useState<Tier>("live");
	const price =
		tier === "delayed" ? strategy.delayed_price : strategy.live_price;
	const seatsLeft = strategy.max_followers - strategy.follower_count;
	const sold = seatsLeft <= 0;

	return (
		<Panel className="rise-in overflow-hidden">
			<PanelHeader kicker="Access" title="Buy a key" />
			<div className="space-y-4 p-5">
				<div className="space-y-2">
					<TierOption
						tier="live"
						price={strategy.live_price}
						selected={tier === "live"}
						onSelect={() => setTier("live")}
						durationSeconds={strategy.key_duration_seconds}
						description="Signals arrive as the trader fills."
					/>
					{strategy.delayed_price ? (
						<TierOption
							tier="delayed"
							price={strategy.delayed_price}
							selected={tier === "delayed"}
							onSelect={() => setTier("delayed")}
							durationSeconds={strategy.key_duration_seconds}
							description="Same signals, released after a fixed delay."
						/>
					) : null}
				</div>

				<div className="panel-flat flex items-baseline justify-between gap-3 p-4">
					<span className="text-sm text-[var(--ink-soft)]">You pay</span>
					<span className="num text-2xl font-bold">
						{price ? `$${units(price, 6, 2)}` : "—"}
						<span className="text-xs font-normal text-[var(--ink-faint)]">
							{" "}
							/ {duration(strategy.key_duration_seconds)}
						</span>
					</span>
				</div>

				<Button
					variant="primary"
					className="w-full"
					disabled={sold || strategy.status !== "active"}
					onClick={() => onBuy(tier)}
				>
					{sold ? "All seats taken" : `Buy ${tier} key`}
				</Button>

				<dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
					<dt className="text-[var(--ink-faint)]">Seats</dt>
					<dd className="num m-0">
						{strategy.follower_count} of {strategy.max_followers} taken
					</dd>
					<dt className="text-[var(--ink-faint)]">Valid for</dt>
					<dd className="m-0">
						{duration(strategy.key_duration_seconds)} from purchase
					</dd>
					<dt className="text-[var(--ink-faint)]">Bound to</dt>
					<dd className="m-0">your agent's key — not transferable</dd>
					<dt className="text-[var(--ink-faint)]">Revocable</dt>
					<dd className="m-0">yes, by the trader; the signal epoch rotates</dd>
				</dl>
			</div>
		</Panel>
	);
}

function TierOption({
	tier,
	price,
	selected,
	onSelect,
	durationSeconds,
	description,
}: {
	tier: Tier;
	price: string;
	selected: boolean;
	onSelect: () => void;
	durationSeconds: number;
	description: string;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={selected}
			className="w-full cursor-pointer rounded-xl border p-3 text-left transition"
			style={{
				borderColor: selected ? "var(--brand-line)" : "var(--line)",
				background: selected ? "var(--brand-soft)" : "var(--panel-raised)",
			}}
		>
			<span className="flex items-baseline justify-between gap-3">
				<span className="text-sm font-bold capitalize">{tier}</span>
				<span className="num text-sm font-semibold">
					${units(price, 6, 0)}
					<span className="text-xs font-normal text-[var(--ink-faint)]">
						{" "}
						/ {duration(durationSeconds)}
					</span>
				</span>
			</span>
			<span className="mt-0.5 block text-xs text-[var(--ink-soft)]">
				{description}
			</span>
		</button>
	);
}

function Fact({
	kind,
	children,
}: {
	kind: "public" | "private" | "attested";
	children: React.ReactNode;
}) {
	return (
		<li className="flex gap-3">
			<span className="mt-0.5 flex-shrink-0">
				<DisclosureTag kind={kind} withLabel={false} />
			</span>
			<span className="text-[var(--ink-soft)]">{children}</span>
		</li>
	);
}

function BuyModal({
	tier,
	strategyName,
	price,
	durationSeconds,
	onClose,
}: {
	tier: Tier | null;
	strategyName: string;
	price: string | null;
	durationSeconds: number;
	onClose: () => void;
}) {
	const session = useSession();

	return (
		<Modal
			open={tier !== null}
			title={`Buy ${tier ?? ""} access`}
			onClose={onClose}
			footer={
				<>
					<Button onClick={onClose}>Cancel</Button>
					<Button variant="primary" disabled>
						Pay on NEAR
					</Button>
				</>
			}
		>
			<dl className="m-0 mb-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
				<dt className="text-[var(--ink-faint)]">Strategy</dt>
				<dd className="m-0 font-semibold">{strategyName}</dd>
				<dt className="text-[var(--ink-faint)]">Tier</dt>
				<dd className="m-0 capitalize">{tier}</dd>
				<dt className="text-[var(--ink-faint)]">Price</dt>
				<dd className="num m-0">{price ? `$${units(price, 6, 2)}` : "—"}</dd>
				<dt className="text-[var(--ink-faint)]">Valid for</dt>
				<dd className="m-0">{duration(durationSeconds)}</dd>
				<dt className="text-[var(--ink-faint)]">Bound to</dt>
				<dd className="m-0">
					{session.accountId ?? "connect a NEAR account first"}
				</dd>
			</dl>
			<Alert tone="info" title="Not wired yet">
				Buying a key is a Key Registry contract call. The registry mints a
				time-limited key bound to your agent's X25519 public key; the backend
				mirrors the NEP-297 event and the relay starts streaming. The contract
				call needs the wallet selector, which is not connected in this build.
			</Alert>
		</Modal>
	);
}
