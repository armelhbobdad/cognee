import { useEffect, useMemo, useState } from "react";

interface UndoToastProps {
	className?: string;
	durationMs?: number;
	onDismiss?: () => void;
	onUndo: () => void;
	subject: string;
}

const RING_RADIUS = 8;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Past-tense action verbs the toast leads with. Subject strings of the form
// `${verb} ${target}` get the verb rendered in sans and the target rendered
// in mono so dataset/file/key identifiers read as machine values, not prose.
// Order matters: longer verbs first so "Tombstoned" wins over "Tomb".
const SUBJECT_VERBS = ["Tombstoned", "Removed", "Deleted", "Cleared", "Disconnected", "Signed out"];

function splitSubject(subject: string): { verb: string | null; target: string } {
	for (const verb of SUBJECT_VERBS) {
		if (subject.startsWith(`${verb} `)) {
			return { verb, target: subject.slice(verb.length + 1) };
		}
	}
	return { verb: null, target: subject };
}

// Bottom-floating toast for reversible destructive actions (tombstoning a
// dataset, deleting a saved query). The countdown ring around the Undo
// button visualises the remaining window before the action commits. After
// `durationMs` (default 10s) the toast auto-dismisses and the destructive
// action is treated as confirmed.
//
// Subject text is past-tense (Tombstoned, Deleted, Removed) because the
// action has already happened from the user's perspective; the toast is
// the bail-out option, not a preview.
export function UndoToast({
	subject,
	onUndo,
	onDismiss,
	durationMs = 10_000,
	className = "",
}: UndoToastProps) {
	const [progress, setProgress] = useState(100);
	const [dismissed, setDismissed] = useState(false);
	const { verb, target } = useMemo(() => splitSubject(subject), [subject]);

	useEffect(() => {
		if (dismissed) {
			return;
		}
		const start = Date.now();
		const tick = () => {
			const elapsed = Date.now() - start;
			const pct = Math.max(0, 100 - (elapsed / durationMs) * 100);
			setProgress(pct);
			if (pct <= 0) {
				clearInterval(interval);
				setDismissed(true);
				onDismiss?.();
			}
		};
		const interval = setInterval(tick, 50);
		return () => clearInterval(interval);
	}, [durationMs, dismissed, onDismiss]);

	if (dismissed) {
		return null;
	}

	const dashOffset = RING_CIRCUMFERENCE * (1 - progress / 100);

	return (
		<div
			className={`flex items-center gap-3 rounded-lg border border-foreground/20 bg-foreground px-4 py-3 text-background shadow-lg ${className}`}
			role="status"
		>
			<span className="text-sm">
				{verb && <span className="font-medium">{verb} </span>}
				<span className="font-mono text-background/90">{target}</span>
			</span>
			<button
				className="relative ml-2 inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-medium text-sm text-success transition-colors hover:bg-foreground/40"
				onClick={() => {
					setDismissed(true);
					onUndo();
				}}
				type="button"
			>
				<svg
					aria-hidden="true"
					className="absolute top-1/2 left-1.5 -translate-y-1/2"
					height="20"
					viewBox="0 0 20 20"
					width="20"
				>
					<circle
						cx="10"
						cy="10"
						fill="none"
						r={RING_RADIUS}
						stroke="currentColor"
						strokeOpacity="0.2"
						strokeWidth="2"
					/>
					<circle
						cx="10"
						cy="10"
						fill="none"
						r={RING_RADIUS}
						stroke="currentColor"
						strokeDasharray={RING_CIRCUMFERENCE}
						strokeDashoffset={dashOffset}
						strokeLinecap="round"
						strokeWidth="2"
						transform="rotate(-90 10 10)"
					/>
				</svg>
				<span className="ml-5">Undo</span>
			</button>
		</div>
	);
}
