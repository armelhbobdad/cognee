import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { DeviceCodeShell } from "./device-code-shell";

function ControlledOpen(args: React.ComponentProps<typeof DeviceCodeShell>) {
	const [open, setOpen] = useState(true);
	return <DeviceCodeShell {...args} onOpenChange={setOpen} open={open} />;
}

const meta = {
	title: "Patterns/Device-Code Shell",
	component: DeviceCodeShell,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Auth0 Device Authorization Flow shell. Shows the user-displayed device code plus a primary 'Open browser' button that launches the Auth0 verification URL. The countdown shows time until the code expires (default 15 minutes). The modal dims the chrome (sidebar, status bar stay visible) so the user sees they're still inside cognee during the auth flow.",
			},
			// Render each preview in its own iframe so the radix-ui Dialog Portal
			// (mounted to document.body) is scoped to that iframe instead of
			// covering the entire Storybook docs page. autoplay disabled because
			// browsers do not honor `autoFocus` inside iframes that lack focus,
			// so `expect(document.activeElement)` assertions cannot run reliably
			// in the docs preview. Canvas view (clicking a story in the sidebar)
			// still runs the play function with the iframe focused.
			story: { inline: false, height: "540px", autoplay: false },
		},
	},
	args: {
		open: true,
		deviceCode: "ABCD-1234",
		expiresInSeconds: 900,
		onOpenBrowser: fn(),
		onCancel: fn(),
		onOpenChange: fn(),
	},
} satisfies Meta<typeof DeviceCodeShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	name: "Default (15-minute expiry)",
	args: { deviceCode: "ABCD-1234", expiresInSeconds: 900 },
};

export const NearExpiry: Story = {
	name: "Near expiry (1 minute left)",
	args: { deviceCode: "WXYZ-5678", expiresInSeconds: 60 },
};

export const OpenBrowserIsAutoFocused: Story = {
	name: "Open browser is auto-focused (primary CTA)",
	render: ControlledOpen,
	play: async () => {
		const openBrowserButton = await within(document.body).findByRole("button", {
			name: "Open browser",
		});
		expect(document.activeElement).toBe(openBrowserButton);
	},
};

export const ClickOpenBrowserFires: Story = {
	name: "Open browser click fires handler",
	render: ControlledOpen,
	play: async ({ args }) => {
		const openBrowserButton = await within(document.body).findByRole("button", {
			name: "Open browser",
		});
		await userEvent.click(openBrowserButton);
		expect(args.onOpenBrowser).toHaveBeenCalledTimes(1);
	},
};
