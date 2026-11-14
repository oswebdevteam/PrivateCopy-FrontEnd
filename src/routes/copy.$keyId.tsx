import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Badge, DisclosureTag, StateBadge } from "#/components/ui/Badge";
import { Button } from "#/components/ui/Button";
import { Copyable } from "#/components/ui/Copyable";
import { Alert, EmptyState, Rows, Spinner } from "#/components/ui/Feedback";
import { Field, TextInput } from "#/components/ui/Field";
import { Panel, PanelHeader } from "#/components/ui/Panel";
import { Stat } from "#/components/ui/Stat";
import { api } from "#/lib/api";
import { queries } from "#/lib/api/queries";
import type { FollowerSettings } from "#/lib/api/types";
import { bpsPlain, dateTime, multiplier, relative, units } from "#/lib/format";
import { useSession } from "#/lib/useSession";

export const Route = createFileRoute("/copy/$keyId")({ component: CopyDetail });

function CopyDetail() {
	const { keyId } = Route.useParams();
	const session = useSession();
	const keys = useQuery(queries.keys(session.accountId));
	const orders = useQuery(queries.copyOrders(keyId));
	const settings = useQuery(queries.copySettings(keyId));
	const board = useQuery(queries.leaderboard("all"));

	const accessKey = (keys.data ?? []).find((key) => key.key_id === keyId);
	const strategyName = (board.data ?? []).find(
		(entry) => entry.strategy_id === accessKey?.strategy_id,
	)?.name;

	const rows = orders.data ?? [];
	const settled = rows.filter((order) => order.state === "settled");
	const skipped = rows.filter((order) => order.state === "skipped");
	const slippages = settled
		.map((order) => order.copy_slippage_bps)
		.filter((value): value is number => value !== null);
	const meanSlippage =
		slippages.length === 0
			? null
			: Math.round(
					slippages.reduce((total, value) => total + value, 0) /
						slippages.length,
				);

	return (
		<main className="page-wrap px-4 pt-8 pb-4">
			<Link
				to="/copy"
				className="mb-5 inline-block text-sm text-[var(--ink-soft)] no-underline hover:text-[var(--ink)]"
			>
				← Your keys
			</Link>

			<header className="rise-in mb-6 flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="kicker mb-2">Copy setup</p>
					<h1 className="m-0 text-3xl font-extrabold tracking-tight">
						{strategyName ?? accessKey?.strategy_id ?? "Strategy"}
					</h1>
					<p className="m-0 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--ink-soft)]">
						{accessKey ? <StateBadge state={accessKey.status} /> : null}
						{accessKey ? (
							<span className="capitalize">{accessKey.tier} signals</span>
						) : null}
						{accessKey ? (
							<span>key expires {relative(accessKey.expires_at)}</span>
						) : null}
						<Copyable value={keyId} head={10} tail={6} />
					</p>
				</div>
				<AgentStatus
					keyId={keyId}
					paused={settings.data?.paused ?? false}
					active={accessKey?.status === "active"}
				/>
			</header>

			<section className="rise-in mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<Stat
					label="Copies settled"
					disclosure="private"
					value={settled.length}
					hint="last 48 hours"
				/>
				<Stat
					label="Signals skipped"
					disclosure="private"
					value={skipped.length}
					hint="a limit stopped the copy"
				/>
				<Stat
					label="Mean copy slippage"
					disclosure="private"
					value={meanSlippage === null ? "—" : bpsPlain(meanSlippage)}
					hint="versus the trader's fill"
				/>
				<Stat
					label="Worst case loss"
					disclosure="private"
					value={
						settings.data
							? `${bpsPlain(settings.data.daily_loss_bps)} / day`
							: "—"
					}
					hint="the daily loss stop, as a share of the copy vault"
				/>
			</section>

			<div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
				<SettingsPanel
					keyId={keyId}
					current={settings.data}
					pending={settings.isPending}
				/>

				<Panel className="rise-in overflow-hidden">
					<PanelHeader
						kicker="Private to you"
						title="Copy activity"
						description="Every signal the agent received, and what it did with it. A skip always names the rule."
						actions={<DisclosureTag kind="private" />}
					/>
					{orders.isPending ? (
						<Rows rows={5} />
					) : orders.isError ? (
						<div className="p-5">
							<Alert tone="error" title="Could not load orders">
								{(orders.error as Error).message}
							</Alert>
						</div>
					) : rows.length === 0 ? (
						<EmptyState
							title="No signals yet"
							body="The agent is connected and waiting for the trader's next fill."
						/>
					) : (
						<div className="overflow-x-auto">
							<table className="grid-table min-w-[38rem]">
								<thead>
									<tr>
										<th>Signal</th>
										<th>State</th>
										<th className="text-right">Amount in</th>
										<th className="text-right">Slippage</th>
										<th>When</th>
										<th>Reference</th>
									</tr>
								</thead>
								<tbody>
									{rows.map((order) => (
										<tr key={`${order.seq}-${order.created_at}`}>
											<td className="num text-[var(--ink-faint)]">
												#{order.seq}
											</td>
											<td>
												<div className="flex flex-col gap-1">
													<StateBadge state={order.state} />
													{order.skip_reason ? (
														<span className="text-xs text-[var(--warn)]">
															{order.skip_reason}
														</span>
													) : null}
												</div>
											</td>
											<td className="num text-right">
												{order.amount_in ? units(order.amount_in, 6, 2) : "—"}
											</td>
											<td className="num text-right text-[var(--ink-soft)]">
												{order.copy_slippage_bps === null
													? "—"
													: bpsPlain(order.copy_slippage_bps)}
											</td>
											<td
												className="num whitespace-nowrap"
												title={dateTime(order.created_at)}
											>
												{relative(order.created_at)}
											</td>
											<td>
												{order.status_ref ? (
													<Copyable
														value={order.status_ref}
														head={8}
														tail={4}
													/>
												) : (
													<span className="text-xs text-[var(--ink-faint)]">
														no quote
													</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</Panel>
			</div>
		</main>
	);
}

function AgentStatus({
	keyId,
	paused,
	active,
}: {
	keyId: string;
	paused: boolean;
	active: boolean;
}) {
	const client = useQueryClient();
	const pause = useMutation({
		mutationFn: () => api.pauseCopy(keyId),
		onSuccess: () =>
			client.invalidateQueries({ queryKey: ["copy-settings", keyId] }),
	});

	return (
		<div className="flex items-center gap-3">
			<Badge
				tone={!active ? "neutral" : paused ? "warn" : "up"}
				dot={active && !paused}
			>
				{!active ? "key inactive" : paused ? "agent paused" : "agent live"}
			</Badge>
			<Button
				variant="danger"
				disabled={!active || paused || pause.isPending}
				onClick={() => pause.mutate()}
			>
				{pause.isPending ? <Spinner label="Pausing" /> : "Kill switch"}
			</Button>
		</div>
	);
}

const LIMITS: Array<{
	field: keyof FollowerSettings;
	label: string;
	hint: string;
	min: number;
	max: number;
	step: number;
}> = [
	{
		field: "multiplier_bps",
		label: "Copy multiplier",
		hint: "Scales the trader's size-in-NAV to yours. 1.00x copies the same share of your vault.",
		min: 100,
		max: 30_000,
		step: 100,
	},
	{
		field: "trade_cap_bps",
		label: "Per-trade cap",
		hint: "Largest share of your copy vault a single copy may spend.",
		min: 25,
		max: 10_000,
		step: 25,
	},
	{
		field: "daily_loss_bps",
		label: "Daily loss stop",
		hint: "The agent stops copying for the day once losses reach this share.",
		min: 25,
		max: 10_000,
		step: 25,
	},
	{
		field: "drawdown_stop_bps",
		label: "Drawdown stop",
		hint: "A hard stop on peak-to-trough loss in the copy vault.",
		min: 25,
		max: 10_000,
		step: 25,
	},
	{
		field: "max_slippage_bps",
		label: "Max slippage",
		hint: "Quotes worse than this are skipped rather than filled.",
		min: 0,
		max: 1_000,
		step: 5,
	},
];

function SettingsPanel({
	keyId,
	current,
	pending,
}: {
	keyId: string;
	current: FollowerSettings | undefined;
	pending: boolean;
}) {
	const client = useQueryClient();
	const [draft, setDraft] = useState<FollowerSettings | null>(null);

	useEffect(() => {
		if (current) {
			setDraft(current);
		}
	}, [current]);

	const save = useMutation({
		mutationFn: (settings: FollowerSettings) =>
			api.saveCopySettings(keyId, settings),
		onSuccess: () =>
			client.invalidateQueries({ queryKey: ["copy-settings", keyId] }),
	});

	if (pending || !draft) {
		return (
			<Panel>
				<Rows rows={6} />
			</Panel>
		);
	}

	const dirty = JSON.stringify(draft) !== JSON.stringify(current);

	return (
		<Panel className="rise-in">
			<PanelHeader
				kicker="Risk limits"
				title="How your agent copies"
				description="Limits are enforced by the agent before it signs anything, so a signal can never spend more than you allowed."
			/>
			<div className="space-y-5 p-5">
				<Field
					label="Copy vault account"
					hint="A dedicated NEAR account. Its whole balance is the worst case loss."
				>
					<TextInput
						className="field num"
						value={draft.copy_vault_account}
						onChange={(event) =>
							setDraft({ ...draft, copy_vault_account: event.target.value })
						}
					/>
				</Field>

				{LIMITS.map((limit) => {
					const value = draft[limit.field] as number;
					return (
						<Field
							key={limit.field}
							label={limit.label}
							hint={limit.hint}
							suffix={
								limit.field === "multiplier_bps"
									? multiplier(value)
									: bpsPlain(value)
							}
						>
							<input
								type="range"
								min={limit.min}
								max={limit.max}
								step={limit.step}
								value={value}
								onChange={(event) =>
									setDraft({
										...draft,
										[limit.field]: Number(event.target.value),
									})
								}
								className="w-full accent-[var(--brand)]"
							/>
						</Field>
					);
				})}

				<Alert tone="warn" title="Worst case, in plain terms">
					If every limit fires against you, you lose the balance of{" "}
					<span className="num">{draft.copy_vault_account}</span>. No other
					account of yours is reachable by the agent.
				</Alert>

				{save.isError ? (
					<Alert tone="error" title="Could not save">
						{(save.error as Error).message}
					</Alert>
				) : null}

				<div className="flex items-center gap-3">
					<Button
						variant="primary"
						disabled={!dirty || save.isPending}
						onClick={() => save.mutate(draft)}
					>
						{save.isPending ? <Spinner label="Saving" /> : "Save limits"}
					</Button>
					{dirty ? (
						<Button onClick={() => current && setDraft(current)}>Reset</Button>
					) : (
						<span className="text-xs text-[var(--ink-faint)]">Saved</span>
					)}
				</div>
			</div>
		</Panel>
	);
}
