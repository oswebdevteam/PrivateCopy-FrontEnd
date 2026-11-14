import { DisclosureTag } from "#/components/ui/Badge";
import { DEMO_MODE } from "#/lib/api/client";

/**
 * The footer doubles as the legend for the disclosure tags, so the meaning of
 * every badge on screen is always one glance away.
 */
export function AppFooter() {
	return (
		<footer className="mt-14 border-t border-[var(--line)] px-4 py-8 text-sm text-[var(--ink-soft)]">
			<div className="page-wrap flex flex-col gap-5">
				<div className="flex flex-wrap items-center gap-x-6 gap-y-3">
					<p className="kicker m-0">What the badges mean</p>
					<span className="flex items-center gap-2">
						<DisclosureTag kind="public" /> on-chain or on the leaderboard
					</span>
					<span className="flex items-center gap-2">
						<DisclosureTag kind="private" /> confidential shard, yours alone
					</span>
					<span className="flex items-center gap-2">
						<DisclosureTag kind="attested" /> TEE-computed and signed
					</span>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ink-faint)]">
					<p className="m-0">
						PrivateCopy — confidential copy-trading on NEAR Intents. Positions
						never leave the private shard.
					</p>
					<p className="num m-0">
						{DEMO_MODE ? "demo data · no backend connected" : "live backend"}
					</p>
				</div>
			</div>
		</footer>
	);
}
