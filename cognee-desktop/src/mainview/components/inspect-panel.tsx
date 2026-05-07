import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export interface InspectChunk {
	id: string;
	offsets: [number, number];
	source: string;
	text: string;
}

export interface InspectEntity {
	id: string;
	name: string;
	neighbors: string[];
	type: string;
}

export interface InspectContradiction {
	factA: string;
	factB: string;
	sourceA: string;
	sourceB: string;
}

export type InspectData =
	| { mode: "chunk"; chunk: InspectChunk }
	| { mode: "entity"; entity: InspectEntity }
	| { mode: "contradiction"; contradiction: InspectContradiction };

interface InspectPanelProps {
	className?: string;
	data: InspectData;
	onClose: () => void;
	onFlagContradiction?: () => void;
}

// Right-side detail panel for chunks, entities, and contradictions.
// Width is fixed at 480px; height fills the parent. Mode switches the
// content body but not the chrome (header, close button, footer).
//
// Contradiction mode adds a 4px left-border in the destructive color and a
// 5% destructive tint to the body so the flag-worthy state visually stands
// out from the regular chunk and entity views (Pass T contract).
export function InspectPanel({
	data,
	onClose,
	onFlagContradiction,
	className = "",
}: InspectPanelProps) {
	const isContradiction = data.mode === "contradiction";
	const tintClass = isContradiction ? "border-l-4 border-l-destructive bg-destructive/[0.05]" : "";

	return (
		<aside
			aria-label={`Inspect ${data.mode}`}
			className={`flex h-full w-[480px] flex-col border-border border-l bg-background ${tintClass} ${className}`}
		>
			<header className="flex items-center justify-between border-border border-b px-5 py-4">
				<h2 className="font-medium text-foreground text-sm uppercase tracking-wider">
					{data.mode === "chunk" && "Chunk"}
					{data.mode === "entity" && "Entity"}
					{data.mode === "contradiction" && "Contradiction"}
				</h2>
				<button
					aria-label="Close inspect panel"
					className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					onClick={onClose}
					type="button"
				>
					<HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} />
				</button>
			</header>

			<div className="flex-1 overflow-auto px-5 py-4">
				{data.mode === "chunk" && <ChunkBody chunk={data.chunk} />}
				{data.mode === "entity" && <EntityBody entity={data.entity} />}
				{data.mode === "contradiction" && (
					<ContradictionBody contradiction={data.contradiction} onFlag={onFlagContradiction} />
				)}
			</div>
		</aside>
	);
}

function ChunkBody({ chunk }: { chunk: InspectChunk }) {
	return (
		<div className="flex flex-col gap-4">
			<p className="font-mono text-foreground text-sm leading-relaxed">{chunk.text}</p>
			<div className="border-border border-t pt-3">
				<p className="text-muted-foreground text-xs uppercase tracking-wider">Source</p>
				<p className="mt-1 font-mono text-foreground text-sm">
					{chunk.source} · offsets {chunk.offsets[0]}–{chunk.offsets[1]}
				</p>
			</div>
		</div>
	);
}

function EntityBody({ entity }: { entity: InspectEntity }) {
	return (
		<div className="flex flex-col gap-4">
			<div>
				<p className="font-medium text-foreground text-lg tracking-tight">{entity.name}</p>
				<p className="mt-0.5 text-muted-foreground text-sm">{entity.type}</p>
			</div>
			<div className="border-border border-t pt-3">
				<p className="text-muted-foreground text-xs uppercase tracking-wider">
					Neighbors ({entity.neighbors.length})
				</p>
				<ul className="mt-2 flex flex-col gap-1">
					{entity.neighbors.map((neighbor) => (
						<li className="font-mono text-foreground text-sm" key={neighbor}>
							{neighbor}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

function ContradictionBody({
	contradiction,
	onFlag,
}: {
	contradiction: InspectContradiction;
	onFlag?: () => void;
}) {
	return (
		<div className="flex flex-col gap-4">
			<div className="rounded-md border border-border bg-background p-3">
				<p className="text-foreground text-sm leading-relaxed">{contradiction.factA}</p>
				<p className="mt-2 font-mono text-muted-foreground text-xs">
					Source: {contradiction.sourceA}
				</p>
			</div>
			<div className="text-center text-muted-foreground text-xs uppercase tracking-wider">vs</div>
			<div className="rounded-md border border-border bg-background p-3">
				<p className="text-foreground text-sm leading-relaxed">{contradiction.factB}</p>
				<p className="mt-2 font-mono text-muted-foreground text-xs">
					Source: {contradiction.sourceB}
				</p>
			</div>
			{onFlag && (
				<button
					className="mt-2 rounded-md bg-destructive px-4 py-2 font-medium text-destructive-foreground text-sm transition-colors hover:bg-destructive/90"
					onClick={onFlag}
					type="button"
				>
					Flag for review
				</button>
			)}
		</div>
	);
}
