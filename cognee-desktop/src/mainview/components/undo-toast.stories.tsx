import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { UndoToast } from "./undo-toast";

const UNDO_LABEL = /Undo/;

const meta = {
	title: "Patterns/Undo Toast",
	component: UndoToast,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Bottom-floating toast for reversible destructive actions. The countdown ring around the Undo button visualises the remaining window before the action commits. Subject text is past-tense (Tombstoned, Deleted) because the action has already happened from the user's perspective.",
			},
			// Per-story iframe so the toast renders inside its own viewport and
			// doesn't auto-dismiss before the docs preview paints.
			story: { inline: false, height: "180px" },
		},
	},
	args: {
		subject: "Tombstoned design-research",
		onUndo: fn(),
		onDismiss: fn(),
		// Long enough that the docs preview keeps the toast visible. The
		// AutoDismissesAfterDuration story overrides this to exercise the
		// timeout path.
		durationMs: 10_000_000,
	},
} satisfies Meta<typeof UndoToast>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default and ShortCustomSubject inherit the meta-level durationMs (set
// very large so docs previews stay visible). Realistic 10s behaviour is
// exercised by AutoDismissesAfterDuration below.
export const Default: Story = {};

export const ShortCustomSubject: Story = {
	name: "Short custom subject",
	args: { subject: "Removed API key" },
};

export const ClickUndoFires: Story = {
	name: "Click Undo fires onUndo and dismisses",
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);
		const undoButton = canvas.getByRole("button", { name: UNDO_LABEL });
		await userEvent.click(undoButton);
		expect(args.onUndo).toHaveBeenCalledTimes(1);
		// Toast removes itself from the DOM after dismissal.
		await waitFor(() => {
			expect(canvas.queryByRole("button", { name: UNDO_LABEL })).toBeNull();
		});
	},
};

export const AutoDismissesAfterDuration: Story = {
	name: "Auto-dismisses after durationMs",
	args: { durationMs: 600 },
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);
		expect(canvas.getByRole("button", { name: UNDO_LABEL })).toBeInTheDocument();
		await waitFor(
			() => {
				expect(canvas.queryByRole("button", { name: UNDO_LABEL })).toBeNull();
			},
			{ timeout: 1500 }
		);
		expect(args.onDismiss).toHaveBeenCalledTimes(1);
	},
};
