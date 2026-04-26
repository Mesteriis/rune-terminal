# rune-terminal roadmap

> Pre-release. No `1.0.0` has been cut, no release train is active.
> This roadmap is short on purpose — the project is re-centering on a
> clean core + a rewritten frontend, and long parity matrices are no
> longer useful as a source of truth.
>
> The previous auto-generated parity matrix is archived under
> [`history/roadmap-parity-matrix-2026-04-17.md`](./history/roadmap-parity-matrix-2026-04-17.md).
> Do not treat that file as the current plan — many of its `Location:`
> paths (e.g. `frontend/app/*`, `frontend/rterm-api/*`) no longer exist.

## Status legend

- `NOW` — actively worked on in the current slice
- `NEXT` — on deck, scheduled as the next slice
- `LATER` — accepted direction, not yet staffed
- `HOLD` — explicitly out of scope for now

## Focus tracks

### 1. Core runtime (Go)

| Area                | State   | Notes                                                                                                             |
| ------------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| Workspace service   | `NOW`   | snapshot-based, thread-safe, ADR 0005                                                                             |
| Terminal service    | `NOW`   | pty sessions, SSE stream, buffered chunks                                                                         |
| Policy pipeline     | `NOW`   | five stages (ADR 0015); tests per stage needed                                                                    |
| Tool runtime        | `NOW`   | approval state machine, audit hooks                                                                               |
| AI provider backend | `NOW`   | backend-owned provider catalog with Codex CLI, Claude Code CLI, and one narrow OpenAI-compatible HTTP source kind |
| Plugin runtime      | `NOW`   | `rterm.plugin.v1`; manifest tool exposure plus capability allow-list validation                                   |
| Remote / SSH        | `LATER` | ADR 0019, narrow daily-driver path only                                                                           |
| MCP integration     | `LATER` | scaffolding exists; end-to-end wiring deferred                                                                    |

### 2. Transport (Go ↔ Tauri ↔ Frontend)

| Area                                | State  | Notes                                                      |
| ----------------------------------- | ------ | ---------------------------------------------------------- |
| HTTP API (`core/transport/httpapi`) | `NOW`  | 50+ routes on Go 1.22 mux                                  |
| SSE terminal stream                 | `NOW`  | active frontend uses fetch streaming with bearer auth; query-token fallback remains constrained by ADR 0018 |
| Auth token lifecycle                | `NOW`  | terminal stream header auth is active on the frontend path |
| Tauri command surface               | `HOLD` | minimal on purpose (`runtime_info` only)                   |

### 3. Frontend (React + Effector)

The frontend is being **rewritten**, not migrated. Reference baselines
from any previous fork are historical inspiration only.

| Area                                                              | State   | Notes                                                                                                                                                                                                                       |
| ----------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layered architecture (tokens → primitives → components → widgets) | `NOW`   | see `frontend/docs/ui-architecture.md`                                                                                                                                                                                      |
| Primitives library                                                | `NOW`   | stable, contract documented                                                                                                                                                                                                 |
| Commander widget                                                  | `NOW`   | backend-backed read/write path is live; remaining parity work is about removing leftover frontend-owned seams rather than introducing the first HTTP wiring                                                                 |
| Terminal widget                                                   | `NOW`   | xterm surface consumes backend snapshots plus real terminal SSE                                                                                                                                                             |
| AI panel widget                                                   | `NEXT`  | chrome exists; shell settings modal now hosts CLI + narrow HTTP provider management, and the main AI panel now exposes provider/model selection plus widget-context selection while deeper runtime/tooling UX still remains |
| Dockview workspace shell                                          | `NOW`   | layout + localStorage persistence                                                                                                                                                                                           |
| Other widgets                                                     | `NOW`   | added continuously during the rewrite                                                                                                                                                                                       |
| Linter (ESLint / Biome)                                           | `NOW`   | ESLint + `tsc --noEmit` gate the active frontend; Biome is not in use                                                                                                                                                       |
| Storybook / primitive viewer                                      | `LATER` | helpful once primitives settle                                                                                                                                                                                              |

### 4. Desktop shell (Tauri)

| Area                         | State  | Notes                                                                                                                                              |
| ---------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidecar spawn + ready file   | `NOW`  | `apps/desktop/src-tauri/src/main.rs`                                                                                                               |
| Auth token via env           | `NOW`  | `RTERM_AUTH_TOKEN`, 40-char alphanumeric                                                                                                           |
| CSP hardening                | `NOW`  | Tauri config uses an explicit local-runtime CSP instead of `csp: null`                                                                             |
| Graceful shutdown of sidecar | `NOW`  | explicit handling is live and the shutdown policy path now has targeted Rust coverage; broader desktop crash recovery stays in the hardening track |

### 5. Plugins

| Area                                | State   | Notes                                |
| ----------------------------------- | ------- | ------------------------------------ |
| JSON-line stdio protocol            | `NOW`   | `core/plugins/protocol.go`           |
| Go reference plugin                 | `NOW`   | `plugins/example/plugin.go`          |
| Non-Go reference (Python/Node)      | `LATER` | proves language-neutrality           |
| Capability declaration in handshake | `NOW`   | plugin-requested resources are checked against the bound allow-list |
| Sandbox / permission model doc      | `NEXT`  | ADR + SECURITY note                  |

### 6. Infrastructure

| Area                       | State   | Notes                                                 |
| -------------------------- | ------- | ----------------------------------------------------- |
| CI (GitHub Actions)        | `NOW`   | `.github/workflows/ci.yml` covers frontend, Go, desktop check and secret scan |
| `make validate` coverage   | `NOW`   | local gate remains; CI mirrors the same major checks                          |
| Go test coverage reporting | `NOW`   | CI emits `coverage.out` as an artifact                                        |
| Secret scanning            | `NOW`   | CI includes a gitleaks job                                                    |
| Release pipeline           | `LATER` | out of scope until core + frontend wire up end-to-end |

## Out of scope for now (`HOLD`)

- broad TideTerm or Wave Terminal feature parity
- full builder / proxy / preview-zoo surfaces
- standalone TideTerm-style proxy server UI/runtime and internal AI proxy routing
- advanced SSH auth / topology beyond the narrow `.ssh/config` import path
- Windows-first support
- plugin marketplace / discovery UX

## How to update this roadmap

- keep the tables short — one row per recognizable area
- move long narratives into the domain docs, not here
- archive retired snapshots under `history/` with an explicit date in
  the filename, and link to them from the top of this file
