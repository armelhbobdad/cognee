import type { ElectrobunConfig } from "electrobun/bun";

// Opt-in dev debug: ships CEF + Chrome DevTools Protocol on port 9222 so
// CDP-driven automation (e.g. agent-electrobun) can attach to the running
// app. Off by default to keep the production bundle on the native renderer
// (WebKitGTK on Linux, WKWebView on mac, WebView2 on Windows).
const DEBUG = process.env.COGNEE_DEBUG === "1";

const chromiumFlags = DEBUG ? { "remote-debugging-port": "9222" } : undefined;

export default {
	app: {
		name: "Cognee Desktop",
		identifier: "ai.cognee.desktop",
		version: "0.1.0",
	},
	build: {
		// Asar disabled so the bundled python/ tree is reachable from the
		// bun-process via filesystem paths; the FastAPI sidecar imports
		// requirements + server.py from disk at runtime.
		useAsar: false,
		bun: {
			entrypoint: "src/bun/index.ts",
			external: [],
		},
		views: {},
		copy: {
			"dist/index.html": "views/mainview/index.html",
			"dist/assets/": "views/mainview/assets/",
			"dist/fonts/": "views/mainview/fonts/",
			python: "python",
		},
		// Don't watch python/** — sidecar code is loaded by the spawned
		// uvicorn, not by Bun, so changes there don't need an app relaunch.
		// dist/** intentionally NOT ignored: when vite rewrites the bundle,
		// electrobun's watch sees the change, rebuilds, and relaunches —
		// that's the renderer-side hot-reload loop in dev:debug.
		watchIgnore: ["python/**"],
		mac: {
			codesign: false,
			notarize: false,
			bundleCEF: DEBUG,
			defaultRenderer: DEBUG ? "cef" : "native",
			chromiumFlags,
			entitlements: {},
		},
		linux: {
			bundleCEF: DEBUG,
			defaultRenderer: DEBUG ? "cef" : "native",
			chromiumFlags,
			icon: "assets/icon.png",
		},
		win: {
			bundleCEF: DEBUG,
			defaultRenderer: DEBUG ? "cef" : "native",
			chromiumFlags,
		},
	},
	release: {
		baseUrl: "",
	},
} satisfies ElectrobunConfig;
