import path from "node:path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
			routesDirectory: path.resolve(import.meta.dirname, "src/mainview/routes"),
			generatedRouteTree: path.resolve(import.meta.dirname, "src/mainview/routeTree.gen.ts"),
		}),
		react(),
	],
	root: "src/mainview",
	build: {
		outDir: "../../dist",
		emptyOutDir: true,
	},
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "src/mainview"),
			shared: path.resolve(import.meta.dirname, "shared"),
		},
	},
	server: {
		port: 5173,
		strictPort: true,
	},
});
