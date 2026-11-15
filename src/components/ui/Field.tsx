import type {
	InputHTMLAttributes,
	ReactNode,
	SelectHTMLAttributes,
} from "react";

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

/**
 * Native select, restyled. The browser arrow is replaced so the control
 * matches the inputs beside it, and the option list inherits the page's
 * colour-scheme so it is not a white popup on a dark page.
 */
export function Select({
	className = "",
	children,
	...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<span className="relative block">
			<select className={`field field-select ${className}`} {...rest}>
				{children}
			</select>
			<svg
				viewBox="0 0 16 16"
				width="14"
				height="14"
				aria-hidden="true"
				className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[var(--ink-faint)]"
			>
				<path
					d="M4 6.5l4 4 4-4"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.6"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</span>
	);
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
