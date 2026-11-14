import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({
	label,
	hint,
	suffix,
	children,
}: {
	label: string;
	hint?: ReactNode;
	suffix?: ReactNode;
	children: ReactNode;
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: the control is passed in as children
		<label className="block">
			<span className="mb-1.5 flex items-center justify-between gap-2">
				<span className="text-sm font-semibold">{label}</span>
				{suffix ? (
					<span className="num text-xs text-[var(--ink-soft)]">{suffix}</span>
				) : null}
			</span>
			{children}
			{hint ? (
				<span className="mt-1 block text-xs text-[var(--ink-faint)]">
					{hint}
				</span>
			) : null}
		</label>
	);
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
	return <input className="field" {...props} />;
}

/** Risk limits are basis points; the slider speaks percent. */
export function BpsSlider({
	value,
	onChange,
	min,
	max,
	step = 25,
}: {
	value: number;
	onChange: (next: number) => void;
	min: number;
	max: number;
	step?: number;
}) {
	return (
		<input
			type="range"
			min={min}
			max={max}
			step={step}
			value={value}
			onChange={(event) => onChange(Number(event.target.value))}
			className="w-full accent-[var(--brand)]"
		/>
	);
}
