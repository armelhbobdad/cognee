import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { SetupGate } from "./setup-gate";

const OPEN_SETTINGS_LABEL = /Open Settings/;

const meta = {
	title: "Patterns/Setup-gate",
	component: SetupGate,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Centered guard shown when the user attempts an action that requires missing configuration. Most common case: drop documents to ingest before any LLM key is configured. The CTA deep-links into the relevant Settings section. Returns null when not visible.",
			},
			// `position: fixed` collapses to height 0 inside the inline docs render
			// (a Storybook ancestor creates a containing block). Forcing each preview
			// into its own iframe gives the gate a real viewport to fill.
			story: { inline: false, height: "440px" },
		},
	},
	args: {
		visible: true,
		onOpenSettings: fn(),
	},
} satisfies Meta<typeof SetupGate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	name: "Default (LLM key missing)",
	args: { visible: true },
};

export const CustomCopy: Story = {
	name: "Custom title and description",
	args: {
		visible: true,
		title: "Cloud workspace not selected",
		description: "Pick a workspace in Settings to ingest documents into Cognee Cloud.",
		ctaLabel: "Open Settings · Cloud workspace",
	},
};

export const HiddenWhenNotVisible: Story = {
	name: "Returns null when visible=false",
	args: { visible: false },
};

export const ClickCTAFiresHandler: Story = {
	name: "CTA click fires onOpenSettings",
	args: { visible: true },
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);
		const cta = canvas.getByRole("button", { name: OPEN_SETTINGS_LABEL });
		await userEvent.click(cta);
		expect(args.onOpenSettings).toHaveBeenCalledTimes(1);
	},
};
