import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

export function Button({
	children,
	variant = "ghost",
	size = "md",
	className = "",
	...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
	children: ReactNode;
	variant?: Variant;
	size?: "md" | "sm";
}) {
	return (
		<button
			type="button"
			className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${className}`}
			{...rest}
		>
			{children}
		</button>
	);
}
