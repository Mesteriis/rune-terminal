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

| Area | State | Notes |
| --- | --- | --- |
| Workspace service | `NOW` | snapshot-based, thread-safe, ADR 0005 |
| Terminal service | `NOW` | pty sessions, SSE stream, buffered chunks |
| Policy pipeline | `NOW` | five stages (ADR 0015); tests per stage needed |
| Tool runtime | `NOW` | approval state machine, audit hooks |
| AI provider backend | `NOW` | backend-owned provider catalog with Codex CLI, Claude Code CLI, and one narrow OpenAI-compatible HTTP source kind |
| Plugin runtime | `NEXT` | `rterm.plugin.v1`; capability declaration needs fleshing out |
| Remote / SSH | `LATER` | ADR 0019, narrow daily-driver path only |
| MCP integration | `LATER` | scaffolding exists; end-to-end wiring deferred |

### 2. Transport (Go ↔ Tauri ↔ Frontend)

| Area | State | Notes |
| --- | --- | --- |
| HTTP API (`core/transport/httpapi`) | `NOW` | 50+ routes on Go 1.22 mux |
| SSE terminal stream | `NOW` | query-token MVP (ADR 0018) |
| Auth token lifecycle | `NEXT` | move SSE off query token onto header when frontend rewires |
| Tauri command surface | `HOLD` | minimal on purpose (`runtime_info` only) |

### 3. Frontend (React + Effector)

The frontend is being **rewritten**, not migrated. Reference baselines
from any previous fork are historical inspiration only.

| Area | State | Notes |
| --- | --- | --- |
| Layered architecture (tokens → primitives → components → widgets) | `NOW` | see `frontend/docs/ui-architecture.md` |
| Primitives library | `NOW` | stable, contract documented |
| Commander widget | `NOW` | running on a fake client under `features/commander/model/`; real HTTP wiring is the next milestone |
| Terminal widget | `NEXT` | xterm surface mounted; needs to consume SSE from the real core |
| AI panel widget | `NEXT` | chrome exists; shell settings modal now hosts CLI + narrow HTTP provider management, and the main AI panel now exposes provider/model selection plus widget-context selection while deeper runtime/tooling UX still remains |
| Dockview workspace shell | `NOW` | layout + localStorage persistence |
| Other widgets | `NOW` | added continuously during the rewrite |
| Linter (ESLint / Biome) | `NEXT` | currently only `tsc --noEmit` |
| Storybook / primitive viewer | `LATER` | helpful once primitives settle |

### 4. Desktop shell (Tauri)

| Area | State | Notes |
| --- | --- | --- |
| Sidecar spawn + ready file | `NOW` | `apps/desktop/src-tauri/src/main.rs` |
| Auth token via env | `NOW` | `RTERM_AUTH_TOKEN`, 40-char alphanumeric |
| CSP hardening | `NEXT` | `csp: null` must be replaced before any public release |
| Graceful shutdown of sidecar | `NEXT` | explicit handling + test |

### 5. Plugins

| Area | State | Notes |
| --- | --- | --- |
| JSON-line stdio protocol | `NOW` | `core/plugins/protocol.go` |
| Go reference plugin | `NOW` | `plugins/example/plugin.go` |
| Non-Go reference (Python/Node) | `LATER` | proves language-neutrality |
| Capability declaration in handshake | `NEXT` | plugin requests resources explicitly |
| Sandbox / permission model doc | `NEXT` | ADR + SECURITY note |

### 6. Infrastructure

| Area | State | Notes |
| --- | --- | --- |
| CI (GitHub Actions) | `NEXT` | repository has no `.github/` yet |
| `make validate` coverage | `NOW` | runs locally; needs CI enforcement |
| Go test coverage reporting | `NEXT` | `-coverprofile` in CI |
| Secret scanning | `NEXT` | part of CI |
| Release pipeline | `LATER` | out of scope until core + frontend wire up end-to-end |

## Out of scope for now (`HOLD`)

- broad TideTerm or Wave Terminal feature parity
- full builder / proxy / preview-zoo surfaces
- standalone TideTerm-style proxy server UI/runtime and internal AI proxy routing
- `.ssh/config` import workflows and advanced SSH auth
- Windows-first support
- plugin marketplace / discovery UX

## How to update this roadmap

- keep the tables short — one row per recognizable area
- move long narratives into the domain docs, not here
- archive retired snapshots under `history/` with an explicit date in
  the filename, and link to them from the top of this file
