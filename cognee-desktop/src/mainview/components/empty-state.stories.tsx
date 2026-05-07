import { CloudOffIcon, ServerStackIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyState } from "./empty-state";
import { Button } from "./ui/button";

// Wrapper renders EmptyState inside a fixed-height container so the
// `flex-1` centering works in fullscreen layout.
function EmptyState_Wrapper(props: React.ComponentProps<typeof EmptyState>) {
	return (
		<div className="surface-canvas-atmosphere flex min-h-[520px] w-full flex-col">
			<EmptyState {...props} />
		</div>
	);
}

const meta = {
	title: "Components/Empty State",
	component: EmptyState_Wrapper,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Centered hero for `nothing to show` surfaces. The default glyph is the cognee mark at hero scale, faded to ~12% — the brand quietly anchors every empty moment. Subsystem variants (sidecar-not-ready, network-disconnected) opt in to a system-specific Hugeicons glyph by passing `icon`. Variants differ in copy, not in layout.",
			},
		},
	},
} satisfies Meta<typeof EmptyState_Wrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoDatasets: Story = {
	name: "No datasets (cognee mark)",
	args: {
		title: "Nothing here yet.",
		description:
			"Drop documents into the workspace to turn them into a knowledge graph you can navigate. Or load the sample dataset to see how cognify works.",
		cta: <Button variant="outline">Load sample dataset</Button>,
	},
};

export const SearchNoResults: Story = {
	name: "Search · no results",
	args: {
		title: "Nothing found.",
		description: "Try a different query, or check that the dataset is cognified.",
	},
};

export const SidecarNotReady: Story = {
	name: "Sidecar · starting (system glyph)",
	args: {
		icon: <HugeiconsIcon icon={ServerStackIcon} size={26} strokeWidth={1.5} />,
		title: "Local engine is starting…",
		description:
			"The cognify pipeline boots in the background. This usually takes 5 to 10 seconds on first run.",
	},
};

export const NetworkDisconnected: Story = {
	name: "Network · disconnected (system glyph)",
	args: {
		icon: <HugeiconsIcon icon={CloudOffIcon} size={26} strokeWidth={1.5} />,
		title: "Network unavailable.",
		description: "Cloud features need an internet connection. Local datasets remain accessible.",
	},
};
