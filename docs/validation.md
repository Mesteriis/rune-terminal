# Validation Report

Validation date: `2026-04-13`

All commands below were run against the repository in its current state on macOS arm64.

## Tooling baseline

- Go: `go1.26.2 darwin/arm64`
- Node: `v24.14.1`
- npm: `11.11.0`
- Rust: stable toolchain with `cargo`
- Tauri CLI: local npm package `@tauri-apps/cli` `2.10.1`

## Build and test validation

The following commands completed successfully:

```bash
npm install
npm --prefix frontend install
npm run build:core
npm run validate
```

`npm run validate` expands to:

```bash
npm run lint:frontend
npm run build:frontend
npm run test:go
npm run build:go
npm run tauri:check
```

Observed results:

- frontend lint passed
- frontend production build passed
- Go tests passed for `./cmd/... ./core/... ./internal/...`
- Go package build passed
- `build:core` emitted `apps/desktop/bin/rterm-core`
- `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml` passed

Notable correctness coverage now exercised by Go tests:

- concurrent `terminal.StartSession` coalesces to one launch
- unsubscribe/output delivery does not panic under concurrent delivery and channel close
- pending approvals are consumed by `safety.confirm`
- approval grants are one-time and cannot be replayed
- `term.interrupt` executes against the active terminal widget and returns a structured result
- policy table tests cover ignore precedence, trusted matching, allowed roots, approval escalation, destructive handling, and capability overlays

## Launch validation

The documented launch path was exercised directly:

```bash
npm run build:core
npm run tauri:dev
```

Observed launch behavior:

- `npm run tauri:dev` used `./scripts/tauri-dev.sh`
- the wrapper performed fail-fast checks for `npm`, `cargo`, `curl`, macOS CLT, frontend dependencies, local npm Tauri CLI, and the built Go core binary
- the Tauri development build completed successfully
- the desktop binary was started successfully:

```text
Finished `dev` profile [unoptimized + debuginfo] target(s) in 37.11s
Running `target/debug/rterm-desktop`
{"base_url":"http://127.0.0.1:51312","pid":12665}
```

The launch was then interrupted manually after confirming that the desktop shell and Go sidecar reached the running state.

## Runtime smoke validation

The built Go runtime was started directly and exercised over the real HTTP API with auth enabled:

```bash
RTERM_AUTH_TOKEN=test-token ./apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:0 \
  --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal \
  --state-dir <tmp>/state \
  --ready-file <tmp>/ready.json
```

Validated slice:

- `GET /api/v1/agent`
- `PUT /api/v1/agent/selection/mode`
- `term.get_state`
- dangerous policy mutation returning `428 approval_required`
- `safety.confirm`
- one-time approval token consumption

Observed runtime results:

- agent catalog endpoint responded successfully
- mode updates via the management API succeeded
- `term.get_state` succeeded for `term-main`
- dangerous `safety.add_ignore_rule` returned `428`
- `safety.confirm` returned an approval token
- the approved mutation succeeded once with `200`
- replaying the same approval token returned `428`, confirming single-use approval grants

## UI smoke validation

The browser-hosted frontend was exercised against a real loopback `rterm-core` instance using explicit runtime environment variables:

```bash
RTERM_AUTH_TOKEN=test-token ./apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:0 \
  --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal \
  --state-dir <tmp>/state \
  --ready-file <tmp>/ready.json

VITE_RTERM_API_BASE=http://127.0.0.1:<port> \
VITE_RTERM_AUTH_TOKEN=test-token \
  npm --prefix frontend run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

The UI itself was then driven by a local temporary Playwright install outside the repository so project dependencies were not modified.

Validated interaction slice:

- load the shell UI and bootstrap the live terminal surface
- switch prompt profile, role preset, and work mode through the visible selectors
- send terminal input through the xterm keyboard path and observe echoed output
- execute `safety.add_ignore_rule` from the operator panel with a manual JSON payload
- observe `approval required`, confirm the action, and see the success path complete
- verify the audit tail shows the tool event and `approval used`
- interrupt the active terminal session from the visible interrupt action

Observed result:

```json
{
  "ok": true,
  "steps": [
    "load app",
    "switch profile/role/mode",
    "send terminal input through xterm keyboard path",
    "trigger approval through operator panel",
    "return profile to balanced for operator actions",
    "interrupt active terminal"
  ]
}
```

## What was not validated

- no full packaged `tauri build` was run
- no Linux launch path was exercised in this pass
- no native-window automation was run inside the Tauri shell; launch readiness was validated with `npm run tauri:dev`, and UI interactions were validated against the browser-hosted frontend connected to the same Go runtime
- `cargo fmt` was not run because `rustfmt` is not installed in the local Rust toolchain
