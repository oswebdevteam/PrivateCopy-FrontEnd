import { assetSymbol } from "#/lib/format";

export function AssetChips({
	assets,
	max = 4,
}: {
	assets: Array<string>;
	max?: number;
}) {
	const shown = assets.slice(0, max);
	const rest = assets.length - shown.length;
	return (
		<span className="inline-flex flex-wrap items-center gap-1">
			{shown.map((asset) => (
				<span
					key={asset}
					title={asset}
					className="num rounded-md border border-[var(--line)] bg-[var(--panel-raised)] px-1.5 py-0.5 text-[0.6875rem] font-medium text-[var(--ink-soft)]"
				>
					{assetSymbol(asset)}
				</span>
			))}
			{rest > 0 ? (
				<span className="text-[0.6875rem] text-[var(--ink-faint)]">
					+{rest}
				</span>
			) : null}
		</span>
	);
}
