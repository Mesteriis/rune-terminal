# RunaTerminal

`RunaTerminal` is a clean-room rewrite of TideTerm with a new architectural center:

- `Tauri` as the desktop shell and packaging layer
- `Go` as the primary runtime, backend and orchestration core
- `React + TypeScript` as the frontend workspace UI
- `Rust` only for the Tauri shell boundary

The rewrite is intentionally not a fork-shaped refactor. It preserves the product ideas that matter, but not the transport and state-model mistakes that made the old stack hard to evolve.

## Origins

RunaTerminal exists because two things are true at the same time:

1. **Wave Terminal** introduced genuinely strong product ideas:
   - terminal + workspace composition
   - block-oriented workflows
   - local and remote session integration
   - AI as a first-class direction, not an afterthought
2. **TideTerm** explored those ideas further in a real fork and made the trade-offs much more visible in practice.

RunaTerminal should be understood with respect for that lineage.
It is not a denial of the previous projects. It is a deliberate next step built from their lessons.

Relevant upstream and historical repositories:

- Wave Terminal: `https://github.com/wavetermdev/waveterm`
- TideTerm: `https://github.com/sanshao85/tideterm`

## Why RunaTerminal was born

RunaTerminal was born to keep the good ideas while breaking with the parts that were becoming too expensive to evolve.

The rewrite is motivated by a few hard lessons:

- product semantics should not be trapped inside transport plumbing
- terminal runtime, workspace state, tool execution and policy need clear boundaries
- AI features need a stable platform, not an ever-growing command bucket
- security, approvals, trusted allowlists, ignore rules and audit cannot be bolted on later
- a modern desktop shell should be lighter and cleaner than the previous Electron-based stack

In short:

- **Wave Terminal** supplied the original product spark
- **TideTerm** validated and extended that direction in a meaningful fork
- **RunaTerminal** exists to turn those lessons into a cleaner long-lived platform focused on maintainability, security and AI-native workflows

## Why not just continue TideTerm?

TideTerm remains an important predecessor and source of insight, but continuing it indefinitely would keep too much accidental architecture in the critical path.

The decision to start RunaTerminal is based on the belief that some problems are better solved by a clean platform reset than by endless incremental patching.

The most important reasons are:

- too much product meaning was coupled to transport and orchestration details
- too many subsystems were growing around large central files and broad integration surfaces
- policy, trust, secret protection and audit deserved to become first-class platform modules
- the next generation of AI-native tooling needs a cleaner runtime contract than the previous stack could easily provide
- moving from an Electron-centered shell to a Tauri-centered shell is easier to do well in a fresh architecture than as a partial retrofit

This rewrite is not about rejecting TideTerm.
It is about giving the ideas behind it a codebase that can carry them further with less drag.

## What RunaTerminal is for

RunaTerminal is being built as a terminal-centered workspace platform with:

- long-lived terminal and workspace primitives
- local-first runtime semantics
- room for future local and remote session models
- policy-aware AI tooling from day one
- explicit trust and secret-protection controls
- a codebase that can evolve without collapsing into monolithic transport and handler layers

## Project status

RunaTerminal is currently in the **`1.0.0-rc1` release hardening phase**.

What exists today:
- launchable Tauri shell with Go sidecar runtime
- local terminal daily-driver path
- focused remote SSH daily-driver path (intentionally narrow)
- AI conversation through an Ollama-compatible HTTP backend, plus explicit `/run <command>` command execution + explanation
- policy/approval, trust/ignore, and audit visibility in the shell
- release-control docs and validation trail

What does **not** exist yet:
- full TideTerm parity breadth
- broad remote controller semantics
- attachments and streaming AI output
- broad provider orchestration beyond the current Ollama-compatible path
- advanced SSH auth and `.ssh/config` import workflows
- plugin ecosystem work

The current goal is not feature expansion.
The current goal is honest RC quality for daily-driver workflows.

## Current priorities

- harden launch, local terminal, remote shell, and `/run` UX paths
- keep approval/policy behavior explicit and stable
- tighten release-doc truthfulness and known limitations
- rerun full release-oriented validation (`active-path lint` + `build/tests/validate/tauri + smoke`) while tracking full-frontend lint debt explicitly
- close only release blockers, not parity breadth

## Non-goals for `1.0.0`

The first iterations of RunaTerminal are intentionally narrow. These are **not** immediate goals:

- full parity with TideTerm or Wave Terminal
- Windows-first support
- broad plugin architecture before the core runtime stabilizes
- premature UI complexity
- large feature buckets such as every builder/proxy/MCP capability from the old stack
- unrestricted automation without policy, trust and audit controls

If a feature threatens architectural clarity in the early phase, the default answer should be to postpone it.

## Design principles

RunaTerminal should stay anchored to a small set of explicit design rules:

1. **Core truth lives in the backend**
   - terminal, workspace, policy and tool execution semantics belong in the Go core
2. **Transport is an adapter, not the product model**
   - HTTP, SSE and Tauri integration should expose the platform, not define it
3. **Security is part of the foundation**
   - capabilities, approvals, trusted rules, ignore rules and audit are baseline features
4. **Small modules beat central buckets**
   - avoid giant files, giant registries and giant handler surfaces
5. **AI consumes the platform, it does not own it**
   - tools, policy and runtime contracts must be stable outside of any single AI integration
6. **Local-first, remote-ready**
   - start with clean local semantics, then extend to SSH and other runtime targets without changing the model
7. **Architecture decisions must be explicit**
   - important trade-offs belong in ADRs, not in unspoken code drift

## Goals

- terminal + workspace model built as long-lived platform primitives
- typed tool runtime with schemas, metadata and execution pipeline
- capability-first security model
- approvals, trusted allowlists and ignore rules from day 1
- role presets, work modes and system prompt profiles that project into policy
- auditable mutating operations
- architecture that can absorb future AI features without collapsing into a giant RPC bucket

## Repository Layout

- `apps/desktop`
  Tauri shell and native app host.
- `frontend`
  React + TypeScript UI runtime source, organized by `app`, `layout`, `view`, `builder`, and `util`.
- `cmd/rterm-core`
  Go entrypoint for the runtime process.
- `core`
  Domain/runtime modules: workspace, terminal, tool runtime, policy, audit and transport.
- `docs`
  Architecture docs, migration notes and ADRs.

## Input Material From TideTerm

The rewrite uses the following files as source material, not as immutable truth:

- `AI_TOOL_WISHLIST.md`
- `AI_TOOL_ROADMAP.md`
- `AI_TOOL_SCHEMA.md`
- `AI_TOOL_CODEMAP.md`
- `AI_TOOL_POLICY.md`
- `AI_TOOL_BACKLOG.md`
- `aiprompts/waveai-architecture.md`
- `aiprompts/usechat-backend-design.md`
- `aiprompts/conn-arch.md`
- `aiprompts/fe-conn-arch.md`
- `aiprompts/view-prompt.md`
- `aiprompts/aimodesconfig.md`

The resulting architecture intentionally diverges where those documents would otherwise keep transport, runtime and product semantics entangled.

## Functional parity baseline

RunaTerminal is now in a parity-first phase.

The TideTerm frontend is used as an import source for bootstrap comparison, not as the canonical runtime tree:

```bash
npm run import:tideterm-frontend -- /path/to/tideterm/repo
```

That command syncs:

- `frontend/tideterm-src/`
- `frontend/tideterm-src-meta/`

Those paths are optional import snapshots, not the active runtime source.

The goal is to refactor from the real TideTerm renderer source instead of continuing to invent replacement frontend behavior.

## Current MVP target

The initial working slice is being built around:

- `workspace.list_widgets`
- `workspace.get_active_widget`
- `workspace.focus_widget`
- `term.get_state`
- `term.send_input`
- `term.interrupt`
- `safety.confirm`
- trusted rule add/list/remove
- ignore rule add/list/remove

## Current UI surface

The desktop shell is now intentionally usable as a minimal operator console, not just a foundation scaffold.

What the current shell exposes:

- a live terminal surface for the active widget
- keyboard input directly into the PTY plus a direct-input fallback row
- terminal interrupt, status, PID and working-directory visibility
- agent posture selectors for prompt profile, role preset and work mode
- a tool operator panel with catalog, metadata, manual JSON payload execution and last response inspection
- visible approval bar for dangerous actions with confirm-and-retry behavior
- policy management forms for trusted and ignore rules
- audit tail with tool outcome, role/mode context and approval usage

This is still a minimal internal shell, but it is now meant to be launched and exercised directly during development.

## Prerequisites

Required toolchain:

- Go `1.26+`
- Node `24+`
- npm `11+`
- Rust stable with `cargo`

Desktop runtime requirements:

- macOS: Xcode Command Line Tools (`xcode-select --install`)
- Linux: the normal Tauri/WebKitGTK desktop prerequisites for your distro

Important launch note:

- This project uses the local npm Tauri CLI from `@tauri-apps/cli`
- `cargo tauri` is not required and is not the supported dev entrypoint for this repository
- the supported command is `npm run tauri:dev`

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

What `npm run tauri:dev` does:

- fail-fast checks for `npm`, `cargo`, `curl`, macOS CLT, local Tauri CLI, frontend deps, and the built Go core binary
- starts the frontend Vite dev server on `127.0.0.1:5173` if it is not already running
- launches the Tauri shell against `apps/desktop/src-tauri/tauri.conf.json`

## Launch Troubleshooting

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

If you only need to rebuild the Go runtime binary used by the desktop shell before launching Tauri, run:

```bash
npm run build:core
```

Actual results are recorded in [docs/validation.md](docs/validation.md).

Release readiness for this phase is tracked in:

- [Release Scope](docs/release-1.0.md)
- [Release Checklist](docs/release-checklist-1.0.md)
- [Known Limitations](docs/known-limitations.md)

## Key Documents

- [Architecture Overview](docs/architecture.md)
- [Domain Model](docs/domain-model.md)
- [Tool Runtime](docs/tool-runtime.md)
- [Policy Model](docs/policy-model.md)
- [Terminal Architecture](docs/terminal-architecture.md)
- [Workspace Model](docs/workspace-model.md)
- [Migration Notes](docs/migration-notes.md)
- [Current Behavior](docs/current-behavior.md)
- [Release Checklist](docs/release-checklist-1.0.md)
- [Known Limitations](docs/known-limitations.md)
- [Agent Modes](docs/agent-modes.md)
- [System Prompts](docs/system-prompts.md)
- [ADRs](docs/adr)
