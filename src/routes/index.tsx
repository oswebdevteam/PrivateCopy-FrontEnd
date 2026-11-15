import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AssetChips } from "#/components/AssetChips";
import { Sparkline } from "#/components/charts/Sparkline";
import { RiskMeter } from "#/components/RiskMeter";
import { Badge, DisclosureTag } from "#/components/ui/Badge";
import { EmptyState, Rows } from "#/components/ui/Feedback";
import { Field, Select, TextInput } from "#/components/ui/Field";
import { Panel, PanelHeader } from "#/components/ui/Panel";
import { Segmented } from "#/components/ui/Segmented";
import { DEMO_MODE } from "#/lib/api/client";
import { DEMO_CURVES } from "#/lib/api/demo";
import { queries } from "#/lib/api/queries";
import type { LeaderboardEntry, Window } from "#/lib/api/types";
import { assetSymbol, bps, bpsPlain, relative, riskScore } from "#/lib/format";

const ASSETS = [
	{ value: "", label: "All assets" },
	{ value: "nep141:usdc.fakes.testnet", label: "USDC" },
	{ value: "nep141:wrap.testnet", label: "wNEAR" },
	{ value: "nep141:eth.fakes.testnet", label: "ETH" },
	{ value: "nep141:btc.fakes.testnet", label: "BTC" },
];

/**
 * Sortable columns. The server returns one ranking (return against drawdown);
 * re-sorting is client-side over the page it returned, and "rank" restores the
 * server's own order rather than pretending to re-rank globally.
 */
type SortKey = "rank" | "copiers" | "return" | "risk" | "drawdown";

const SORTS: Record<
	SortKey,
	(left: LeaderboardEntry, right: LeaderboardEntry) => number
> = {
	rank: () => 0,
	copiers: (left, right) => right.follower_count - left.follower_count,
	return: (left, right) => right.twr_bps - left.twr_bps,
	risk: (left, right) =>
		riskScore(left.drawdown_bps) - riskScore(right.drawdown_bps),
	drawdown: (left, right) => left.drawdown_bps - right.drawdown_bps,
};

/**
 * The leaderboard response carries no curve, only the latest point, so a trend
 * line exists in demo mode alone — drawing a fixture shape beside a live number
 * would be a lie about where the data came from. The curve lives on the
 * strategy page, where the API does return the history.
 */
function curve(strategyId: string): Array<number> | undefined {
	return DEMO_MODE ? DEMO_CURVES[strategyId] : undefined;
}

export const Route = createFileRoute("/")({ component: Leaderboard });

function Leaderboard() {
	const [window, setWindow] = useState<Window>("30d");
	const [asset, setAsset] = useState("");
	const [sort, setSort] = useState<SortKey>("rank");
	const [search, setSearch] = useState("");
	const board = useQuery(queries.leaderboard(window, asset || undefined));

	const entries = useMemo(() => {
		const rows = board.data ?? [];
		const needle = search.trim().toLowerCase();
		const filtered = needle
			? rows.filter(
					(entry) =>
						entry.name.toLowerCase().includes(needle) ||
						entry.strategy_id.toLowerCase().includes(needle),
				)
			: rows;
		return sort === "rank" ? filtered : [...filtered].sort(SORTS[sort]);
	}, [board.data, search, sort]);

	const copiers = (board.data ?? []).reduce(
		(total, entry) => total + entry.follower_count,
		0,
	);
	const lastAttestation = (board.data ?? [])
		.map((entry) => entry.period_end)
		.sort()
		.at(-1);

	return (
		<main className="page-wrap px-4 pt-10 pb-4">
			<section className="rise-in mb-8 max-w-3xl">
				<p className="kicker mb-3">Confidential copy-trading on NEAR</p>
				<h1 className="m-0 mb-4 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">
					Copy a trader without
					<br />
					exposing the trade.
				</h1>
				<p className="m-0 max-w-2xl text-base text-[var(--ink-soft)]">
					Strategies run on NEAR's confidential shard, so positions, sizes and
					timing never reach a public chain. Traders sell time-limited access
					keys; your agent copies the signal inside your own risk limits. The
					only public number is an attested return.
				</p>
			</section>

			<Panel className="rise-in overflow-hidden">
				<PanelHeader
					kicker="Public leaderboard"
					title="Attested performance"
					description={
						lastAttestation
							? `${board.data?.length ?? 0} strategies · ${copiers} copiers · last attestation ${relative(lastAttestation)}`
							: "Ranked by attested return against drawdown. Every figure is bucketed or signed."
					}
					actions={
						<Segmented
							label="Window"
							value={window}
							onChange={setWindow}
							options={[
								{ value: "7d", label: "7d" },
								{ value: "30d", label: "30d" },
								{ value: "all", label: "All" },
							]}
						/>
					}
				/>

				<div className="flex flex-wrap items-end gap-3 border-b border-[var(--line)] px-5 py-3">
					<div className="min-w-48 flex-1">
						<Field label="Search">
							<TextInput
								placeholder="Strategy name or id"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
							/>
						</Field>
					</div>
					<div className="w-36 flex-shrink-0">
						<Field label="Asset">
							<Select
								value={asset}
								onChange={(event) => setAsset(event.target.value)}
							>
								{ASSETS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>
					</div>
					<div className="w-56 flex-shrink-0">
						<Field label="Sort by">
							<Select
								value={sort}
								onChange={(event) => setSort(event.target.value as SortKey)}
							>
								<option value="rank">Return vs drawdown</option>
								<option value="return">Highest return</option>
								<option value="copiers">Most copiers</option>
								<option value="risk">Lowest risk</option>
								<option value="drawdown">Smallest drawdown</option>
							</Select>
						</Field>
					</div>
				</div>

				{board.isPending ? (
					<Rows rows={5} />
				) : board.isError ? (
					<EmptyState
						title="Leaderboard unavailable"
						body={(board.error as Error).message}
					/>
				) : entries.length === 0 ? (
					<EmptyState
						title="No strategies match"
						body={
							search
								? `Nothing named “${search}”.`
								: asset
									? `Nothing trading ${assetSymbol(asset)} in this window.`
									: undefined
						}
					/>
				) : (
					<ul className="m-0 list-none divide-y divide-[var(--line)] p-0">
						{entries.map((entry, index) => (
							<StrategyRow
								key={entry.strategy_id}
								entry={entry}
								rank={sort === "rank" ? index + 1 : undefined}
								window={window}
							/>
						))}
					</ul>
				)}

				<footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--ink-soft)]">
					<span className="flex items-center gap-1.5">
						<DisclosureTag kind="attested" /> returns, drawdown and risk
					</span>
					<span className="flex items-center gap-1.5">
						<DisclosureTag kind="public" /> copiers and assets
					</span>
					<span>Positions, sizes and timing are never on this page.</span>
				</footer>
			</Panel>
		</main>
	);
}

/**
 * One strategy, laid out the way copy-trading platforms lay out a trader:
 * identity first, social proof second, the headline return third, risk beside
 * it, and the action at the end of the row.
 */
function StrategyRow({
	entry,
	rank,
	window,
}: {
	entry: LeaderboardEntry;
	rank: number | undefined;
	window: Window;
}) {
	const shape = curve(entry.strategy_id);
	const positive = entry.twr_bps >= 0;

	return (
		<li className="grid grid-cols-1 items-center gap-4 px-5 py-4 transition hover:bg-[var(--panel-raised)] lg:grid-cols-[minmax(14rem,1.6fr)_7rem_minmax(8rem,1fr)_10rem_9rem_7rem] lg:gap-6">
			<div className="flex min-w-0 items-center gap-3">
				{rank ? (
					<span className="num w-5 flex-shrink-0 text-sm text-[var(--ink-faint)]">
						{rank}
					</span>
				) : null}
				<Avatar seed={entry.strategy_id} label={entry.name} />
				<div className="min-w-0">
					<Link
						to="/strategies/$strategyId"
						params={{ strategyId: entry.strategy_id }}
						className="block truncate font-semibold text-[var(--ink)] no-underline hover:text-[var(--brand-ink)]"
					>
						{entry.name}
					</Link>
					<span className="mt-1 flex items-center gap-2">
						<AssetChips assets={entry.assets} max={3} />
					</span>
				</div>
			</div>

			<div className="lg:text-center">
				<p className="num m-0 text-lg font-semibold">{entry.follower_count}</p>
				<p className="kicker m-0">copiers</p>
			</div>

			<div>
				<p
					className="num m-0 text-xl font-semibold"
					style={{ color: positive ? "var(--up)" : "var(--down)" }}
				>
					{bps(entry.twr_bps)}
				</p>
				<p className="kicker m-0">attested return · {window}</p>
			</div>

			<div className="flex flex-col gap-1">
				<RiskMeter drawdownBps={entry.drawdown_bps} />
				<span className="text-xs text-[var(--ink-faint)]">
					max drawdown -{bpsPlain(entry.drawdown_bps)}
				</span>
			</div>

			<div className="hidden flex-col gap-1 lg:flex">
				{shape ? <Sparkline points={shape} width={96} height={30} /> : null}
				<span className="num text-xs text-[var(--ink-faint)]">
					NAV {entry.nav_bucket} · {entry.trade_count_bucket} trades
				</span>
			</div>

			<div className="flex items-center justify-between gap-2 lg:flex-col lg:items-end">
				<Link
					to="/strategies/$strategyId"
					params={{ strategyId: entry.strategy_id }}
					className="btn btn-primary btn-sm no-underline"
				>
					Copy
				</Link>
				<Badge tone="up">{relative(entry.period_end)}</Badge>
			</div>
		</li>
	);
}

/** Strategies have no faces, so identity is a deterministic mark off the id. */
function Avatar({ seed, label }: { seed: string; label: string }) {
	let hash = 0;
	for (const character of seed) {
		hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 360;
	}
	return (
		<span
			aria-hidden="true"
			className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold"
			style={{
				background: `linear-gradient(140deg, hsl(${hash} 70% 24%), hsl(${(hash + 48) % 360} 60% 16%))`,
				color: `hsl(${hash} 80% 78%)`,
				border: "1px solid var(--line)",
			}}
		>
			{label
				.split(/\s+/)
				.slice(0, 2)
				.map((word) => word[0])
				.join("")
				.toUpperCase()}
		</span>
	);
}
