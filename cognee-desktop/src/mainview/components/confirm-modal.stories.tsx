import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { ConfirmModal } from "./confirm-modal";

function ControlledOpen(args: React.ComponentProps<typeof ConfirmModal>) {
	const [open, setOpen] = useState(true);
	return <ConfirmModal {...args} onOpenChange={setOpen} open={open} />;
}

const meta = {
	title: "Patterns/Confirm Modal",
	component: ConfirmModal,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Two-button modal for destructive or irreversible actions. Cancel is the auto-focused button (NOT a × close affordance) so the safe action is the keyboard-first choice and accidental Enter does not trigger destruction. The destructive variant turns the Confirm button red.",
			},
			// Render each preview in its own iframe so the radix-ui Dialog Portal
			// (mounted to document.body) is scoped to that iframe instead of
			// covering the entire Storybook docs page. autoplay disabled because
			// browsers do not honor `autoFocus` inside iframes that lack focus,
			// so `expect(document.activeElement)` assertions cannot run reliably
			// in the docs preview. Canvas view (clicking a story in the sidebar)
			// still runs the play function with the iframe focused.
			story: { inline: false, height: "420px", autoplay: false },
		},
	},
	args: {
		open: true,
		title: "Tombstone design-research?",
		description:
			"This dataset and its 247 chunks will be removed. You will have 10 seconds to undo before the change commits.",
		confirmLabel: "Tombstone",
		cancelLabel: "Cancel",
		destructive: true,
		onConfirm: fn(),
		onOpenChange: fn(),
	},
} satisfies Meta<typeof ConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Destructive: Story = {
	args: { destructive: true },
};

export const Primary: Story = {
	name: "Primary (non-destructive)",
	args: {
		destructive: false,
		title: "Switch to Cloud mode?",
		description:
			"Cognee Cloud will sync your datasets across devices. Local data stays on this device.",
		confirmLabel: "Switch to Cloud",
	},
};

export const NoDescription: Story = {
	args: { description: undefined },
};

export const CancelIsAutoFocused: Story = {
	name: "Cancel is auto-focused (not Confirm)",
	render: ControlledOpen,
	play: async () => {
		// Dialog renders to a Portal outside canvasElement, so query against
		// document.body instead of within(canvasElement).
		const cancelButton = await within(document.body).findByRole("button", {
			name: "Cancel",
		});
		const confirmButton = within(document.body).getByRole("button", {
			name: "Tombstone",
		});

		// Cancel is focused by default per §11.6: safe action is keyboard-first.
		expect(document.activeElement).toBe(cancelButton);
		expect(document.activeElement).not.toBe(confirmButton);
	},
};

export const ClickConfirmFiresOnConfirm: Story = {
	name: "Click Confirm fires onConfirm and closes the modal",
	render: ControlledOpen,
	play: async ({ args }) => {
		const confirmButton = await within(document.body).findByRole("button", {
			name: "Tombstone",
		});
		await userEvent.click(confirmButton);
		expect(args.onConfirm).toHaveBeenCalledTimes(1);
	},
};
