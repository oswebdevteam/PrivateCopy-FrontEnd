import { useState } from "react";

import { Badge } from "#/components/ui/Badge";
import { Button } from "#/components/ui/Button";
import { Copyable } from "#/components/ui/Copyable";
import { Modal } from "#/components/ui/Modal";
import type { AttestationView } from "#/lib/api/types";
import { dateTime, relative } from "#/lib/format";

/**
 * An attestation is the only reason to trust a number here, so the badge opens
 * the full evidence: period, snapshot root, TEE quote, signature and the public
 * transaction that anchors it.
 */
export function AttestationBadge({
	attestation,
	label,
}: {
	attestation: Pick<
		AttestationView,
		| "period_end"
		| "snapshot_root"
		| "tee_quote"
		| "signature"
		| "tx_hash"
		| "created_at"
		| "window"
	> & { period_start?: string };
	label?: string;
}) {
	const [open, setOpen] = useState(false);
	const anchored = Boolean(attestation.tx_hash);

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="cursor-pointer border-0 bg-transparent p-0"
			>
				<Badge tone={anchored ? "up" : "warn"}>
					{label ?? (anchored ? "Attested" : "Attested, not anchored")}
					<span className="num font-normal opacity-70">
						{relative(attestation.period_end)}
					</span>
				</Badge>
			</button>

			<Modal
				open={open}
				title="Attestation"
				onClose={() => setOpen(false)}
				footer={<Button onClick={() => setOpen(false)}>Close</Button>}
			>
				<p className="mt-0 mb-4 text-sm text-[var(--ink-soft)]">
					The attestor reads the trader's confidential balances inside a TEE,
					computes the return, then signs it. Nothing about individual positions
					is disclosed — the snapshot root commits to the balances the figure
					came from.
				</p>
				<dl className="m-0 grid grid-cols-1 gap-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-5">
					<Row label="Window">{attestation.window}</Row>
					<Row label="Period end">{dateTime(attestation.period_end)}</Row>
					<Row label="Signed at">{dateTime(attestation.created_at)}</Row>
					<Row label="Snapshot root">
						<Copyable value={attestation.snapshot_root} head={14} tail={8} />
					</Row>
					<Row label="TEE quote">
						<Copyable value={attestation.tee_quote} head={14} tail={8} />
					</Row>
					<Row label="Signature">
						<Copyable value={attestation.signature} head={14} tail={8} />
					</Row>
					<Row label="On-chain root">
						{attestation.tx_hash ? (
							<Copyable value={attestation.tx_hash} head={14} tail={8} />
						) : (
							<span className="text-[var(--warn)]">
								not yet submitted — signature verifiable off-chain
							</span>
						)}
					</Row>
				</dl>
			</Modal>
		</>
	);
}

function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<>
			<dt className="m-0 text-[var(--ink-faint)]">{label}</dt>
			<dd className="m-0 min-w-0">{children}</dd>
		</>
	);
}
