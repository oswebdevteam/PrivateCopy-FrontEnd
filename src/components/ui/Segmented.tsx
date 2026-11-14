export function Segmented<T extends string>({
	value,
	options,
	onChange,
	label,
}: {
	value: T;
	options: Array<{ value: T; label: string }>;
	onChange: (next: T) => void;
	label: string;
}) {
	return (
		<div
			role="tablist"
			aria-label={label}
			className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--panel-raised)] p-0.5"
		>
			{options.map((option) => {
				const selected = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						role="tab"
						aria-selected={selected}
						onClick={() => onChange(option.value)}
						className="rounded-[0.625rem] px-3 py-1.5 text-sm font-semibold transition"
						style={
							selected
								? { backgroundColor: "var(--brand)", color: "#fff" }
								: { color: "var(--ink-soft)" }
						}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
