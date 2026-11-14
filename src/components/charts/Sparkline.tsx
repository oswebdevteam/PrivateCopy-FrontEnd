/**
 * Single-series trend, no axes: the row's signed number carries the value, so
 * the line only has to show shape. Polarity is colored *and* stated in that
 * number, never color alone.
 */
export function Sparkline({
	points,
	width = 112,
	height = 34,
}: {
	points: Array<number>;
	width?: number;
	height?: number;
}) {
	if (points.length < 2) {
		return <div style={{ width, height }} />;
	}

	const pad = 3;
	const min = Math.min(0, ...points);
	const max = Math.max(0, ...points);
	const span = max - min || 1;
	const x = (index: number) =>
		pad + (index / (points.length - 1)) * (width - pad * 2);
	const y = (value: number) =>
		pad + (1 - (value - min) / span) * (height - pad * 2);

	const line = points
		.map((value, index) => `${x(index)},${y(value)}`)
		.join(" ");
	const last = points[points.length - 1];
	const color = last >= 0 ? "var(--up)" : "var(--down)";
	const zero = y(0);

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			aria-hidden="true"
		>
			<line
				x1={0}
				x2={width}
				y1={zero}
				y2={zero}
				stroke="var(--line)"
				strokeWidth="1"
				strokeDasharray="2 3"
			/>
			<polyline
				points={line}
				fill="none"
				stroke={color}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle cx={x(points.length - 1)} cy={y(last)} r="2.5" fill={color} />
		</svg>
	);
}
