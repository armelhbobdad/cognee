import { withThemeByDataAttribute } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";
import "../src/mainview/index.css";

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		backgrounds: {
			values: [
				{ name: "canvas (light)", value: "#f4f4f4" },
				{ name: "background (light)", value: "#ffffff" },
				{ name: "canvas (dark)", value: "#18181b" },
			],
			default: "canvas (light)",
		},
		layout: "centered",
	},
	decorators: [
		withThemeByDataAttribute({
			themes: { light: "light", dark: "dark" },
			defaultTheme: "light",
			parentSelector: "html",
			attributeName: "data-theme",
		}),
	],
	tags: ["autodocs"],
};

export default preview;
