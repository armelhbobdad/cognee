import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { type InspectData, InspectPanel } from "./inspect-panel";

const CHUNK_DATA: InspectData = {
	mode: "chunk",
	chunk: {
		id: "chunk-001",
		text: "Refunds will be issued within 30 calendar days, provided the original packaging is intact and the receipt is included.",
		source: "refund-policy-v2.md",
		offsets: [312, 401],
	},
};

const ENTITY_DATA: InspectData = {
	mode: "entity",
	entity: {
		id: "entity-042",
		name: "Cognee",
		type: "Organization",
		neighbors: ["knowledge-graph", "memory-engine", "AI-agent", "open-source-software", "Berlin"],
	},
};

const CONTRADICTION_DATA: InspectData = {
	mode: "contradiction",
	contradiction: {
		factA: "Refunds are issued within 30 calendar days.",
		factB: "Refunds are issued within 60 calendar days.",
		sourceA: "refund-policy-v2.md · offsets 312–401",
		sourceB: "support-faq-2024.md · offsets 1240–1290",
	},
};

function PanelFrame({ children }: { children: React.ReactNode }) {
	return <div className="flex h-[560px] w-[480px] bg-muted">{children}</div>;
}

const meta = {
	title: "Patterns/Inspect Panel",
	component: InspectPanel,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Right-side detail panel for chunks, entities, and contradictions. 480px width fixed; height fills the parent. Mode switches the body content but not the chrome (header, close button). Contradiction mode adds a 4px destructive left-border + 5% destructive tint so flag-worthy state visually stands out from regular chunk and entity views.",
			},
		},
	},
	args: {
		onClose: fn(),
		onFlagContradiction: fn(),
	},
	decorators: [
		(Story) => (
			<PanelFrame>
				<Story />
			</PanelFrame>
		),
	],
} satisfies Meta<typeof InspectPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ChunkMode: Story = {
	args: { data: CHUNK_DATA },
};

export const EntityMode: Story = {
	args: { data: ENTITY_DATA },
};

export const ContradictionMode: Story = {
	name: "Contradiction mode (destructive tint + flag CTA)",
	args: { data: CONTRADICTION_DATA },
};

export const ClickFlagFiresOnFlag: Story = {
	name: "Click Flag fires onFlagContradiction",
	args: { data: CONTRADICTION_DATA },
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);
		const flagButton = canvas.getByRole("button", { name: "Flag for review" });
		await userEvent.click(flagButton);
		expect(args.onFlagContradiction).toHaveBeenCalledTimes(1);
	},
};

export const ClickCloseFiresOnClose: Story = {
	name: "Close button fires onClose",
	args: { data: CHUNK_DATA },
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);
		const closeButton = canvas.getByRole("button", { name: "Close inspect panel" });
		await userEvent.click(closeButton);
		expect(args.onClose).toHaveBeenCalledTimes(1);
	},
};
