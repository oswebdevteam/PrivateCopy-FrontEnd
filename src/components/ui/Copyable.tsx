import { useState } from "react";

import { shorten } from "#/lib/format";

export function Copyable({
	value,
	display,
	head = 10,
	tail = 6,
}: {
	value: string;
	display?: string;
	head?: number;
	tail?: number;
}) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			title={value}
			onClick={() => {
				void navigator.clipboard.writeText(value).then(() => {
					setCopied(true);
					setTimeout(() => setCopied(false), 1400);
				});
			}}
			className="group num inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-[var(--ink-soft)] transition hover:bg-[var(--panel-raised)] hover:text-[var(--ink)]"
		>
			{display ?? shorten(value, head, tail)}
			<span className="font-sans text-[0.625rem] font-bold tracking-wider uppercase opacity-0 transition group-hover:opacity-70 group-focus-visible:opacity-70">
				{copied ? "copied" : "copy"}
			</span>
		</button>
	);
}
