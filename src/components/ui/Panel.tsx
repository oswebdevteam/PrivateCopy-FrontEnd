import type { ReactNode } from "react";

export function Panel({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return <section className={`panel ${className}`}>{children}</section>;
}

export function PanelHeader({
	title,
	kicker,
	description,
	actions,
}: {
	title: ReactNode;
	kicker?: string;
	description?: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
			<div className="min-w-0">
				{kicker ? <p className="kicker mb-1.5">{kicker}</p> : null}
				<h2 className="m-0 text-base font-bold tracking-tight">{title}</h2>
				{description ? (
					<p className="mt-1 max-w-prose text-sm text-[var(--ink-soft)]">
						{description}
					</p>
				) : null}
			</div>
			{actions ? (
				<div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
			) : null}
		</header>
	);
}
