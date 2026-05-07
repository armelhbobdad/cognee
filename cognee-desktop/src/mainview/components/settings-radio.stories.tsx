import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { SettingsRadio } from "./settings-radio";

const KEYCHAIN_OPTIONS = [
	{
		value: "keychain",
		label: "OS keychain",
		recommended: true,
		help: "Most secure. Survives across sessions; uses libsecret on Linux.",
	},
	{
		value: "config",
		label: "Cognee Desktop config",
		help: "Falls back to encrypted config file. Works without a system keychain. Cleared on uninstall.",
	},
];

function ControlledKeychainDefault(args: React.ComponentProps<typeof SettingsRadio>) {
	const [value, setValue] = useState("keychain");
	return <SettingsRadio {...args} onChange={setValue} value={value} />;
}

const meta = {
	title: "Components/Settings Radio",
	component: SettingsRadio,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Radio group for credential-storage choice in Settings. Selected option gets a primary-colored ring and a soft-purple wash; recommended options carry an inline `(recommended)` annotation; help text gives the security rationale. Used by Settings · Mode-Account (sign-in storage) and Settings · Model (LLM API key storage).",
			},
		},
	},
	args: {
		name: "credential-storage",
		options: KEYCHAIN_OPTIONS,
		value: "keychain",
		onChange: () => {
			/* placeholder; stories override via render */
		},
	},
} satisfies Meta<typeof SettingsRadio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const KeychainSelected: Story = {
	args: { value: "keychain" },
};

export const ConfigSelected: Story = {
	args: { value: "config" },
};

export const PreAuthAllDisabled: Story = {
	name: "Pre-auth (all disabled)",
	args: { value: "keychain", disabled: true },
};

export const ClickChangesSelection: Story = {
	name: "Click second option flips selection",
	render: ControlledKeychainDefault,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const keychainRadio = canvas.getByDisplayValue("keychain") as HTMLInputElement;
		const configRadio = canvas.getByDisplayValue("config") as HTMLInputElement;
		expect(keychainRadio.checked).toBe(true);
		expect(configRadio.checked).toBe(false);

		await userEvent.click(configRadio);
		expect(configRadio.checked).toBe(true);
		expect(keychainRadio.checked).toBe(false);
	},
};
