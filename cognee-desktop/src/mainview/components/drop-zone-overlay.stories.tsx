import type { Meta, StoryObj } from "@storybook/react-vite";
import { DropZoneOverlay } from "./drop-zone-overlay";

const meta = {
	title: "Patterns/Drop-Zone Overlay",
	component: DropZoneOverlay,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Full-canvas overlay that appears while the user is dragging files over the app window. The valid variant uses primary purple; invalid (unsupported MIME) uses destructive red so the user releases instead of dropping. Parent wires drag events on the window root; the overlay is presentational.",
			},
			// `position: fixed` collapses to height 0 inside the inline docs render
			// (a Storybook ancestor creates a containing block). Forcing each preview
			// into its own iframe gives the overlay a real viewport to fill.
			story: { inline: false, height: "440px" },
		},
	},
	args: {
		visible: true,
		variant: "valid",
	},
} satisfies Meta<typeof DropZoneOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DraggingValid: Story = {
	name: "Dragging valid files",
	args: { visible: true, variant: "valid" },
};

export const DraggingInvalid: Story = {
	name: "Dragging invalid MIME (destructive cue)",
	args: { visible: true, variant: "invalid" },
};

export const HiddenWhenNotVisible: Story = {
	name: "Returns null when visible=false",
	args: { visible: false },
};
