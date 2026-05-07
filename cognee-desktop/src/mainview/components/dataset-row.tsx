export type DatasetRowState = "idle" | "selected" | "cognifying" | "failed" | "tombstoned";

interface DatasetRowProps {
	chunks: number;
	className?: string;
	cognifyProgress?: number;
	entities: number;
	fresh?: boolean;
	name: string;
	onClick?: () => void;
	onRetry?: () => void;
	onUndo?: () => void;
	relationships: number;
	state?: DatasetRowState;
	when: string;
}

const COUNT_FORMATTER = new Intl.NumberFormat("en-US");

// One row in the Datasets list. Six lifecycle states covered:
//
//   idle           → default counts row
//   selected       → primary border + selected wash
//   cognifying     → progress bar replaces counts
//   failed         → destructive line replaces counts; retry CTA
//   tombstoned     → strikethrough + dimmed; Undo button on the right
//   fresh (modifier) → graph-fresh ring border that decays after cognify
//
// The tombstoned state is the highest-stakes drift surface in the app:
// the row stays interactable for ~10s so the user can undo before delete
// commits. Rule: tombstoned rows must NOT navigate on click; only Undo fires.
// Implementation: the main click area is a real <button>, and disabled when
// the row is tombstoned. Undo and Retry are sibling buttons (peers, not nested).

function getBorderClass(isSelected: boolean, fresh: boolean): string {
	if (isSelected) {
		return "border-primary bg-selected";
	}
	if (fresh) {
		return "border-[var(--graph-fresh)] shadow-[0_0_0_1px_var(--graph-fresh)]";
	}
	return "border-border";
}

function CountsLine({
	chunks,
	entities,
	relationships,
}: {
	chunks: number;
	entities: number;
	relationships: number;
}) {
	return (
		<div className="flex items-center text-sm">
			<span>
				<span className="font-medium font-mono text-foreground tabular-nums">
					{COUNT_FORMATTER.format(chunks)}
				</span>
				<span className="ml-1 text-muted-foreground">chunks</span>
			</span>
			<span className="mx-2 text-text-disabled">·</span>
			<span>
				<span className="font-medium font-mono text-foreground tabular-nums">{entities}</span>
				<span className="ml-1 text-muted-foreground">entities</span>
			</span>
			<span className="mx-2 text-text-disabled">·</span>
			<span>
				<span className="font-medium font-mono text-foreground tabular-nums">{relationships}</span>
				<span className="ml-1 text-muted-foreground">relationships</span>
			</span>
		</div>
	);
}

function CognifyLine({ progress }: { progress: number }) {
	return (
		<div className="flex items-center gap-2 text-sm">
			<div className="h-1 max-w-32 flex-1 overflow-hidden rounded-full bg-muted">
				<div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
			</div>
			<span className="text-muted-foreground text-xs">Cognifying… {progress}%</span>
		</div>
	);
}

function FailedLine() {
	return <div className="text-destructive text-sm">Cognify failed.</div>;
}

export function DatasetRow({
	name,
	chunks,
	entities,
	relationships,
	when,
	state = "idle",
	fresh = false,
	cognifyProgress,
	onClick,
	onUndo,
	onRetry,
	className = "",
}: DatasetRowProps) {
	const isTombstoned = state === "tombstoned";
	const isCognifying = state === "cognifying";
	const isFailed = state === "failed";
	const isSelected = state === "selected";

	const borderClass = getBorderClass(isSelected, fresh);
	const dimClass = isTombstoned ? "opacity-50" : "";

	let body: React.ReactNode;
	if (isCognifying) {
		body = <CognifyLine progress={cognifyProgress ?? 0} />;
	} else if (isFailed) {
		body = <FailedLine />;
	} else {
		body = <CountsLine chunks={chunks} entities={entities} relationships={relationships} />;
	}

	const handleClick = () => {
		if (!isTombstoned && onClick) {
			onClick();
		}
	};

	return (
		<div
			className={`group relative flex items-center gap-3.5 rounded-lg border bg-background px-5 py-4 transition-all ${borderClass} ${dimClass} ${className}`}
		>
			<button
				className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 text-left transition-shadow hover:shadow-sm disabled:cursor-not-allowed disabled:hover:shadow-none"
				disabled={isTombstoned}
				onClick={handleClick}
				type="button"
			>
				<div
					className={`font-medium font-mono text-base text-foreground tracking-tight ${isTombstoned ? "line-through" : ""}`}
				>
					{name}
				</div>
				{body}
				<div className="text-muted-foreground text-xs">{when}</div>
			</button>

			{isTombstoned && onUndo ? (
				<button className="text-primary text-sm hover:underline" onClick={onUndo} type="button">
					Undo
				</button>
			) : null}
			{isFailed && onRetry ? (
				<button className="text-primary text-sm hover:underline" onClick={onRetry} type="button">
					Retry
				</button>
			) : null}
		</div>
	);
}
