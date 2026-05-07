# Troubleshooting

Concrete gotchas and their fixes. Each entry includes the symptom, the root cause, and the resolution applied (or workaround).

## Routes show "Not Found" on fresh launch

**Symptom:** App boots, page renders the TanStack Router default 404 (just the text "Not Found").

**Cause:** Electrobun loads the renderer over `views://mainview/index.html`. Browser-history routing reads `window.location.pathname` which is `/index.html`, not `/`, so the route tree's `/` entry never matches.

**Fix (already applied):** `src/mainview/index.tsx` uses `createHashHistory()` instead of the default browser history. Hash routing ignores the pathname and reads the URL fragment, so `views://mainview/index.html#/welcome` correctly resolves to the welcome route.

If you ever swap to `createBrowserHistory()`, you'll re-introduce this bug.

## React error #527 in CEF, but renderer works in WebKitGTK

**Symptom:** App is blank in CEF (`bun run dev:debug`) but renders correctly in the default WebKitGTK launcher. Console shows `Error: Minified React error #527; visit https://react.dev/errors/527?args[]=19.2.5&args[]=19.2.3`.

**Cause:** `react` and `react-dom` are out of lockstep. React's renderer enforces an exact-match version invariant against React itself; CEF/V8 14.5 throws on mismatch, while older WebKit/JSC silently tolerated it.

**Fix:** Pin `react` and `react-dom` to the same exact version in `package.json`. Bun's resolver doesn't enforce React's lockstep convention — no tool does, it's a React-specific runtime check. After any `bun add` that touches one but not the other, re-pin manually:
```bash
jq '.version' node_modules/react/package.json node_modules/react-dom/package.json
# both should print the same version
```

A future `syncpack` rule could enforce this in CI. Worth doing as the project grows.

## `max-w-xl` resolves to 32px instead of 576px

**Symptom:** Tailwind containers shrink to a tiny width; text wraps every word onto its own line; layout looks broken.

**Cause:** Tailwind 4's `max-w-{name}` utility reads from the `--spacing-{name}` namespace (NOT `--container-{name}`). The brand tokens map `--spacing-xl` to a small value (2 rem = 32px) intended for component padding/gap, not content max-widths.

**Fix:** Use arbitrary values for content-container max-widths:
```tsx
<div className="max-w-[36rem]">  // not max-w-xl
<p className="max-w-[28rem]">    // not max-w-md
```

Don't try to fix this by adding `--container-{name}` tokens — Tailwind 4 only consults that namespace for the `container` utility's breakpoint behaviour, not for `max-w-`.

If you find yourself using the same arbitrary value in many places, define a project-specific token under `:root` (e.g. `--w-content-narrow: 28rem`) and reference it: `max-w-[var(--w-content-narrow)]`.

## Sidecar starts but renderer can't reach it

**Symptom:** Terminal shows `[setup] sidecar ready on http://127.0.0.1:8765` but `backendRequest` from the renderer returns `{ status: 503, ... }` or a network error.

**Cause:** Almost always one of:
- Stale `setupState` in the renderer's store — the `setupStateChanged` message arrived before the listener was attached, so the store still thinks `backendRunning: false`. Fix by calling `electrobun.rpc?.request.getSetupState({})` on mount in addition to subscribing.
- The bun process has the wrong port. Check `backendPort` in the bun-process state via the `/dev` route's "Probe /health" button.
- A previous run left a Python process bound to the chosen port. `pkill -f cognee-desktop/python-src` and relaunch.

## `bun run start` fails with "Cannot resolve entry module index.html"

**Symptom:** Vite build aborts with `[UNRESOLVED_ENTRY] Error: Cannot resolve entry module index.html`.

**Cause:** Running from the wrong working directory. Vite's config sets `root: "src/mainview"` and resolves `index.html` relative to that root from the *current working directory*. If you `cd` somewhere under `src/` before running, the relative path breaks.

**Fix:** Always run scripts from the `cognee-desktop/` project root:
```bash
cd /path/to/cognee-desktop
bun run start
```

## App icon shows the default GTK icon in dev mode

**Symptom:** The taskbar / window decoration shows a generic GTK app icon instead of the cognee logo. Production `.deb` builds are unaffected.

**Cause:** Electrobun's Linux launcher binary hardcodes `WM_CLASS=ElectrobunKitchenSink-dev` (a leftover from their example app) and does NOT set the GTK window's `_NET_WM_ICON` X11 property at runtime. The icon machinery only kicks in for installed `.deb` / AppImage builds where the desktop entry gets registered with the OS.

**Workaround for dev visibility** (one-time, per-developer):
```bash
mkdir -p ~/.local/share/applications ~/.local/share/icons/hicolor/512x512/apps
cp cognee-desktop/assets/icon.png \
   ~/.local/share/icons/hicolor/512x512/apps/cognee-desktop.png

cat > ~/.local/share/applications/cognee-desktop-dev.desktop <<'EOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=Cognee Desktop (dev)
Icon=cognee-desktop
StartupWMClass=ElectrobunKitchenSink-dev
NoDisplay=true
Categories=Utility;Application;
EOF

update-desktop-database ~/.local/share/applications
gtk-update-icon-cache -f ~/.local/share/icons/hicolor
```

The `StartupWMClass` value matches Electrobun's hardcoded class, so your DE associates the running window with this entry's icon. Reversible at any time by removing the two files.

This workaround is unnecessary for production: the `.deb` installer writes its own desktop entry to system locations using the bundled `appIcon.png` (which Electrobun copies into the build at `Resources/appIcon.png` via the `linux.icon` config in `electrobun.config.ts`).

**Long-term fix:** file an upstream issue against Electrobun: *Linux launcher hardcodes `WM_CLASS` to "ElectrobunKitchenSink-dev" instead of reading `app.name` from `electrobun.config.ts`.*

## Window closes immediately on launch

**Symptom:** App window appears for a fraction of a second then closes. Terminal shows `[lifecycle] window close — graceful shutdown` followed by `[lifecycle] before-quit safety net`.

**Cause:** Usually one of:
- Headless / no-display environment (running over SSH without X forwarding, or in a container without X11).
- A test harness or external `pkill` killed the process tree.
- An X11 GLX initialisation failure that the GTK event loop interpreted as window-close.

**Fix:** This is usually environmental. Check:
- `echo $DISPLAY` — should print something like `:0` or `:1`. Empty means no display.
- `glxinfo | head -5` — should print GLX version info. If it errors, GLX isn't available.
- Look for `X11 Error: GLXBadWindow` in the launcher log — common on minimal Linux installs without OpenGL drivers; usually harmless but in extreme cases triggers window close.

For headless validation, use the renderer paths in [docs/debugging.md](debugging.md) instead of relying on the visible window.

## Hot-reload doesn't pick up renderer changes

**Symptom:** You edit a file under `src/mainview/`, but the running app shows the old version even with `electrobun dev --watch` running.

**Cause:** `electrobun dev --watch` watches the bun-process source and the `dist/` directory (which Vite produces), but it doesn't trigger Vite to rebuild. Without a Vite rebuild, `dist/` doesn't change and electrobun's watch sees nothing.

**Fix:** Either:
- Use `bun run dev:hmr` which runs Vite's dev server concurrently — full HMR, no manual rebuilds.
- Or run `bunx vite build` after edits — electrobun's watch sees the `dist/` change and rebuilds + relaunches.

If you specifically want auto-rebuild without HMR, add `vite build --watch` as a concurrent process to your dev script.

## Storybook startup logs "unable to find package.json for radix-ui"

**Symptom:** `bun storybook` succeeds and the dev server starts on port 6006, but the startup log includes one warning line: `▲  unable to find package.json for radix-ui`.

**Cause:** Storybook scans every dependency at startup looking for a `storybook` field in each package's `package.json` (used to declare cross-project Storybook composition refs). The `radix-ui` 1.4.3 umbrella package's `exports` field declares `"."` and `"./*"` paths but does not expose `"./package.json"`, so the resolver throws when Storybook tries to read it. Storybook's catch block silences one specific Node error code (`ERR_PACKAGE_PATH_NOT_EXPORTED`) but the resolver in this configuration appears to throw a slightly different code, so the warning falls through to the log.

**Functional impact:** none. Composition refs are an opt-in feature for embedding sibling Storybooks; cognee-desktop does not use this. Components, stories, controls, a11y, and addons are unaffected.

**Fix:** none required for v0.1. The clean fix is upstream — either Storybook widening the catch block, or the `radix-ui` package adding `"./package.json": "./package.json"` to its exports field. Most popular packages on the modern exports convention include this entry defensively. If the warning becomes annoying, `bun patch radix-ui` lets you commit a one-line patch file that adds the missing entry, but the maintenance cost outweighs the cosmetic benefit at v0.1 scale.

## Graph Canvas hangs on first render at high node count

**Symptom:** A Storybook story or app surface that renders the Graph Canvas with several thousand nodes appears to freeze the page; the cluster shows up as a tiny dot in the centre of the canvas instead of filling it.

**Cause:** `react-force-graph-3d` defaults `cooldownTime` to 15 seconds and `cooldownTicks` to `Infinity`. At ~5000 nodes the d3 force simulation tick cost compounds and the main thread stays pinned for the full cooldown. The default camera position is also calibrated for small graphs (z ≈ 300), so once the simulation does settle the cluster sits far outside the camera frustum.

**Fix (already applied in `src/mainview/components/graph-canvas.tsx`):** the component caps `cooldownTicks` and `cooldownTime` for graphs above ~1500 nodes (4 seconds, 60 ticks) and wires `onEngineStop` to call `zoomToFit(800, 40)` so the camera frames the cluster automatically. Above ~2000 nodes the visualisation is fundamentally a dense ball regardless of perf — knowledge-graph exploration past that scale needs parent-level pagination or filtering, not bigger canvases.

If you reuse `<ForceGraph3D>` directly elsewhere, copy the cooldown caps and `onEngineStop` pattern from `graph-canvas.tsx`. Stable callback references via `useCallback` also matter: the underlying library re-evaluates color callbacks per render, so unstable refs trigger O(N) work per state change.

## Sidecar fails to start with "uv venv failed"

**Symptom:** Setup ladder stops at the Python step with the error "Failed to set up Python environment".

**Cause:** Most commonly:
- An incomplete venv at `~/.cognee-desktop/python/.venv` from a previously-aborted run. `uv venv` (since uv 0.11) refuses to overwrite an existing venv unless `--clear` is passed.
- uv is too old. The minimum tested is uv 0.9; recent breaking changes in uv 0.11 around index resolution may surface here.

**Fix:** Wipe and retry:
```bash
rm -rf ~/.cognee-desktop/python
bun run start
```

If it still fails, run `uv venv --python 3.11 ~/.cognee-desktop/python/.venv` manually to see uv's actual error message — the bun-process abstraction loses the underlying error detail.
