import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { CognifyOverlay } from "./cognify-overlay";

const meta = {
	title: "Patterns/Cognify Overlay",
	component: CognifyOverlay,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Non-blocking overlay shown while cognify runs. The 6-phase indicator shows the current phase (filled bullet), completed phases (filled muted), and pending phases (empty). Counts update in place as the pipeline discovers chunks, entities, and relationships. Cancel is always available so users can abort a long-running cognify.",
			},
			// `position: fixed` collapses to height 0 inside the inline docs render
			// (a Storybook ancestor creates a containing block). Forcing each preview
			// into its own iframe gives the overlay a real viewport to fill.
			story: { inline: false, height: "560px" },
		},
	},
	args: {
		onCancel: fn(),
	},
} satisfies Meta<typeof CognifyOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PhaseReading: Story = {
	name: "Phase 1 — Reading",
	args: { phase: "reading" },
};

export const PhaseEmbedding: Story = {
	name: "Phase 3 — Embedding (with chunk count)",
	args: {
		phase: "embedding",
		counts: { chunks: 247 },
	},
};

export const PhaseEntities: Story = {
	name: "Phase 4 — Entities (counts updating)",
	args: {
		phase: "entities",
		counts: { chunks: 247, entities: 89 },
	},
};

export const PhaseRelationships: Story = {
	name: "Phase 5 — Relationships (full counts)",
	args: {
		phase: "relationships",
		counts: { chunks: 247, entities: 89, relationships: 156 },
	},
};

export const PhaseIndexing: Story = {
	name: "Phase 6 — Indexing (final phase)",
	args: {
		phase: "indexing",
		counts: { chunks: 247, entities: 89, relationships: 156 },
	},
};

export const ClickCancelFires: Story = {
	name: "Cancel button fires onCancel",
	args: { phase: "embedding", counts: { chunks: 50 } },
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);
		const cancelButton = canvas.getByRole("button", { name: "Cancel" });
		await userEvent.click(cancelButton);
		expect(args.onCancel).toHaveBeenCalledTimes(1);
	},
};
