import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForceGraphMethods, GraphData, LinkObject, NodeObject } from "react-force-graph-3d";
import ForceGraph3D from "react-force-graph-3d";
import { AdditiveBlending, Color, Mesh, MeshBasicMaterial, SphereGeometry } from "three";

export type GraphCanvasMode = "exploration" | "search" | "inspect";

export interface GraphCanvasNode {
	fresh?: boolean;
	id: string;
	label?: string;
	type?: string;
	weight?: number;
}

export interface GraphCanvasLink {
	source: string;
	target: string;
	type?: string;
}

export type GraphCanvasData = GraphData<GraphCanvasNode, GraphCanvasLink>;

interface GraphCanvasProps {
	className?: string;
	data: GraphCanvasData;
	height?: number;
	mode?: GraphCanvasMode;
	onNodeClick?: (node: NodeObject<GraphCanvasNode>) => void;
	onNodeHover?: (node: NodeObject<GraphCanvasNode> | null) => void;
	width?: number;
}

// dagMode locked per Pass HH:
//   exploration (1.5) — no dagMode (free force layout)
//   search      (1.6) — no dagMode (inherits 1.5 visual continuity)
//   inspect     (1.7) — radialout (focal node centered, neighbors radiating)
const DAG_MODE_BY_MODE: Record<GraphCanvasMode, "radialout" | undefined> = {
	exploration: undefined,
	search: undefined,
	inspect: "radialout",
};

const NGRAPH_THRESHOLD = 1000;
// Above this many nodes, the force simulation is the bottleneck; cap the
// cooldown so the layout settles quickly and the canvas stops doing physics.
const HEAVY_GRAPH_THRESHOLD = 1500;
const COOLDOWN_TICKS_LIGHT = 200;
const COOLDOWN_TICKS_HEAVY = 60;
const COOLDOWN_TIME_LIGHT_MS = 15_000;
const COOLDOWN_TIME_HEAVY_MS = 4000;

// Hard-coded fallbacks used when the token layer hasn't populated yet (SSR,
// disconnected document, missing stylesheet). Runtime values come from
// --graph-type-* tokens in index.css; these match the token defaults so the
// canvas renders consistently in both paths.
const FALLBACK_FRESH = "#0DFF00";
const FALLBACK_PRIMARY = "#6510F4";
const FALLBACK_DIM = "#D4D4D8";
const FALLBACK_TYPE: Record<string, string> = {
	Organization: "#6510F4",
	Concept: "#A78BFA",
	Source: "#52525B",
	Chunk: "#A1A1AA",
	Person: "#22C55E",
	Place: "#F59E0B",
};

const LINK_DEFAULT = "rgba(167, 165, 173, 0.6)";
const LINK_DIM = "rgba(167, 165, 173, 0.15)";
const LINK_HIGHLIGHT = "rgba(101, 16, 244, 0.8)"; // primary at 80%

// Reads the design-system graph color tokens off the document root. Cached
// at component mount; re-reading on theme switch is deferred to the v0.2
// dark-mode pass since the canvas itself ships light-only at v0.1.
function readGraphTokens(): {
	fresh: string;
	primary: string;
	dim: string;
	byType: Record<string, string>;
} {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return {
			fresh: FALLBACK_FRESH,
			primary: FALLBACK_PRIMARY,
			dim: FALLBACK_DIM,
			byType: FALLBACK_TYPE,
		};
	}
	const cs = window.getComputedStyle(document.documentElement);
	const get = (name: string, fallback: string): string => {
		const value = cs.getPropertyValue(name).trim();
		return value || fallback;
	};
	return {
		fresh: get("--graph-fresh", FALLBACK_FRESH),
		primary: get("--primary", FALLBACK_PRIMARY),
		dim: get("--graph-dim", FALLBACK_DIM),
		byType: {
			Organization: get("--graph-type-organization", FALLBACK_TYPE.Organization),
			Concept: get("--graph-type-concept", FALLBACK_TYPE.Concept),
			Source: get("--graph-type-source", FALLBACK_TYPE.Source),
			Chunk: get("--graph-type-chunk", FALLBACK_TYPE.Chunk),
			Person: get("--graph-type-person", FALLBACK_TYPE.Person),
			Place: get("--graph-type-place", FALLBACK_TYPE.Place),
		},
	};
}

function endpointId(
	endpoint: string | number | NodeObject<GraphCanvasNode> | undefined
): string | undefined {
	if (typeof endpoint === "string") {
		return endpoint;
	}
	if (typeof endpoint === "object" && endpoint !== null) {
		return endpoint.id;
	}
	return;
}

function buildNeighborSet(
	hoveredId: string | null,
	links: readonly LinkObject<GraphCanvasNode, GraphCanvasLink>[]
): Set<string> {
	if (!hoveredId) {
		return new Set();
	}
	const set = new Set<string>([hoveredId]);
	for (const link of links) {
		const src = endpointId(link.source);
		const tgt = endpointId(link.target);
		if (src === hoveredId && tgt) {
			set.add(tgt);
		}
		if (tgt === hoveredId && src) {
			set.add(src);
		}
	}
	return set;
}

// 3D force-directed knowledge-graph view powered by react-force-graph-3d
// v1.29.1. The component is the cognee-desktop primary visualisation.
//
// Three modes (matching surfaces 1.5/1.6/1.7):
//   exploration: full graph, free force, default camera
//   search:      same data shape; subset highlighting via node coloring
//   inspect:     radialout DAG layout (requires acyclic data)
//
// UX features:
//   - hover tooltip with `label (type)` on every node
//   - color by type via a brand palette; freshly-cognified nodes pulse green
//   - directional arrows on links (knowledge-graph relationships are directed)
//   - hover-highlight: dim non-neighbors and non-incident links
//   - click-to-focus: camera animates to the clicked node's neighborhood
//   - node sizing by optional `weight` prop (centrality / chunk count)
//
// Performance budget per Pass HH:
//   60fps @ 500 nodes (typical), 30fps min @ 5000 (stretch), soft cap 10000.
//
// `controlType` is init-only per the underlying library; remount the
// component to switch. Locked at trackball.
export function GraphCanvas({
	className = "",
	data,
	height = 600,
	mode = "exploration",
	onNodeClick,
	onNodeHover,
	width = 800,
}: GraphCanvasProps) {
	const fgRef = useRef<ForceGraphMethods<GraphCanvasNode, GraphCanvasLink>>(undefined);
	const [hoveredId, setHoveredId] = useState<string | null>(null);

	// Read tokens once at mount. v0.1 ships light-only so a single read is
	// sufficient. v0.2 dark-mode adds either a MutationObserver on
	// document.documentElement[data-theme] or a re-run keyed by a theme
	// context value.
	const tokens = useMemo(() => readGraphTokens(), []);

	const nodeCount = data.nodes.length;
	const isHeavy = nodeCount > HEAVY_GRAPH_THRESHOLD;
	const dagMode = DAG_MODE_BY_MODE[mode];
	const forceEngine = nodeCount > NGRAPH_THRESHOLD ? "ngraph" : "d3";
	const cooldownTicks = isHeavy ? COOLDOWN_TICKS_HEAVY : COOLDOWN_TICKS_LIGHT;
	const cooldownTime = isHeavy ? COOLDOWN_TIME_HEAVY_MS : COOLDOWN_TIME_LIGHT_MS;
	const arrowLength = isHeavy ? 0 : 3.5;
	const nodeRelSize = isHeavy ? 3 : 5;

	const neighborIds = useMemo(
		() => buildNeighborSet(hoveredId, data.links),
		[hoveredId, data.links]
	);

	useEffect(() => {
		// Read the ref inside cleanup, not at setup time. At mount the ref is
		// undefined because ForceGraph3D's internal ref handle attaches AFTER
		// React's first effect pass. Capturing at setup would dispose nothing.
		return () => {
			try {
				fgRef.current?.renderer().dispose();
			} catch {
				// Renderer may already be disposed in some hot-reload paths.
			}
		};
	}, []);

	const handleNodeClick = useCallback(
		(node: NodeObject<GraphCanvasNode>) => {
			if (fgRef.current && node.x !== undefined) {
				const x = node.x;
				const y = node.y ?? 0;
				const z = node.z ?? 0;
				const distance = 80;
				const distRatio = 1 + distance / Math.max(1, Math.hypot(x, y, z));
				fgRef.current.cameraPosition(
					{ x: x * distRatio, y: y * distRatio, z: z * distRatio },
					{ x, y, z },
					1500
				);
			}
			onNodeClick?.(node);
		},
		[onNodeClick]
	);

	const handleNodeHover = useCallback(
		(node: NodeObject<GraphCanvasNode> | null) => {
			setHoveredId(node?.id ?? null);
			onNodeHover?.(node);
		},
		[onNodeHover]
	);

	const nodeColor = useCallback(
		(node: NodeObject<GraphCanvasNode>) => {
			if (node.fresh) {
				return tokens.fresh;
			}
			if (hoveredId && !neighborIds.has(node.id)) {
				return tokens.dim;
			}
			return tokens.byType[node.type ?? ""] ?? tokens.primary;
		},
		[hoveredId, neighborIds, tokens]
	);

	// Halo for fresh nodes. Renders a translucent additive sphere around
	// just-cognified nodes so they read as "this is new" at a glance, then
	// fall back to default rendering once `fresh` flips off in the data
	// layer. Non-fresh nodes return `null` and pick up the default sphere
	// (because nodeThreeObjectExtend resolves to false for them).
	//
	// Memory: each Mesh + SphereGeometry + Material is owned by ForceGraph3D
	// once attached; the lib disposes them when the node leaves. Halos do
	// NOT participate in the cooldown threshold check (they're visually
	// scoped to a small subset and the additive blend has minimal fill cost).
	const haloColor = useMemo(() => new Color(tokens.fresh), [tokens.fresh]);
	const nodeThreeObject = useCallback(
		(node: NodeObject<GraphCanvasNode>) => {
			if (!node.fresh) {
				return null;
			}
			const weight = node.weight ?? 1;
			const haloRadius = nodeRelSize * Math.cbrt(weight) * 2.4;
			const geometry = new SphereGeometry(haloRadius, 16, 16);
			const material = new MeshBasicMaterial({
				color: haloColor,
				blending: AdditiveBlending,
				depthWrite: false,
				opacity: 0.22,
				transparent: true,
			});
			return new Mesh(geometry, material);
		},
		[nodeRelSize, haloColor]
	);

	// Extend the default node sphere only for fresh nodes. Non-fresh nodes
	// return null from nodeThreeObject, but with extend=false (the default)
	// that would replace them with nothing. The accessor below makes
	// extend=true only for fresh, so the default sphere always paints.
	const nodeThreeObjectExtend = useCallback(
		(node: NodeObject<GraphCanvasNode>) => Boolean(node.fresh),
		[]
	);

	const nodeLabel = useCallback((node: NodeObject<GraphCanvasNode>): string => {
		if (node.label && node.type) {
			return `${node.label} (${node.type})`;
		}
		return node.label ?? node.id;
	}, []);

	const nodeVal = useCallback((node: NodeObject<GraphCanvasNode>) => node.weight ?? 1, []);

	const linkColor = useCallback(
		(link: LinkObject<GraphCanvasNode, GraphCanvasLink>) => {
			if (!hoveredId) {
				return LINK_DEFAULT;
			}
			const src = endpointId(link.source);
			const tgt = endpointId(link.target);
			if (src === hoveredId || tgt === hoveredId) {
				return LINK_HIGHLIGHT;
			}
			return LINK_DIM;
		},
		[hoveredId]
	);

	// Auto-fit the camera once the force simulation settles. Without this the
	// default camera position is calibrated for small graphs; at 1000+ nodes
	// the cluster expands and ends up as a tiny dot in the centre of the view.
	const handleEngineStop = useCallback(() => {
		fgRef.current?.zoomToFit(800, 40);
	}, []);

	return (
		<div
			className={`relative ${className}`}
			style={{
				height,
				width,
				// Atmospheric vignette: a soft radial gradient behind the WebGL
				// canvas gives the 3D scene a subject-on-stage feel instead of
				// floating dots on flat zinc. Stays calm: ~6% center brightness
				// fading to surface-canvas at the edges.
				backgroundImage:
					"radial-gradient(ellipse at center, rgba(101, 16, 244, 0.04) 0%, var(--surface-canvas) 70%)",
			}}
		>
			<ForceGraph3D
				backgroundColor="rgba(0,0,0,0)"
				controlType="trackball"
				cooldownTicks={cooldownTicks}
				cooldownTime={cooldownTime}
				dagMode={dagMode}
				forceEngine={forceEngine}
				graphData={data}
				height={height}
				linkColor={linkColor}
				linkDirectionalArrowLength={arrowLength}
				linkDirectionalArrowRelPos={1}
				linkOpacity={0.6}
				nodeColor={nodeColor}
				nodeLabel={nodeLabel}
				nodeRelSize={nodeRelSize}
				nodeThreeObject={nodeThreeObject}
				nodeThreeObjectExtend={nodeThreeObjectExtend}
				nodeVal={nodeVal}
				numDimensions={3}
				onEngineStop={handleEngineStop}
				onNodeClick={handleNodeClick}
				onNodeHover={handleNodeHover}
				ref={fgRef}
				showNavInfo={false}
				width={width}
			/>
		</div>
	);
}
