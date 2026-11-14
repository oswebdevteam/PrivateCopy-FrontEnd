import { useId, useState } from "react";
import type { AttestationView } from "#/lib/api/types";
import { bps, dateTime } from "#/lib/format";

interface Point {
	x: number;
	y: number;
	attestation: AttestationView;
}

/**
 * Attested time-weighted return over the attestation history. One series, so
 * no legend: the panel title names it. The zero line is the reference, and the
 * latest point is direct-labeled; every other value is read from the hover
 * crosshair or the attestation table under the chart.
 */
export function AttestationChart({
	attestations,
	height = 220,
}: {
	attestations: Array<AttestationView>;
	height?: number;
}) {
	const gradientId = useId();
	const [hover, setHover] = useState<number | null>(null);

	const ordered = [...attestations].sort(
		(left, right) => +new Date(left.period_end) - +new Date(right.period_end),
	);

	if (ordered.length < 2) {
		return (
			<p className="px-5 py-10 text-center text-sm text-[var(--ink-soft)]">
				Two attestations are needed before a curve can be drawn.
			</p>
		);
	}

	const width = 720;
	const padding = { top: 16, right: 56, bottom: 26, left: 44 };
	const plotWidth = width - padding.left - padding.right;
	const plotHeight = height - padding.top - padding.bottom;

	const values = ordered.map((item) => item.twr_bps);
	const rawMin = Math.min(0, ...values);
	const rawMax = Math.max(0, ...values);
	const headroom = (rawMax - rawMin) * 0.12 || 100;
	const min = rawMin - headroom;
	const max = rawMax + headroom;

	const x = (index: number) =>
		padding.left + (index / (ordered.length - 1)) * plotWidth;
	const y = (value: number) =>
		padding.top + (1 - (value - min) / (max - min)) * plotHeight;

	const points: Array<Point> = ordered.map((attestation, index) => ({
		x: x(index),
		y: y(attestation.twr_bps),
		attestation,
	}));

	const line = points.map((point) => `${point.x},${point.y}`).join(" ");
	const area = `${padding.left},${y(0)} ${line} ${padding.left + plotWidth},${y(0)}`;
	const latest = points[points.length - 1];
	const positive = latest.attestation.twr_bps >= 0;
	const stroke = positive ? "var(--up)" : "var(--down)";

	const ticks = [max, (max + min) / 2, min].map((value) => ({
		value,
		y: y(value),
	}));
	const active = hover === null ? null : points[hover];

	return (
		<figure className="m-0">
			<svg
				viewBox={`0 0 ${width} ${height}`}
				className="w-full"
				role="img"
				aria-label={`Attested time-weighted return, ${ordered.length} attestations, latest ${bps(
					latest.attestation.twr_bps,
				)}`}
				onPointerLeave={() => setHover(null)}
				onPointerMove={(event) => {
					const box = event.currentTarget.getBoundingClientRect();
					const localX = ((event.clientX - box.left) / box.width) * width;
					const ratio = (localX - padding.left) / plotWidth;
					const index = Math.round(ratio * (ordered.length - 1));
					setHover(Math.min(ordered.length - 1, Math.max(0, index)));
				}}
			>
				<defs>
					<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
						<stop offset="100%" stopColor={stroke} stopOpacity="0" />
					</linearGradient>
				</defs>

				{ticks.map((tick) => (
					<g key={tick.value}>
						<line
							x1={padding.left}
							x2={padding.left + plotWidth}
							y1={tick.y}
							y2={tick.y}
							stroke="var(--line)"
							strokeWidth="1"
						/>
						<text
							x={padding.left - 8}
							y={tick.y + 3.5}
							textAnchor="end"
							fontSize="10"
							fill="var(--ink-faint)"
							fontFamily="var(--font-mono)"
						>
							{bps(tick.value, 0)}
						</text>
					</g>
				))}

				<line
					x1={padding.left}
					x2={padding.left + plotWidth}
					y1={y(0)}
					y2={y(0)}
					stroke="var(--line-strong)"
					strokeWidth="1"
					strokeDasharray="3 3"
				/>

				<polygon points={area} fill={`url(#${gradientId})`} />
				<polyline
					points={line}
					fill="none"
					stroke={stroke}
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>

				<circle
					cx={latest.x}
					cy={latest.y}
					r="4"
					fill={stroke}
					stroke="var(--bg-base)"
					strokeWidth="2"
				/>
				<text
					x={latest.x + 9}
					y={latest.y + 4}
					fontSize="11"
					fontWeight="600"
					fill="var(--ink)"
					fontFamily="var(--font-mono)"
				>
					{bps(latest.attestation.twr_bps)}
				</text>

				<text
					x={padding.left}
					y={height - 8}
					fontSize="10"
					fill="var(--ink-faint)"
					fontFamily="var(--font-mono)"
				>
					{dateTime(ordered[0].period_end)}
				</text>
				<text
					x={padding.left + plotWidth}
					y={height - 8}
					textAnchor="end"
					fontSize="10"
					fill="var(--ink-faint)"
					fontFamily="var(--font-mono)"
				>
					{dateTime(ordered[ordered.length - 1].period_end)}
				</text>

				{active ? (
					<g>
						<line
							x1={active.x}
							x2={active.x}
							y1={padding.top}
							y2={padding.top + plotHeight}
							stroke="var(--line-strong)"
							strokeWidth="1"
						/>
						<circle
							cx={active.x}
							cy={active.y}
							r="4.5"
							fill={stroke}
							stroke="var(--bg-base)"
							strokeWidth="2"
						/>
					</g>
				) : null}
			</svg>

			<figcaption className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1 px-5 pb-1 text-xs text-[var(--ink-soft)]">
				{active ? (
					<>
						<span className="num font-semibold text-[var(--ink)]">
							{bps(active.attestation.twr_bps)} TWR
						</span>
						<span className="num">
							drawdown {bps(-active.attestation.drawdown_bps)}
						</span>
						<span className="num">NAV {active.attestation.nav_bucket}</span>
						<span className="num">
							{dateTime(active.attestation.period_end)}
						</span>
					</>
				) : (
					<span>
						Hover the curve for a point. Each point is one signed attestation,
						listed in full below.
					</span>
				)}
			</figcaption>
		</figure>
	);
}
