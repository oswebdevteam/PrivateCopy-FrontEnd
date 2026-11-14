import { Link } from "@tanstack/react-router";

import ThemeToggle from "./ThemeToggle";
import { WalletButton } from "./WalletButton";

const NAV = [
	{ to: "/", label: "Leaderboard" },
	{ to: "/vault", label: "Vault" },
	{ to: "/studio", label: "Studio" },
	{ to: "/copy", label: "Copying" },
] as const;

export function AppHeader() {
	return (
		<header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-xl">
			<nav className="page-wrap flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
				<Link
					to="/"
					className="flex flex-shrink-0 items-center gap-2 no-underline"
				>
					<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
						<path
							d="M15 4a5 5 0 1 0-4.6 7L8 13.4V16H5.6L3 18.6V21h3l9-9a5 5 0 0 0 0-8z"
							fill="none"
							stroke="var(--brand)"
							strokeWidth="1.8"
							strokeLinejoin="round"
						/>
						<circle cx="16.5" cy="7.5" r="1.4" fill="var(--brand)" />
					</svg>
					<span className="text-[0.9375rem] font-extrabold tracking-tight">
						Private<span style={{ color: "var(--brand-ink)" }}>Copy</span>
					</span>
				</Link>

				<div className="order-3 flex w-full items-center gap-5 text-sm font-semibold sm:order-none sm:w-auto">
					{NAV.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className="nav-link"
							activeOptions={{ exact: item.to === "/" }}
							activeProps={{ className: "nav-link is-active" }}
						>
							{item.label}
						</Link>
					))}
				</div>

				<div className="ml-auto flex items-center gap-2">
					<ThemeToggle />
					<WalletButton />
				</div>
			</nav>
		</header>
	);
}
