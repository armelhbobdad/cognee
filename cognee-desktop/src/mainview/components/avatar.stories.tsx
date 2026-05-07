import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Avatar } from "./avatar";

const PHOTO_URL = "https://i.pravatar.cc/128?img=12";

const meta = {
	title: "Components/Avatar",
	component: Avatar,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Circular user identifier with a privacy gate. Photo only renders at size >= 64; smaller chrome sizes (16/24px) fall back to initials regardless of the photo prop. Initials derive from the name: multi-word takes first letters of the first two words, single-word takes one letter, empty falls back to 'avatar' aria-label.",
			},
		},
	},
	args: {
		name: "Armel Hbobdad",
		size: 24,
	},
	argTypes: {
		size: {
			control: { type: "select" },
			options: [16, 24, 32, 48, 64, 96],
		},
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SidebarChrome: Story = {
	args: { size: 24 },
};

export const StatusBarChrome: Story = {
	args: { size: 16 },
};

export const SettingsLarge: Story = {
	args: { size: 64 },
};

export const SettingsLargeWithPhoto: Story = {
	args: { size: 64, photo: PHOTO_URL },
};

export const PrivacyGateAt16: Story = {
	name: "Privacy gate refuses photo at 16px",
	args: { size: 16, photo: PHOTO_URL },
	play: ({ canvasElement }) => {
		expect(canvasElement.querySelector("img")).toBeNull();
	},
};

export const PrivacyGateAt24: Story = {
	name: "Privacy gate refuses photo at 24px",
	args: { size: 24, photo: PHOTO_URL },
	play: ({ canvasElement }) => {
		expect(canvasElement.querySelector("img")).toBeNull();
	},
};

export const PrivacyGateAllowsAt64: Story = {
	name: "Privacy gate allows photo at 64px",
	args: { size: 64, photo: PHOTO_URL },
	play: ({ canvasElement }) => {
		expect(canvasElement.querySelector("img")).not.toBeNull();
	},
};

export const InitialsMultiWord: Story = {
	name: "Initials from multi-word name",
	args: { name: "Armel Hbobdad", size: 64 },
	play: ({ canvasElement }) => {
		expect(canvasElement.textContent).toBe("AH");
	},
};

export const InitialsSingleWord: Story = {
	name: "Initials from single-word name",
	args: { name: "Armel", size: 64 },
	play: ({ canvasElement }) => {
		expect(canvasElement.textContent).toBe("A");
	},
};
