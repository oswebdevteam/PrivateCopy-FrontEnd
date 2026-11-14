import type { ReactNode } from "react";
import { useEffect } from "react";

export function Modal({
	open,
	title,
	onClose,
	children,
	footer,
}: {
	open: boolean;
	title: string;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
}) {
	useEffect(() => {
		if (!open) {
			return;
		}
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
			<button
				type="button"
				aria-label="Close"
				onClick={onClose}
				className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-label={title}
				className="panel rise-in relative z-10 w-full max-w-lg overflow-hidden"
				style={{ background: "var(--panel-strong)" }}
			>
				<header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
					<h2 className="m-0 text-base font-bold">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-1 text-[var(--ink-faint)] transition hover:bg-[var(--panel-raised)] hover:text-[var(--ink)]"
					>
						<span className="sr-only">Close</span>
						<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
							<path
								d="M4 4l8 8M12 4l-8 8"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
							/>
						</svg>
					</button>
				</header>
				<div className="max-h-[70dvh] overflow-y-auto px-5 py-4">
					{children}
				</div>
				{footer ? (
					<footer className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-3">
						{footer}
					</footer>
				) : null}
			</div>
		</div>
	);
}
