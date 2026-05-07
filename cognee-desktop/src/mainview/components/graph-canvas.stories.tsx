import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { GraphCanvas, type GraphCanvasData } from "./graph-canvas";

const NODE_TYPES = ["Organization", "Concept", "Source", "Chunk", "Person", "Place"];

// Community-structured sample data: nodes are partitioned into roughly
// equal-sized communities with dense intra-community links and sparse
// inter-community bridges. This matches the topology of real cognee
// knowledge graphs (clusters of related entities) and produces visibly
// distinct groups in the force layout instead of a uniform ball.
function makeSampleData(nodeCount: number, freshCount = 3): GraphCanvasData {
	const communityCount = Math.max(1, Math.round(Math.sqrt(nodeCount) / 2));
	const perCommunity = Math.ceil(nodeCount / communityCount);

	const nodes = Array.from({ length: nodeCount }, (_, i) => {
		const community = Math.floor(i / perCommunity);
		let weight = 1;
		if (i % perCommunity === 0) {
			weight = 4;
		} else if (i % 7 === 0) {
			weight = 2;
		}
		return {
			id: `n${i}`,
			label: `entity-${i}`,
			type: NODE_TYPES[community % NODE_TYPES.length],
			fresh: i < freshCount,
			weight,
		};
	});

	const links: { source: string; target: string }[] = [];
	// Intra-community links: each node connects to ~3 nearby nodes in the
	// same community for a dense local structure.
	for (let i = 0; i < nodeCount; i++) {
		const community = Math.floor(i / perCommunity);
		const startOfCommunity = community * perCommunity;
		const endOfCommunity = Math.min(startOfCommunity + perCommunity, nodeCount);
		for (let offset = 1; offset <= 3; offset++) {
			const target = i + offset;
			if (target < endOfCommunity) {
				links.push({ source: `n${i}`, target: `n${target}` });
			}
		}
	}
	// Inter-community bridges: connect each community's first node to the
	// next community's first node. Sparse global structure.
	for (let c = 0; c < communityCount - 1; c++) {
		links.push({
			source: `n${c * perCommunity}`,
			target: `n${(c + 1) * perCommunity}`,
		});
	}

	return { nodes, links };
}

// Tree data for the inspect mode (radialout DAG layout). The
// community-structured sampleData uses dense chains (i → i+1, i+2, i+3)
// inside each community, which works for force layout but does not give
// radialout a clean root to anchor against. The binary tree below produces
// a proper DAG with a single root, which radialout places radially.
function makeTreeData(nodeCount: number): GraphCanvasData {
	const nodes = Array.from({ length: nodeCount }, (_, i) => ({
		id: `n${i}`,
		label: i === 0 ? "focal-entity" : `neighbor-${i}`,
		type: i === 0 ? "Organization" : NODE_TYPES[i % NODE_TYPES.length],
		fresh: i === 0,
		weight: i === 0 ? 4 : 1,
	}));
	const links = Array.from({ length: nodeCount - 1 }, (_, i) => {
		const child = i + 1;
		const parent = Math.floor(child / 2);
		return { source: `n${parent}`, target: `n${child}` };
	});
	return { nodes, links };
}

const SAMPLE_50 = makeSampleData(50);
const SAMPLE_500 = makeSampleData(500);
const SAMPLE_2000 = makeSampleData(2000);
const TREE_30 = makeTreeData(30);

const meta = {
	title: "Visualizations/Graph Canvas",
	component: GraphCanvas,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"3D force-directed knowledge-graph view, the primary visualisation in Cognee Desktop. Three modes (exploration, search, inspect) match surfaces 1.5/1.6/1.7. Inspect mode uses `radialout` DAG layout to focus a single entity with neighbors radiating; exploration and search use free force layout. Force engine auto-switches from d3 to ngraph past 1000 nodes for performance. Just-cognified nodes pulse the graph-fresh green for ~600ms.",
			},
		},
	},
	args: {
		mode: "exploration",
		width: 720,
		height: 540,
		onNodeClick: fn(),
		onNodeHover: fn(),
	},
} satisfies Meta<typeof GraphCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ExplorationMode: Story = {
	name: "Exploration mode (1.5) — free force layout",
	args: { data: SAMPLE_50, mode: "exploration" },
};

export const SearchMode: Story = {
	name: "Search mode (1.6) — same data, subset coloring",
	args: { data: SAMPLE_50, mode: "search" },
};

export const InspectMode: Story = {
	name: "Inspect mode (1.7) — radialout DAG layout (tree data)",
	args: { data: TREE_30, mode: "inspect" },
};

export const Perf50Nodes: Story = {
	name: "Perf — 50 nodes (small)",
	args: { data: SAMPLE_50, mode: "exploration" },
};

export const Perf500Nodes: Story = {
	name: "Perf — 500 nodes (typical sample size, 60fps target)",
	args: { data: SAMPLE_500, mode: "exploration" },
};

export const Perf2000Nodes: Story = {
	name: "Perf, 2000 nodes (stretch upper bound; production graphs past this should paginate or filter)",
	args: { data: SAMPLE_2000, mode: "exploration" },
};
