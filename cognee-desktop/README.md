# Cognee Desktop

Local-first desktop client for [cognee](https://github.com/topoteretes/cognee) — turn documents into a knowledge graph you can see, search, and trust. Built with [Electrobun](https://electrobun.dev/) and a bundled Python sidecar.

> **Status:** pre-release. Linux-first; v0.1 ships as `.deb` + AppImage. macOS and Windows are deferred to a later milestone.

## Quick start

Prerequisites:
- [Bun](https://bun.sh) ≥ 1.3
- [uv](https://docs.astral.sh/uv/) — auto-installed at app launch if missing

```bash
bun install
bun run start
```

The first launch downloads Electrobun's Linux native binaries (~50 MB) and creates a Python virtual environment at `~/.cognee-desktop/python/.venv`. Subsequent launches are fast.

## Documentation

| Topic | File |
| ----- | ---- |
| Process model + folder layout + key decisions | [docs/architecture.md](docs/architecture.md) |
| Dev scripts, watch + HMR modes, prerequisites | [docs/development.md](docs/development.md) |
| Renderer + bun-process + sidecar inspection | [docs/debugging.md](docs/debugging.md) |
| Python sidecar lifecycle, config, runtime | [docs/sidecar.md](docs/sidecar.md) |
| Known gotchas + workarounds | [docs/troubleshooting.md](docs/troubleshooting.md) |

## Component reference (Storybook)

Every shipped UI component has a colocated `*.stories.tsx` next to its source. Run the local Storybook to browse them, change props through the Controls panel, and watch the Accessibility panel run axe-core on every story:

```bash
bun storybook
# opens http://localhost:6006
```

Stories cover three categories: **Components/** (primitives), **Patterns/** (composite stateful patterns), and **Visualizations/** (the 3D knowledge-graph canvas). See [docs/development.md](docs/development.md#adding-a-story) for the conventions when authoring new stories.

## License

See the parent cognee repository.
