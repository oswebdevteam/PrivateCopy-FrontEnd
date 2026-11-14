import { riskLabel, riskScore } from "#/lib/format";

const TONE = ["var(--up)", "var(--warn)", "var(--down)"];

function tone(score: number): string {
	if (score <= 3) {
		return TONE[0];
	}
	return score <= 6 ? TONE[1] : TONE[2];
}

/**
 * Risk is always shown as score + word, never colour alone, and the tooltip
 * names what it was derived from so it can't read as a proprietary rating.
 */
export function RiskMeter({
	drawdownBps,
	compact = false,
}: {
	drawdownBps: number;
	compact?: boolean;
}) {
	const score = riskScore(drawdownBps);
	const color = tone(score);
	const label = riskLabel(score);

	return (
		<span
			className="inline-flex items-center gap-2"
			title={`Risk ${score} of 10 (${label}), derived from the attested max drawdown of ${(
				drawdownBps / 100
			).toFixed(2)}%.`}
		>
			<span className="flex gap-[2px]" aria-hidden="true">
				{Array.from({ length: 10 }, (_, index) => `segment-${index}`).map(
					(key, index) => (
						<span
							key={key}
							className="h-3 w-[3px] rounded-full"
							style={{
								backgroundColor: index < score ? color : "var(--line-strong)",
							}}
						/>
					),
				)}
			</span>
			<span className="num text-xs font-semibold" style={{ color }}>
				{score}
			</span>
			{compact ? null : (
				<span className="text-xs text-[var(--ink-soft)]">{label}</span>
			)}
		</span>
	);
}
