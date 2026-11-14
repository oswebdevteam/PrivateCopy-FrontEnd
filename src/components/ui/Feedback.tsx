import type { ReactNode } from "react";

export function Spinner({ label = "Loading" }: { label?: string }) {
	return (
		<span className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)]">
			<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
				<circle
					cx="12"
					cy="12"
					r="9"
					fill="none"
					stroke="currentColor"
					strokeOpacity="0.25"
					strokeWidth="3"
				/>
				<path
					d="M21 12a9 9 0 0 0-9-9"
					fill="none"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinecap="round"
				>
					<animateTransform
						attributeName="transform"
						type="rotate"
						from="0 12 12"
						to="360 12 12"
						dur="800ms"
						repeatCount="indefinite"
					/>
				</path>
			</svg>
			{label}
		</span>
	);
}

export function Rows({ rows = 4 }: { rows?: number }) {
	const keys = Array.from({ length: rows }, (_, index) => `skeleton-${index}`);
	return (
		<div className="space-y-2 p-5">
			{keys.map((key, index) => (
				<div
					key={key}
					className="h-9 animate-pulse rounded-lg bg-[var(--panel-raised)]"
					style={{ animationDelay: `${index * 80}ms` }}
				/>
			))}
		</div>
	);
}

export function EmptyState({
	title,
	body,
}: {
	title: string;
	body?: ReactNode;
}) {
	return (
		<div className="px-5 py-10 text-center">
			<p className="m-0 text-sm font-semibold">{title}</p>
			{body ? (
				<p className="m-0 mt-1 text-sm text-[var(--ink-soft)]">{body}</p>
			) : null}
		</div>
	);
}

export function Alert({
	tone = "warn",
	title,
	children,
}: {
	tone?: "warn" | "error" | "info";
	title?: string;
	children: ReactNode;
}) {
	const color =
		tone === "error"
			? "var(--down)"
			: tone === "info"
				? "var(--brand-ink)"
				: "var(--warn)";
	return (
		<div
			className="rounded-xl border px-4 py-3 text-sm"
			style={{
				borderColor: `color-mix(in oklab, ${color} 36%, transparent)`,
				backgroundColor: `color-mix(in oklab, ${color} 10%, transparent)`,
			}}
		>
			{title ? (
				<p className="m-0 mb-0.5 font-semibold" style={{ color }}>
					{title}
				</p>
			) : null}
			<div className="text-[var(--ink-soft)]">{children}</div>
		</div>
	);
}
