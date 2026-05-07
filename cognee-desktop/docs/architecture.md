# Architecture

## Process model

Three OS processes running concurrently when the app is up:

```
┌─────────────────────────────────────────────────────────────────────┐
│  launcher (native binary, Zig + GTK)                                │
│  └─ spawns: bun-process (main.js, runs the orchestration logic)     │
│             ├─ owns: BrowserView (the React renderer surface)       │
│             └─ spawns + manages: python sidecar (FastAPI)           │
└─────────────────────────────────────────────────────────────────────┘
```

- **Launcher** — bundled native binary that creates a GTK window and embeds a WebKitGTK or CEF web view. Provided by Electrobun.
- **Bun process** — orchestrates everything else: window lifecycle, Python sidecar lifecycle, RPC bridge, configuration. Source at `src/bun/index.ts`.
- **Renderer** — React 19 app served from `src/mainview/`. Communicates with the bun process via typed RPC defined in `shared/rpc.ts`.
- **Python sidecar** — FastAPI app (`python/server.py`) launched on a free port; the bun process polls `/health` until ready, then proxies HTTP requests from the renderer.

## Directory layout

```
cognee-desktop/
├── .storybook/                # Storybook config + Introduction.mdx
│   ├── main.ts                # Framework + addons + stories glob
│   ├── preview.tsx            # Globals, decorators, theme toggle wiring
│   └── Introduction.mdx       # Maintainer landing page in the Storybook UI
├── assets/                    # App icon (PNG, SVG)
├── docs/                      # This documentation
├── public/                    # Static assets served via views:// (e.g. fonts)
├── python/                    # Sidecar source (requirements.txt, server.py)
├── shared/
│   └── rpc.ts                 # Typed RPC contract (bun ↔ renderer)
├── src/
│   ├── bun/
│   │   └── index.ts           # Main process: lifecycle, RPC handlers, sidecar mgmt
│   └── mainview/
│       ├── components/        # React components
│       │   ├── ui/            # shadcn/ui primitives (vendored, do not edit by hand)
│       │   ├── uitripled/     # Animated variants from the uitripled registry
│       │   ├── *.tsx          # App-owned components (sidebar, status-bar, etc.)
│       │   └── *.stories.tsx  # Colocated Storybook stories (one per component)
│       ├── lib/
│       │   ├── electrobun.ts  # Renderer-side RPC client + message listeners
│       │   └── utils.ts       # cn() helper
│       ├── routes/            # TanStack Router file-based routes
│       │   ├── __root.tsx     # Root layout (providers + Outlet)
│       │   ├── _shell.tsx     # Shell layout (sidebar + status bar) for post-onboarding
│       │   ├── _shell.*.tsx   # Routes inside the shell (/, /settings, /about, /help, /dev)
│       │   └── welcome/       # First-run flow (no shell)
│       ├── store/
│       │   └── app-store.ts   # Zustand store: setupState, mode, account
│       ├── index.css          # Brand tokens + @theme inline + base layer
│       ├── index.html         # Webview HTML entry
│       └── index.tsx          # React root + RouterProvider
├── tools/
│   └── calm-tone.grit         # Biome plugin enforcing the calm-tone copy rule
├── biome.json                 # Linter + formatter config
├── components.json            # shadcn/ui CLI config
├── electrobun.config.ts       # App metadata, platform builds, copy directives
├── knip.json                  # Unused-code detector config
├── package.json
├── postcss.config.mjs         # Tailwind 4 plugin wiring
├── tsconfig.json
└── vite.config.ts
```

## Key decisions

### Renderer choice — WebKitGTK by default, CEF opt-in for debugging

Production ships with the native renderer (WebKitGTK on Linux, WKWebView on macOS, WebView2 on Windows) — smaller bundles, no Chromium update treadmill. CEF is wired behind `COGNEE_DEBUG=1` so developers can attach a Chrome DevTools client (`agent-electrobun`, puppeteer, etc.) without paying the bundle cost in production. See [docs/debugging.md](debugging.md).

### Routing — hash history

TanStack Router is configured with `createHashHistory()` because Electrobun loads the renderer over the `views://mainview/index.html` URL scheme; the `pathname` portion is fixed to `/index.html`, so browser-history routing fails to match any route. Hash history sidesteps the URL scheme entirely. See [docs/troubleshooting.md](troubleshooting.md#routes-show-not-found-on-fresh-launch).

### Bundling — Asar disabled

`useAsar: false` in `electrobun.config.ts`. The Python sidecar source has to be reachable from the bun process via filesystem paths (`uv pip install -r requirements.txt`); putting it inside an Asar archive would require the bun process to crack the archive at runtime. The native renderer bundle would be smaller with Asar, but the cost isn't worth the operational complexity for a project that ships a non-JS runtime.

### State — Zustand singleton

The renderer's global state lives in `src/mainview/store/app-store.ts`. Setup state (driven by sidecar lifecycle messages from the bun process) and user-facing mode (`local` | `cloud`) live here. Component-local state stays in components. No reducers, no actions, no thunks — just `set()`. If the surface area grows beyond ~10 fields, revisit.

### Brand tokens — single source of truth in CSS

`src/mainview/index.css` defines the design system as CSS custom properties under `:root`, with a `@theme inline` block bridging them to Tailwind 4 utility classes. Component code never inlines hex literals — every brand decision flows through the cascade. Adding a new token: add it once under `:root`, expose it via `@theme inline`, then it's available as a Tailwind utility.

### Component reference — Storybook (local-only)

Every shipping UI component has a colocated `*.stories.tsx` file. Storybook 10 + react-vite serves them as an interactive reference at `bun storybook`. Stories cover behavioural invariants (privacy gates, countdown rings, focus order, hover state) via play functions that run automatically and surface PASS/FAIL in the Interactions panel.

Three story categories matching the v0.1 component shape:
- **Components/** — primitives (Avatar, Password Input, Settings Radio, Empty State, Dataset Row).
- **Patterns/** — composite stateful (Confirm Modal, Undo Toast, Drop-Zone Overlay, Inspect Panel, Cognify Overlay, Setup-gate, Auth0 Device-Code Shell).
- **Visualizations/** — Graph Canvas, the 3D force-directed knowledge-graph view.

The Storybook is **local-only for v0.1**: there is no hosted preview. Maintainers run `bun storybook` from a fresh clone. Hosted preview is a v0.2 decision once the reviewer audience widens beyond people already cloning the repo.

The Storybook also serves an MCP endpoint (`@storybook/addon-mcp`) at `http://localhost:6006/mcp`, registered in project-scoped `.mcp.json`. Agent tooling (Claude Code, Cursor) can query the component catalog through this endpoint when Storybook is running. See [docs/development.md](development.md#ai-assisted-ui-work-storybook-mcp).

## Process boundaries

- **Renderer ↔ Bun process** — typed RPC via `shared/rpc.ts`. The bun side defines request handlers (e.g. `runSetup`, `getConfig`, `backendRequest`) and pushes messages to the renderer (e.g. `setupStateChanged`, `backendLog`). The renderer subscribes via listener registries in `src/mainview/lib/electrobun.ts`.
- **Bun process ↔ Python sidecar** — HTTP over a localhost port. The bun process owns the `Bun.spawn` handle, streams stdout/stderr to the renderer for log display, and tears it down via SIGTERM (3-second grace) → SIGKILL on window close.
- **Renderer ↔ Python sidecar** — never direct. All requests go through the `backendRequest` RPC, which the bun process forwards to `http://127.0.0.1:${PORT}${path}`. This keeps the sidecar lifecycle and port discovery encapsulated.
