import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PasswordInput } from "./password-input";

function Controlled(props: Omit<React.ComponentProps<typeof PasswordInput>, "value" | "onChange">) {
	const [value, setValue] = useState("");
	return <PasswordInput {...props} onChange={setValue} value={value} />;
}

const meta = {
	title: "Components/Password Input",
	component: PasswordInput,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Single-line input for sensitive values (API keys, passwords). Masked by default; an eye-icon toggle in the right gutter reveals plaintext for as long as it is needed. The toggle is purely visual: the underlying input still binds to the parent value, and the parent is responsible for clearing that value on unmount so chrome cannot leak credentials between routes (revert-on-unmount privacy posture).",
			},
		},
	},
	args: {
		label: "API key",
		placeholder: "sk-...",
		value: "",
		onChange: fn(),
	},
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
	args: { value: "" },
};

export const Filled: Story = {
	args: { value: "sk-test-1234567890abcdef" },
};

export const WithHelpText: Story = {
	args: {
		value: "",
		helpText: "Stored in the OS keychain. Cleared when you remove the key.",
	},
};

export const WithError: Story = {
	args: {
		value: "invalid",
		errorText: "That key was rejected by OpenAI. Check the value and try again.",
	},
};

export const Disabled: Story = {
	args: { value: "sk-test-1234567890abcdef", disabled: true },
};

export const MaskedByDefault: Story = {
	name: "Masked by default",
	render: (args) => <Controlled {...args} />,
	args: { value: "" },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByLabelText("API key") as HTMLInputElement;
		await userEvent.type(input, "sk-secret-value");
		expect(input.type).toBe("password");
	},
};

export const ToggleReveals: Story = {
	name: "Toggle reveals plaintext, then re-masks",
	render: (args) => <Controlled {...args} />,
	args: { value: "" },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByLabelText("API key") as HTMLInputElement;
		await userEvent.type(input, "sk-secret-value");
		expect(input.type).toBe("password");

		const toggle = canvas.getByRole("button", { name: "Show value" });
		await userEvent.click(toggle);
		expect(input.type).toBe("text");
		expect(canvas.getByRole("button", { name: "Hide value" })).toBeInTheDocument();

		await userEvent.click(canvas.getByRole("button", { name: "Hide value" }));
		expect(input.type).toBe("password");
	},
};
