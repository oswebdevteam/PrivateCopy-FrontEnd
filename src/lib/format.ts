const USD = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

/** Basis points as a signed percentage, e.g. 1234 -> "+12.34%". */
export function bps(value: number, fractionDigits = 2): string {
	const pct = value / 100;
	const sign = pct > 0 ? "+" : "";
	return `${sign}${pct.toFixed(fractionDigits)}%`;
}

/** Unsigned basis points, for risk limits and drawdowns. */
export function bpsPlain(value: number, fractionDigits = 2): string {
	return `${(value / 100).toFixed(fractionDigits)}%`;
}

export function multiplier(value: number): string {
	return `${(value / 10_000).toFixed(2)}x`;
}

export function usd(value: number): string {
	return USD.format(value);
}

/** Smallest-unit integer string -> human amount. Never uses floats on input. */
export function units(
	amount: string,
	decimals: number,
	fractionDigits = 2,
): string {
	const negative = amount.startsWith("-");
	const digits = (negative ? amount.slice(1) : amount).padStart(
		decimals + 1,
		"0",
	);
	const whole = digits.slice(0, digits.length - decimals);
	const frac = digits.slice(digits.length - decimals).slice(0, fractionDigits);
	const grouped = Number(whole).toLocaleString("en-US");
	return `${negative ? "-" : ""}${grouped}${fractionDigits > 0 ? `.${frac}` : ""}`;
}

export function shorten(value: string, head = 6, tail = 4): string {
	return value.length <= head + tail + 1
		? value
		: `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function dateTime(iso: string): string {
	return new Date(iso).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function date(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

export function relative(iso: string): string {
	const delta = Date.now() - new Date(iso).getTime();
	const future = delta < 0;
	const seconds = Math.round(Math.abs(delta) / 1000);
	const units: Array<[number, string]> = [
		[60, "s"],
		[3600, "m"],
		[86_400, "h"],
		[2_592_000, "d"],
	];
	if (seconds < 10) {
		return "just now";
	}
	let text = `${Math.round(seconds / 2_592_000)}mo`;
	if (seconds < 60) {
		text = `${seconds}s`;
	} else {
		for (let index = 1; index < units.length; index += 1) {
			if (seconds < units[index][0]) {
				text = `${Math.round(seconds / units[index - 1][0])}${units[index][1]}`;
				break;
			}
		}
	}
	return future ? `in ${text}` : `${text} ago`;
}

export function duration(seconds: number): string {
	if (seconds % 86_400 === 0) {
		const days = seconds / 86_400;
		return `${days} day${days === 1 ? "" : "s"}`;
	}
	if (seconds % 3600 === 0) {
		const hours = seconds / 3600;
		return `${hours} hour${hours === 1 ? "" : "s"}`;
	}
	return `${Math.round(seconds / 60)} min`;
}

const SYMBOLS: Record<string, string> = {
	"nep141:usdc.fakes.testnet": "USDC",
	"nep141:usdt.fakes.testnet": "USDT",
	"nep141:wrap.testnet": "wNEAR",
	"nep141:eth.fakes.testnet": "ETH",
	"nep141:btc.fakes.testnet": "BTC",
};

const DECIMALS: Record<string, number> = {
	USDC: 6,
	USDT: 6,
	wNEAR: 24,
	ETH: 18,
	BTC: 8,
};

/** Asset ids are long (`nep141:…`); screens show the symbol. */
export function assetSymbol(assetId: string): string {
	if (SYMBOLS[assetId]) {
		return SYMBOLS[assetId];
	}
	const tail = assetId.replace(/^nep141:/, "").split(".")[0];
	const wrapped = tail.replace(/^imt:[^:]+:/, "");
	return wrapped.toUpperCase();
}

export function assetDecimals(assetId: string): number {
	return DECIMALS[assetSymbol(assetId)] ?? 18;
}

/**
 * Risk score on the 1–10 scale copy-trading platforms use, derived only from
 * the attested max drawdown — never invented, and never from data we do not
 * have. The bands are deliberately coarse: an exact drawdown would be one more
 * number for an observer to correlate against.
 */
const RISK_BANDS: Array<[number, number]> = [
	[100, 1],
	[250, 2],
	[500, 3],
	[800, 4],
	[1200, 5],
	[1800, 6],
	[2500, 7],
	[3500, 8],
	[5000, 9],
];

export function riskScore(drawdownBps: number): number {
	const band = RISK_BANDS.find(([ceiling]) => drawdownBps <= ceiling);
	return band ? band[1] : 10;
}

export function riskLabel(score: number): string {
	if (score <= 3) {
		return "Low";
	}
	if (score <= 6) {
		return "Moderate";
	}
	if (score <= 8) {
		return "High";
	}
	return "Very high";
}
