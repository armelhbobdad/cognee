import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { DatasetRow } from "./dataset-row";

const meta = {
	title: "Components/Dataset Row",
	component: DatasetRow,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"One row in the Datasets list. Six lifecycle states: idle, selected, cognifying (with progress), failed (with retry), tombstoned (strikethrough + Undo), and the `fresh` modifier (graph-fresh ring after cognify completes). The tombstoned state is the highest-stakes drift surface in the app: rows must NOT navigate on click during the 10s undo window; only the Undo button fires.",
			},
		},
	},
	args: {
		name: "design-research",
		chunks: 247,
		entities: 89,
		relationships: 156,
		when: "Cognified 12 minutes ago",
		onClick: fn(),
		onUndo: fn(),
		onRetry: fn(),
	},
} satisfies Meta<typeof DatasetRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
	args: { state: "idle" },
};

export const Selected: Story = {
	args: { state: "selected" },
};

export const FreshAfterCognify: Story = {
	name: "Fresh (just-cognified ring)",
	args: { state: "idle", fresh: true },
};

export const Cognifying: Story = {
	args: {
		state: "cognifying",
		cognifyProgress: 42,
		chunks: 0,
		entities: 0,
		relationships: 0,
		when: "Started just now",
	},
};

export const Failed: Story = {
	args: { state: "failed", when: "Last attempt 2 minutes ago" },
};

export const Tombstoned: Story = {
	args: { state: "tombstoned" },
};

export const TombstonedDoesNotFireOnClick: Story = {
	name: "Tombstoned row swallows click; only Undo fires",
	args: { state: "tombstoned" },
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);
		const row = canvasElement.querySelector('[role="button"]') as HTMLElement | null;
		// Tombstoned rows have no role="button" (tabIndex undefined, role undefined).
		// Click target falls through to the row div, but onClick is gated by `isTombstoned`.
		if (row) {
			await userEvent.click(row);
		} else {
			await userEvent.click(canvas.getByText("design-research"));
		}
		expect(args.onClick).not.toHaveBeenCalled();

		const undo = canvas.getByRole("button", { name: "Undo" });
		await userEvent.click(undo);
		expect(args.onUndo).toHaveBeenCalledTimes(1);
	},
};

export const FailedRetryFires: Story = {
	name: "Failed row exposes Retry; click fires onRetry, not onClick",
	args: { state: "failed" },
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);
		const retry = canvas.getByRole("button", { name: "Retry" });
		await userEvent.click(retry);
		expect(args.onRetry).toHaveBeenCalledTimes(1);
		// onClick is the row-level handler. e.stopPropagation() in Retry should
		// prevent the row from navigating.
		expect(args.onClick).not.toHaveBeenCalled();
	},
};
