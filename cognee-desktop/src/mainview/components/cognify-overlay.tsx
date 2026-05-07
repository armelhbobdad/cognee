export type CognifyPhase =
	| "reading"
	| "chunking"
	| "embedding"
	| "entities"
	| "relationships"
	| "indexing";

interface CognifyOverlayProps {
	className?: string;
	counts?: {
		chunks?: number;
		entities?: number;
		relationships?: number;
	};
	onCancel?: () => void;
	phase: CognifyPhase;
}

const PHASES: { id: CognifyPhase; label: string }[] = [
	{ id: "reading", label: "Reading" },
	{ id: "chunking", label: "Chunking" },
	{ id: "embedding", label: "Embedding" },
	{ id: "entities", label: "Extracting entities" },
	{ id: "relationships", label: "Inferring relationships" },
	{ id: "indexing", label: "Indexing" },
];

const COUNT_FORMATTER = new Intl.NumberFormat("en-US");

// Non-blocking overlay shown while cognify is running. The 6-phase indicator
// shows the current phase (filled bullet) plus completed phases (filled,
// muted) and pending phases (empty). Counts update in place as the pipeline
// discovers chunks, entities, relationships. Cancel is always available.
//
// Visual: foreground/30 backdrop preserves visibility of the underlying
// dataset list and orient column so the user feels the work happening on
// top of the workspace, not as a takeover.
export function CognifyOverlay({ phase, counts, onCancel, className = "" }: CognifyOverlayProps) {
	const phaseIndex = PHASES.findIndex((p) => p.id === phase);

	return (
		<div
			aria-live="polite"
			className={`fixed inset-0 z-30 flex items-center justify-center bg-foreground/30 backdrop-blur-sm ${className}`}
			role="status"
		>
			<div className="flex w-[min(90vw,28rem)] flex-col gap-5 rounded-xl border border-border bg-background p-6 shadow-lg">
				<div>
					<h2 className="font-bold font-display text-foreground text-xl tracking-tight">
						Cognifying…
					</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						{PHASES[phaseIndex]?.label ?? "Working"}
					</p>
				</div>

				<ol className="flex flex-col gap-2">
					{PHASES.map((p, idx) => {
						const isActive = idx === phaseIndex;
						const isComplete = idx < phaseIndex;
						let bulletClass = "bg-muted";
						let labelClass = "text-muted-foreground";
						if (isActive) {
							bulletClass = "bg-primary";
							labelClass = "text-foreground";
						} else if (isComplete) {
							bulletClass = "bg-primary/40";
							labelClass = "text-muted-foreground";
						}
						return (
							<li className="flex items-center gap-3 text-sm" key={p.id}>
								<span
									aria-hidden="true"
									className={`size-2 shrink-0 rounded-full ${bulletClass}`}
									style={{
										transition: "background-color var(--motion-base) var(--ease-standard)",
									}}
								/>
								<span
									className={labelClass}
									style={{
										transition: "color var(--motion-base) var(--ease-standard)",
									}}
								>
									{p.label}
								</span>
							</li>
						);
					})}
				</ol>

				{counts && (counts.chunks || counts.entities || counts.relationships) ? (
					<div className="flex items-center gap-3 border-border border-t pt-4 text-xs">
						{counts.chunks !== undefined && (
							<span>
								<span className="font-medium font-mono text-foreground tabular-nums">
									{COUNT_FORMATTER.format(counts.chunks)}
								</span>
								<span className="ml-1 text-muted-foreground">chunks</span>
							</span>
						)}
						{counts.entities !== undefined && (
							<>
								<span aria-hidden="true" className="text-text-disabled">
									·
								</span>
								<span>
									<span className="font-medium font-mono text-foreground tabular-nums">
										{counts.entities}
									</span>
									<span className="ml-1 text-muted-foreground">entities</span>
								</span>
							</>
						)}
						{counts.relationships !== undefined && (
							<>
								<span aria-hidden="true" className="text-text-disabled">
									·
								</span>
								<span>
									<span className="font-medium font-mono text-foreground tabular-nums">
										{counts.relationships}
									</span>
									<span className="ml-1 text-muted-foreground">relationships</span>
								</span>
							</>
						)}
					</div>
				) : null}

				{onCancel && (
					<button
						className="self-start rounded-md border border-border bg-background px-3 py-1.5 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground"
						onClick={onCancel}
						type="button"
					>
						Cancel
					</button>
				)}
			</div>
		</div>
	);
}
