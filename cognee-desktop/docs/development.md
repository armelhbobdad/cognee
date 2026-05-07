# Development

## Prerequisites

- **[Bun](https://bun.sh)** ≥ 1.3 — package manager + runtime for the TypeScript side
- **[uv](https://docs.astral.sh/uv/)** — Python package manager. The app auto-installs it on first launch via `curl -LsSf https://astral.sh/uv/install.sh | sh` if missing, but pre-installing avoids a network hit on first run.
- **Linux** — v0.1 ships Linux-only. Tested against GTK + WebKitGTK 2.x. Other platforms compile but aren't part of the v0.1 verification matrix.

## Scripts

| Script | What it does |
| ------ | ------------ |
| `bun run start` | One-shot: `vite build` + `electrobun dev`. Use to verify a clean build. |
| `bun run dev` | Same as `start` but with `electrobun dev --watch` — relaunches on bun-process or `dist/` changes. |
| `bun run dev:hmr` | Vite dev server (port 5173) + `electrobun dev` concurrently. The bun process probes 5173 at startup and loads the renderer from there if available; otherwise loads bundled assets. Best DX for renderer-only iteration. |
| `bun run dev:debug` | Same as `dev` but sets `COGNEE_DEBUG=1`, which flips the renderer to CEF and exposes Chrome DevTools Protocol on `localhost:9222`. Used with [agent-electrobun](https://github.com/Ataraxy-Labs/agent-electrobun) for autonomous UI inspection. See [docs/debugging.md](debugging.md). |
| `bun run check` | Ultracite check (Biome under the hood, with the `ultracite/biome/core` preset extended). Read-only; no fixes applied. |
| `bun run fix` | Ultracite fix — applies all auto-fixable issues. Run before committing. |
| `bun run storybook` | Storybook 10 dev server on port 6006. Browses every component's stories with live Controls + Accessibility + Interactions panels. Local-only; no hosted preview. |

## Renderer hot-reload

Two paths:

1. **`dev:hmr`** — Vite dev server with full HMR (preserves React state across edits). The renderer loads from `localhost:5173` instead of the bundled assets. Bun-process changes still require an `electrobun dev --watch` rebuild, which `dev:hmr` runs concurrently.

2. **`dev` / `dev:debug` / `dev:inspect`** — Vite is one-shot; the renderer loads bundled assets. To iterate on the renderer, run `bunx vite build` after edits — Electrobun's watch sees `dist/` change and rebuilds + relaunches. Slower than HMR but matches the production load path more closely (good for layout / cascade verification).

## Adding UI components

shadcn/ui primitives:
```bash
bunx shadcn@latest add button input dialog
```

uitripled animated variants:
```bash
bunx shadcn@latest add @uitripled/animated-dialog-shadcnui
```

uitripled writes to `src/components/uitripled/...` instead of the path declared in `components.json`. After install, move the generated files into `src/mainview/components/uitripled/` so the `@/` alias resolves.

Vendored components (under `components/ui/` and `components/uitripled/`) are excluded from biome's lint scope — see `biome.json`. Don't edit them by hand; re-run `shadcn add ... --overwrite` to update.

## Adding a story

Stories colocate next to the component they cover. For a component at `src/mainview/components/avatar.tsx`, the story file is `src/mainview/components/avatar.stories.tsx`.

Conventions (enforced by ultracite + the existing stories):

1. **CSF3 + `satisfies Meta<typeof Component>`.** TypeScript-strict typing on the meta object catches prop-shape drift between component and story at compile time.
2. **Self-contained docs description.** `parameters.docs.description.component` includes the rationale (why this component exists and what invariants it carries) so a maintainer reading just the story understands intent.
3. **`fn()` from `storybook/test` for callback args.** Lets play functions assert call counts via `expect(args.onClick).toHaveBeenCalledTimes(1)`.
4. **Hoist regex literals to module-scope constants.** `lint/performance/useTopLevelRegex` flags `name: /Pattern/` inside play functions; declare `const PATTERN_LABEL = /Pattern/;` at the top instead.
5. **Portal-rendered components (modals, toasts) need `within(document.body)`** in play functions, not `within(canvasElement)`. Radix Dialog renders to `document.body` outside the storybook canvas.
6. **Use arbitrary values for content max-widths** (`max-w-[25rem]`) rather than the named scale (`max-w-sm`). The `--spacing-*` namespace is wired to small padding tokens, not breakpoint widths. See [docs/troubleshooting.md](troubleshooting.md#max-w-xl-resolves-to-32px-instead-of-576px).

Minimal story template:

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { MyComponent } from "./my-component";

const meta = {
  title: "Components/My Component",
  component: MyComponent,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "What this component does and why.",
      },
    },
  },
  args: {
    onAction: fn(),
  },
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

After adding a story, the dev server hot-reloads automatically.

## AI-assisted UI work (Storybook MCP)

The project ships a Model Context Protocol server, registered at project scope in `.mcp.json`, that exposes the Storybook catalog to AI agents (Claude Code, Cursor, etc.). When the MCP is reachable, agents can list every component, read each story's props and code, generate preview URLs, and follow framework-specific authoring guidance instead of guessing.

The MCP is enabled by `@storybook/addon-mcp` in `.storybook/main.ts`. It serves at `http://localhost:6006/mcp` whenever Storybook is running.

### Workflow

For agent-assisted UI work (building a new route, composing a screen out of existing components, refactoring shared chrome), run Storybook in a separate terminal first:

```bash
bun storybook
```

The agent connects to the MCP automatically (Claude Code prompts you to trust the project-scoped server on first use). Once trusted, the agent has access to:

- `list-all-documentation` — full component catalog with story IDs
- `get-documentation` — props + first 3 stories with real usage code per component
- `get-documentation-for-story` — deep-dive on a specific story variant
- `preview-stories` — direct preview URLs (supports custom props and globals like theme)
- `get-storybook-story-instructions` — gates new story creation with framework-specific patterns

The MCP-served instructions explicitly forbid hallucinating component props: agents are told to call `list-all-documentation` first, retrieve docs before using a component, and report missing components rather than inventing them. That maps the existing design-system contract onto the agent's reasoning loop.

### When the MCP is offline

If Storybook is not running, the agent simply does not see the MCP tools and falls back to reading source files directly. The fallback works (it is what we did before the MCP existed) but is slower per query and easier to drift on. The pragmatic rule: start Storybook before kicking off an agent-driven UI session, leave it running in the background.

## Adding a token to the design system

1. Add the raw value to `:root` in `src/mainview/index.css` as a CSS custom property.
2. Bridge it to Tailwind in the `@theme inline` block right below.
3. Use the generated utility in JSX (`bg-<name>`, `text-<name>`, etc.).

Naming follows shadcn-style unprefixed semantic names (`--primary`, `--foreground`, `--muted`). For dark-mode variants, add an override under `[data-theme="dark"]`.

## Adding an RPC method

Both sides import from `shared/rpc.ts`:

1. Add the method shape under either `bun.requests` (renderer calls bun) or `webview.messages` (bun pushes to renderer).
2. Implement the handler:
   - Bun side → `BrowserView.defineRPC<AppRPCSchema>({ handlers: { requests: { ... } } })` in `src/bun/index.ts`.
   - Renderer side → `Electroview.defineRPC<AppRPCSchema>({ handlers: { messages: { ... } } })` in `src/mainview/lib/electrobun.ts` (use the `onSetupStateChanged` / `onBackendLog` listener-registry pattern for messages so multiple subscribers can attach).
3. Call from the renderer: `await electrobun.rpc?.request.<methodName>(params)`. Note the optional chaining — `rpc` may be undefined during very early mount.

## Adding a route

TanStack Router uses file-based routing. Routes live under `src/mainview/routes/`.

- Files prefixed `_shell.` (or under a `_shell/` directory) inherit the shell layout (sidebar + status bar). The `_shell.tsx` file's `beforeLoad` redirects to `/welcome` when `firstRunCompleted` is `false`, so any new shell route is automatically gated.
- Files outside `_shell` (e.g. `welcome/index.tsx`, `welcome/mode.tsx`) render full-bleed without the shell.

Add a new shell route:
```tsx
// src/mainview/routes/_shell.datasets.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/datasets")({
  component: DatasetsRoute,
});

function DatasetsRoute() { /* ... */ }
```

The Tanstack Router Vite plugin regenerates `src/mainview/routeTree.gen.ts` on the next build. Don't edit that file by hand — it's auto-generated and biome-ignored.

## Quality gates

- **Ultracite** — `bun run check` / `bun run fix`. Wraps Biome with the `ultracite/biome/core` preset (see `biome.json`'s `extends`). Vendored shadcn/uitripled directories and the generated route tree are excluded via `biome.json` `files.includes`. The agent-facing rule reference lives at `AGENTS.md` (auto-installed by `ultracite init`).
- **knip** — `bunx knip`. Configured in `knip.json`. Catches dead code, unused exports, missing dependencies. Useful as a periodic audit; not gated on every commit.
- **lefthook** — pre-commit config lives at the monorepo root (`../lefthook.yml`) with `root: cognee-desktop/` scoping so jobs only fire for files under this package. Installed automatically by `bun install` via the `prepare` script (`cd .. && lefthook install`). Runs `ultracite fix` (auto-stages fixes), `ultracite check`, and `tsc --noEmit` on staged files.
- **calm-tone GritQL plugin** — `tools/calm-tone.grit`. Stub for catching emoji + celebratory phrases ("All set!", "Welcome!") in source. Not yet registered in `biome.json`; tune the pattern before turning on.
