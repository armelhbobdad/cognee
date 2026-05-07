# Python sidecar

The bundled Python FastAPI app under `python/`. The bun process owns its lifecycle.

## What lives where

```
cognee-desktop/python/         # Source-of-truth (committed)
  requirements.txt             # fastapi, uvicorn[standard], pydantic
  server.py                    # FastAPI app + uvicorn entrypoint

~/.cognee-desktop/             # Per-user runtime state (gitignored, runtime-created)
  python/.venv/                # uv-managed venv, Python 3.11 standalone
  python-src/                  # Copy of `python/` made writable for `uv pip install`
                               # (the bundled python/ may be read-only on signed builds)

~/.config/cognee-desktop/      # Config file (XDG-compliant)
  config.json                  # { firstRunCompleted: boolean }
```

## Setup pipeline

`runSetup()` in `src/bun/index.ts` runs four gates sequentially, short-circuiting on the first failure. Each gate publishes a `SetupState` message to the renderer so the UI can show progress.

1. **`uvInstalled`** — `which uv`, fall back to `~/.local/bin/uv` or `/usr/local/bin/uv`. If none, run `curl -LsSf https://astral.sh/uv/install.sh | sh`.
2. **`pythonInstalled`** — `uv venv --python 3.11 ~/.cognee-desktop/python/.venv`. uv downloads a Python 3.11 standalone build if the host doesn't have one. The user does not need to provision Python.
3. **`depsInstalled`** — copy `python/requirements.txt` + `python/server.py` to `~/.cognee-desktop/python-src/`, then `uv pip install -r requirements.txt --python <venv>/bin/python` from that directory. Falls back to raw `pip install` if uv-pip fails.
4. **`backendRunning`** — `findFreePort(8765)` → spawn the venv's Python on `python-src/server.py` → poll `GET /health` for up to 30 seconds at 1-second intervals.

## Spawn environment

`startBackend()` sets these environment variables on the spawned Python process:

| Var | Value | Why |
| --- | ----- | --- |
| `PORT` | the discovered free port | The server's `if __name__ == "__main__":` block reads this. |
| `PYTHONUNBUFFERED` | `1` | So stdout/stderr stream live to the bun process for log forwarding. |
| `SSL_CERT_FILE` | `certifi.where()` from the venv | The uv-installed standalone Python doesn't find the system CA bundle on most distros; without this, HTTPS calls from the sidecar (e.g. to model providers) fail. |
| `REQUESTS_CA_BUNDLE` | same as `SSL_CERT_FILE` | Same reason, for `requests`-based code. |

The path to certifi is resolved by running `python -c "import certifi; print(certifi.where())"` against the venv before spawn.

## Shutdown

Two kill switches, both required:

```ts
mainWindow.on("close", async () => {
  await stopBackend();   // SIGTERM, then SIGKILL after 3s if still alive
  Utils.quit();
});

Electrobun.events.on("before-quit", () => {
  if (backendProcess) backendProcess.kill(9);  // safety net for Cmd+Q / app-quit-from-menu
});
```

The `close` handler runs the graceful path. The `before-quit` handler is the safety net for paths that skip `close` entirely (Cmd+Q, dock-quit, OS shutdown signal). Both must be wired — relying on either alone leaks zombie Python processes.

## RPC surface

The renderer never talks to the sidecar directly. All requests flow through the bun process:

```ts
// in renderer
const response = await electrobun.rpc?.request.backendRequest({
  method: "GET",
  path: "/health",
});
// response: { status: 200, data: { status: "healthy", service: "..." } }
```

The bun-side handler resolves to `http://127.0.0.1:${backendPort}${path}`, fetches it, parses the response (JSON or text fallback), and returns `{ status, data }`. This keeps port discovery and lifecycle owned by the bun process.

If the sidecar isn't running, `backendRequest` returns `{ status: 503, data: { error: "backend not running" } }` — the renderer should treat 503 as "still booting, try again later" rather than a hard error.

## Customising the sidecar

To extend the FastAPI surface for new features:

1. Add routes / models to `python/server.py`.
2. Add dependencies to `python/requirements.txt` (pin tightly — FastAPI is still 0.x and minor bumps can break).
3. Bump the version comment at the top of `server.py` if the contract changes.

The next launch picks up changes — the bun process re-copies `python/` to `~/.cognee-desktop/python-src/` and re-runs `uv pip install` on every setup. uv's cache makes incremental dep installs fast.

## Resetting to a clean state

```bash
# Kill anything still running
pkill -f electrobun
pkill -f cognee-desktop/python-src

# Reset config (forces re-running the welcome flow)
rm ~/.config/cognee-desktop/config.json

# Reset the Python venv (forces re-bootstrap on next launch)
rm -rf ~/.cognee-desktop/python ~/.cognee-desktop/python-src

# Relaunch
bun run start
```
