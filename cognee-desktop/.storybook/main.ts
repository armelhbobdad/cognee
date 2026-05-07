import type { StorybookConfig } from "@storybook/react-vite";

// vite.config.ts sets `root: "src/mainview"` for the Electrobun build target.
// Storybook inherits that root, which keeps the `@` alias and the tanstack-router
// `routesDirectory: "routes"` resolution working (routes lives at src/mainview/routes).
// The stories glob below is .storybook-relative, so it still finds files outside the root.
const config: StorybookConfig = {
	stories: ["../.storybook/**/*.mdx", "../src/mainview/components/**/*.stories.@(ts|tsx)"],
	addons: [
		"@storybook/addon-a11y",
		"@storybook/addon-themes",
		"@storybook/addon-docs",
		"@storybook/addon-mcp",
	],
	// Serve src/mainview/public/ at the iframe URL root so @font-face
	// references like url("/fonts/TWKLausanne-700.woff2") resolve. The Vite
	// dev server already serves publicDir automatically for the desktop
	// build; Storybook's iframe needs an explicit staticDirs entry.
	staticDirs: ["../src/mainview/public"],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	typescript: {
		reactDocgen: "react-docgen-typescript",
	},
};

export default config;
