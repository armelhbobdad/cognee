# Debugging

The bun process and the renderer have different log paths and different inspection mechanisms.

## Logs

| Source | Where it goes |
| ------ | ------------- |
| **Bun process** (`src/bun/index.ts`) | `console.log` writes to the terminal where you ran `bun run start` / `dev` / `dev:debug`. |
| **Renderer** (`src/mainview/...`) | `console.log` only appears in the renderer DevTools — never in the terminal. Without an inspector attached, renderer logs are dropped. |
| **Python sidecar** (`python/server.py`) | `stdout` and `stderr` from uvicorn are streamed through the bun process to the renderer via the `backendLog` RPC message, where they can be displayed in a UI panel. They do *not* appear in the terminal that ran `bun run start`. |

For lifecycle visibility, the bun process logs `[setup]` and `[lifecycle]` events to the terminal — these are usually enough to see why the app didn't come up.

## Inspecting the renderer

`bun run dev:debug` flips the renderer from the production native engine (WebKitGTK on Linux) to CEF and exposes the Chrome DevTools Protocol on `localhost:9222`.

```bash
pkill -f electrobun
bun run dev:debug
```

Connect via either:

- **`chrome://inspect`** in any Chromium-based browser — auto-discovers via the `localhost:9222/json/list` endpoint and gives you full Chrome DevTools (Elements, Console, Sources with `.ts` source maps, Network, Performance, etc.).
- **[agent-electrobun](https://github.com/Ataraxy-Labs/agent-electrobun)** — CDP CLI tool that attaches to existing targets without navigating away. Best fit for AI-driven validation and scripted UI walks. Usage:
  ```bash
  bun /path/to/agent-electrobun/src/agent-electrobun.ts list
  bun /path/to/agent-electrobun/src/agent-electrobun.ts --target shell snapshot -i
  bun /path/to/agent-electrobun/src/agent-electrobun.ts --target shell screenshot
  ```

CEF and WebKitGTK render slightly differently — fonts, scrollbar styling, focus-ring rendering. Visual sign-off should always include a final pass on the production renderer (`bun run start`), even after CEF-side validation is green.

## Inspecting the Python sidecar

The sidecar runs at `http://127.0.0.1:${BACKEND_PORT}` where `BACKEND_PORT` is discovered at app startup (default base 8765, falls back if taken).

The actual port is logged to the terminal as `[setup] sidecar ready on http://127.0.0.1:<port>` once it comes up.

Probe directly:
```bash
curl http://127.0.0.1:8765/health
# {"status":"healthy","service":"cognee-desktop-sidecar"}
```

Or via the in-app `/dev` route — open the renderer, navigate to `#/dev`, click **Probe /health**.

## Inspecting the config file

User configuration lives at `~/.config/cognee-desktop/config.json` (XDG-compliant; honours `$XDG_CONFIG_HOME`). After clicking **Continue with Local** through the welcome flow, this file is created with:

```json
{
  "firstRunCompleted": true
}
```

To reset to first-run state:
```bash
rm ~/.config/cognee-desktop/config.json
```

To wipe the Python venv too (forces a full re-bootstrap):
```bash
rm -rf ~/.cognee-desktop/python ~/.cognee-desktop/python-src
```

## Reviewing components in isolation (Storybook)

For UI changes that don't need the full Electrobun shell + Python sidecar (most of them), Storybook is the fastest feedback loop.

```bash
bun storybook
# http://localhost:6006
```

Each story renders one component on a centred canvas with three side panels:

- **Controls** — toggle props live (string fields, selects, booleans).
- **Accessibility** — axe-core runs against the rendered DOM on every story; failures appear as red badges on the tab.
- **Interactions** — `play` functions execute on render and surface PASS / FAIL inline. The Interactions tab counter shows how many assertions ran.

Storybook respects the `data-theme` attribute via `withThemeByDataAttribute`, so the **Themes** toolbar toggle flips the same attribute the production renderer's `theme-provider.tsx` reads. Use it to spot-check dark visuals while building components, even though dark mode is a v0.2 ship target.

The Storybook canvas does NOT instantiate the Electrobun bridge, the Zustand store, or the Python sidecar. Components that depend on those should accept the relevant state via props and let their stories supply mocks. Adding shared decorators for store / RPC mocks is deferred until a story actually needs them.

## Confirming what renderer is active

From the launcher log (terminal output of `bun run start` / `dev` / `dev:debug`):
- `Using GTK-only native wrapper for Linux` → WebKitGTK is active (production renderer).
- `Initializing CEF` / `Loading libcef` → CEF is active (debug renderer).

Or check the listening ports:
- Port `9222` listening → CEF + CDP available.
- Port `9222` quiet → no CDP; relaunch with `bun run dev:debug` if you need it.
