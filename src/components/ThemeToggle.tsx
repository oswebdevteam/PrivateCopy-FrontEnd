import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "auto";

const KEY = "theme";

function stored(): Mode {
	if (typeof window === "undefined") {
		return "dark";
	}
	const value = window.localStorage.getItem(KEY);
	return value === "light" || value === "dark" || value === "auto"
		? value
		: "dark";
}

function apply(mode: Mode) {
	const prefersLight = window.matchMedia(
		"(prefers-color-scheme: light)",
	).matches;
	const resolved = mode === "auto" ? (prefersLight ? "light" : "dark") : mode;
	document.documentElement.setAttribute("data-theme", resolved);
	document.documentElement.style.colorScheme = resolved;
}

const NEXT: Record<Mode, Mode> = { dark: "light", light: "auto", auto: "dark" };
const LABEL: Record<Mode, string> = {
	dark: "Dark",
	light: "Light",
	auto: "Auto",
};

export default function ThemeToggle() {
	const [mode, setMode] = useState<Mode>("dark");

	useEffect(() => {
		const initial = stored();
		setMode(initial);
		apply(initial);
	}, []);

	useEffect(() => {
		if (mode !== "auto") {
			return;
		}
		const media = window.matchMedia("(prefers-color-scheme: light)");
		const onChange = () => apply("auto");
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [mode]);

	return (
		<button
			type="button"
			title={`Theme: ${LABEL[mode].toLowerCase()}. Click for ${LABEL[NEXT[mode]].toLowerCase()}.`}
			onClick={() => {
				const next = NEXT[mode];
				setMode(next);
				apply(next);
				window.localStorage.setItem(KEY, next);
			}}
			className="btn btn-ghost btn-sm"
		>
			<span className="sr-only">Change theme. Current: </span>
			{LABEL[mode]}
		</button>
	);
}
