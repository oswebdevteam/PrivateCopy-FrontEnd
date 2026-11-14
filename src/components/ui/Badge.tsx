import type { ReactNode } from "react";

/**
 * The three disclosure states from the design doc. Every number on screen
 * carries one, so a reader always knows who else can see it.
 */
export type Disclosure = "public" | "private" | "attested";

const DISCLOSURE: Record<
	Disclosure,
	{ label: string; title: string; icon: string }
> = {
	public: {
		label: "Public",
		title: "Anyone can see this value.",
		icon: "M3 7.5A4.5 4.5 0 0 1 12 7.5M1.5 7.5h13",
	},
	private: {
		label: "Private to you",
		title: "Held on the confidential shard. Only you and the TEE can read it.",
		icon: "M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3.5 7h9v6h-9z",
	},
	attested: {
		label: "Attested",
		title: "Computed inside the TEE from private activity, then signed.",
		icon: "M8 1.5l5 2.5v4c0 3-2.2 5.2-5 6.5-2.8-1.3-5-3.5-5-6.5V4z",
	},
};

export function DisclosureTag({
	kind,
	withLabel = true,
}: {
	kind: Disclosure;
	withLabel?: boolean;
}) {
	const meta = DISCLOSURE[kind];
	return (
		<span
			title={meta.title}
			className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.08em]"
			style={{
				borderColor: `var(--${kind}-line)`,
				backgroundColor: `var(--${kind}-soft)`,
				color: `var(--${kind})`,
			}}
		>
			<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
				<path
					d={meta.icon}
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
			</svg>
			{withLabel ? meta.label : <span className="sr-only">{meta.label}</span>}
		</span>
	);
}

type Tone = "neutral" | "brand" | "up" | "down" | "warn";

const TONE: Record<Tone, { bg: string; border: string; color: string }> = {
	neutral: {
		bg: "var(--public-soft)",
		border: "var(--public-line)",
		color: "var(--ink-soft)",
	},
	brand: {
		bg: "var(--brand-soft)",
		border: "var(--brand-line)",
		color: "var(--brand-ink)",
	},
	up: {
		bg: "var(--attested-soft)",
		border: "var(--attested-line)",
		color: "var(--up)",
	},
	down: {
		bg: "color-mix(in oklab, var(--down) 12%, transparent)",
		border: "color-mix(in oklab, var(--down) 38%, transparent)",
		color: "var(--down)",
	},
	warn: {
		bg: "var(--private-soft)",
		border: "var(--private-line)",
		color: "var(--warn)",
	},
};

export function Badge({
	children,
	tone = "neutral",
	dot = false,
}: {
	children: ReactNode;
	tone?: Tone;
	dot?: boolean;
}) {
	const style = TONE[tone];
	return (
		<span
			className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold"
			style={{
				backgroundColor: style.bg,
				borderColor: style.border,
				color: style.color,
			}}
		>
			{dot ? (
				<span
					className="pulse-dot h-1.5 w-1.5 rounded-full"
					style={{ backgroundColor: style.color }}
				/>
			) : null}
			{children}
		</span>
	);
}

const STATE_TONE: Record<string, Tone> = {
	active: "up",
	settled: "up",
	success: "up",
	paused: "warn",
	skipped: "warn",
	received: "brand",
	sized: "brand",
	quoted: "brand",
	funded: "brand",
	expired: "neutral",
	revoked: "down",
	refunded: "warn",
	failed: "down",
};

export function StateBadge({ state }: { state: string }) {
	return <Badge tone={STATE_TONE[state] ?? "neutral"}>{state}</Badge>;
}
