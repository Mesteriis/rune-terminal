# rune-terminal (`rterm`)

`rune-terminal` is a clean-room rethinking of a programmer's workstation —
a modern terminal, a dual-pane file manager, an AI surface and a plugin
system, built on a new architectural center:

- `Tauri` as the desktop shell and packaging layer
- `Go` as the primary runtime, backend and orchestration core
- `React + TypeScript` as the frontend workspace UI
- `Rust` only for the Tauri shell boundary

Short names used across the repository:

- product name: **rune terminal**
- short name / binary: **`rterm`**
- Go module: `github.com/Mesteriis/rune-terminal`

The rewrite is intentionally not a fork-shaped refactor. It takes the
product ideas that matter from earlier projects and rebuilds them on a
cleaner runtime, transport and state model.

> **Pre-release.** No `1.0.0` has been cut and the repository is not
> running a main-ready / release-train workflow yet. The Go core is the
> most stable layer; the frontend (`frontend/src/`) is being rewritten
> and new widgets are added continuously. See
> [`docs/workflow/roadmap.md`](docs/workflow/roadmap.md) and
> [`docs/workflow/known-limitations.md`](docs/workflow/known-limitations.md)
> for the current state.

## Lineage

`rune-terminal` exists with respect for the lineage it grew out of:

1. **Wave Terminal** introduced strong product ideas — terminal +
   workspace composition, block-oriented workflows, local and remote
   session integration, AI as a first-class direction.
2. **TideTerm** explored those ideas further in a real fork and made the
   trade-offs much more visible in practice.

Relevant historical repositories:

- Wave Terminal: `https://github.com/wavetermdev/waveterm`
- TideTerm: `https://github.com/sanshao85/tideterm`

`rune-terminal` is not a denial of either project. It is a deliberate
next step: keep the good ideas, drop the architectural habits that were
becoming too expensive to evolve.

## Why the rewrite

- product semantics should not be trapped inside transport plumbing
- terminal runtime, workspace state, tool execution and policy need
  clear boundaries
- AI features need a stable platform, not an ever-growing command bucket
- security, approvals, trusted allowlists, ignore rules and audit cannot
  be bolted on later
- a modern desktop shell should be lighter and cleaner than the previous
  Electron-based stack

## What `rune-terminal` is for

A terminal-centered workspace platform with:

- long-lived terminal and workspace primitives
- local-first runtime semantics with room for remote session models
- policy-aware AI tooling from day one
- explicit trust and secret-protection controls
- a codebase that can evolve without collapsing into monolithic
  transport and handler layers

## Design principles

1. **Core truth lives in the backend.** Terminal, workspace, policy and
   tool execution semantics belong in the Go core.
2. **Transport is an adapter, not the product model.** HTTP, SSE and
   Tauri integration expose the platform; they do not define it.
3. **Security is part of the foundation.** Capabilities, approvals,
   trusted rules, ignore rules and audit are baseline features.
4. **Small modules beat central buckets.** Avoid giant files, giant
   registries and giant handler surfaces.
5. **AI consumes the platform, it does not own it.** Tools, policy and
   runtime contracts must stay stable outside of any single AI
   integration.
6. **Local-first, remote-ready.** Start with clean local semantics, then
   extend to SSH and other runtime targets without changing the model.
7. **Architecture decisions must be explicit.** Important trade-offs
   live in ADRs, not in unspoken code drift.

## Repository layout

- `apps/desktop/` — Tauri shell and native app host
- `cmd/rterm-core/` — Go entrypoint for the runtime process
- `core/` — domain / runtime modules (workspace, terminal, tool runtime,
  policy, audit, transport, plugins, agent, conversation, execution)
- `frontend/` — React + TypeScript UI source (`frontend/src/` is the
  active tree; earlier drafts under `frontend/app/*` or
  `frontend/rterm-api/*` are gone)
- `plugins/` — reference plugins for the `rterm.plugin.v1` protocol
- `internal/ids/` — crypto/rand ID and token helpers
- `scripts/` — developer wrappers (build, run, guards)
- `docs/` — architecture docs, ADRs, workflow notes and validation
- `frontend/docs/` — frontend-local docs (evolves with the rewrite)

## Prerequisites

Required toolchain:

- Go `1.26+`
- Node `24+`
- npm `11+`
- Rust stable with `cargo`

Desktop runtime requirements:

- macOS: Xcode Command Line Tools (`xcode-select --install`)
- Linux: the normal Tauri / WebKitGTK desktop prerequisites for your
  distro

Launch note:

- This repository uses the local npm Tauri CLI from `@tauri-apps/cli`.
- `cargo tauri` is not required and is not the supported dev entrypoint.
- The supported command is `npm run tauri:dev`.

`scripts/go.sh` resolves the Go binary without assuming a specific PATH.

## Development

Install dependencies and build the Go sidecar used by the Tauri shell:

```bash
npm install
npm --prefix frontend install
npm run build:core
```

Launch the app:

```bash
npm run tauri:dev
```

Or use the Makefile wrapper:

```bash
make run
```

What `npm run tauri:dev` does:

- fail-fast checks for `npm`, `cargo`, `curl`, macOS CLT, local Tauri
  CLI, frontend deps and the built Go core binary
- starts the frontend Vite dev server on `127.0.0.1:5173` if it is not
  already running
- launches the Tauri shell against
  `apps/desktop/src-tauri/tauri.conf.json`

### Browser-only local split run

If you want to run the active frontend and backend outside Tauri, the
supported split dev loop is:

```bash
make dev
```

What `make dev` does:

- starts the standalone Go core behind `air` for live rebuild/restart on
  Go source changes
- starts the frontend with the normal Vite dev server / React refresh
- keeps both processes in one long-lived terminal session so browser
  smoke tests can reuse the same backend/frontend pair instead of
  restarting them between runs

If you want the split pieces separately, keep using:

```bash
make run-backend-watch
make run-frontend
```

Default local addresses:

- frontend: `http://127.0.0.1:5173`
- backend API: `http://127.0.0.1:8090`
- auth token shared by both targets: `runa-local-dev-token`
  (historical default, safe to override)
- backend-only task control token: `runa-local-dev-task-token`
  (used by task worker control routes; not exposed to the frontend)

You can override those defaults via `make` variables when needed:

```bash
make LOCAL_BACKEND_PORT=8091 LOCAL_AUTH_TOKEN=my-dev-token run-backend-watch
make LOCAL_BACKEND_URL=http://127.0.0.1:8091 LOCAL_AUTH_TOKEN=my-dev-token run-frontend
make LOCAL_BACKEND_PORT=8091 LOCAL_AUTH_TOKEN=my-dev-token dev
```

If you need to override task-worker control separately, set
`LOCAL_TASK_CONTROL_TOKEN=...` on `make run-backend`, `make run-backend-watch`,
or `make dev`.

The first `make dev` / `make run-backend-watch` run bootstraps a local
copy of `air-verse/air` into `tmp/tools/air` so it does not depend on a
global `air` binary in your `PATH`.

## Launch troubleshooting

If `npm run tauri:dev` fails:

1. Missing Go core binary:

```bash
npm run build:core
```

2. Missing local Tauri CLI or root dependencies:

```bash
npm install
```

3. Missing frontend dependencies:

```bash
npm --prefix frontend install
```

4. Missing Rust toolchain:

```bash
rustup toolchain install stable
```

5. Missing macOS Command Line Tools:

```bash
xcode-select --install
```

Sanity checks:

```bash
npm exec tauri -- --version
cargo --version
```

If you were trying `cargo tauri dev` directly, switch to:

```bash
npm run tauri:dev
```

## Validation

Run the full validation suite:

```bash
npm run validate
```

If you only need to rebuild the Go runtime binary used by the desktop
shell before launching Tauri, run:

```bash
npm run build:core
```

Validation results are recorded under
[`docs/validation/`](docs/validation).

## Key documents

- [Docs index](docs/README.md)
- [Architecture](docs/architecture/system.md)
- [Domain model](docs/architecture/domain-model.md)
- [Terminal architecture](docs/architecture/terminal-architecture.md)
- [Tool runtime](docs/architecture/tool-runtime.md)
- [Policy model](docs/architecture/policy-model.md)
- [Roadmap](docs/workflow/roadmap.md)
- [Known limitations](docs/workflow/known-limitations.md)
- [Agent modes](docs/workflow/agent-modes.md)
- [System prompts](docs/workflow/system-prompts.md)
- [Plugin runtime](docs/plugins/plugin-runtime.md)
- [Plugin protocol](docs/plugins/plugin-runtime-protocol.md)
- [ADRs](docs/architecture/adr)
- [Agent policy (`AGENTS.md`)](AGENTS.md)
