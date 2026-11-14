import type { ReactNode } from "react";

import { type Disclosure, DisclosureTag } from "./Badge";

export function Stat({
	label,
	value,
	disclosure,
	hint,
	tone,
}: {
	label: string;
	value: ReactNode;
	disclosure: Disclosure;
	hint?: ReactNode;
	tone?: "up" | "down";
}) {
	return (
		<div className="panel-flat p-4">
			<div className="mb-2 flex items-center justify-between gap-2">
				<p className="kicker m-0">{label}</p>
				<DisclosureTag kind={disclosure} withLabel={false} />
			</div>
			<p
				className="num m-0 text-xl font-semibold"
				style={tone ? { color: `var(--${tone})` } : undefined}
			>
				{value}
			</p>
			{hint ? (
				<p className="m-0 mt-1 text-xs text-[var(--ink-faint)]">{hint}</p>
			) : null}
		</div>
	);
}
