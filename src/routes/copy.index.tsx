import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { StateBadge } from "#/components/ui/Badge";
import { Copyable } from "#/components/ui/Copyable";
import { EmptyState, Rows } from "#/components/ui/Feedback";
import { Panel, PanelHeader } from "#/components/ui/Panel";
import { queries } from "#/lib/api/queries";
import { relative } from "#/lib/format";
import { useSession } from "#/lib/useSession";

export const Route = createFileRoute("/copy/")({ component: CopyIndex });

function CopyIndex() {
	const session = useSession();
	const keys = useQuery(queries.keys(session.accountId));
	const board = useQuery(queries.leaderboard("all"));

	const names = new Map(
		(board.data ?? []).map((entry) => [entry.strategy_id, entry.name]),
	);
	const held = (keys.data ?? []).filter(
		(key) => key.holder === session.accountId,
	);

	return (
		<main className="page-wrap px-4 pt-8 pb-4">
			<header className="rise-in mb-6">
				<p className="kicker mb-2">Copying</p>
				<h1 className="m-0 text-3xl font-extrabold tracking-tight">
					Your access keys
				</h1>
				<p className="m-0 mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">
					Each key streams one strategy's signals to your agent. The agent sizes
					every signal to your budget and limits, then signs a confidential
					intent — you never see the trader's absolute position, and the trader
					never sees yours.
				</p>
			</header>

			{!session.accountId ? (
				<Panel>
					<EmptyState
						title="Connect a NEAR account"
						body="Keys are bound to your account and your agent's public key."
					/>
				</Panel>
			) : keys.isPending ? (
				<Panel>
					<Rows rows={3} />
				</Panel>
			) : held.length === 0 ? (
				<Panel>
					<EmptyState
						title="No keys yet"
						body={
							<Link to="/" className="text-[var(--brand-ink)]">
								Find a strategy on the leaderboard
							</Link>
						}
					/>
				</Panel>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{held.map((key) => {
						const expired = key.status !== "active";
						return (
							<Panel key={key.key_id} className="rise-in overflow-hidden">
								<PanelHeader
									kicker={`${key.tier} tier`}
									title={names.get(key.strategy_id) ?? key.strategy_id}
									actions={<StateBadge state={key.status} />}
								/>
								<dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-5 py-4 text-sm">
									<dt className="text-[var(--ink-faint)]">Expires</dt>
									<dd className="m-0">{relative(key.expires_at)}</dd>
									<dt className="text-[var(--ink-faint)]">Agent key</dt>
									<dd className="m-0">
										<Copyable value={key.agent_pubkey} head={12} tail={4} />
									</dd>
									<dt className="text-[var(--ink-faint)]">Key id</dt>
									<dd className="m-0">
										<Copyable value={key.key_id} head={10} tail={6} />
									</dd>
								</dl>
								<footer className="flex gap-2 border-t border-[var(--line)] px-5 py-3">
									<Link
										to="/copy/$keyId"
										params={{ keyId: key.key_id }}
										className="btn btn-primary btn-sm no-underline"
									>
										{expired ? "View activity" : "Manage copying"}
									</Link>
									<Link
										to="/strategies/$strategyId"
										params={{ strategyId: key.strategy_id }}
										className="btn btn-ghost btn-sm no-underline"
									>
										Strategy
									</Link>
								</footer>
							</Panel>
						);
					})}
				</div>
			)}
		</main>
	);
}
