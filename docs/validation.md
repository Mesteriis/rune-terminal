# Validation Report

Validation date: `2026-04-13`

All commands below were run against the repository in its current state.

## Tooling Baseline

- Go: `go1.26.2 darwin/arm64`
- Node: `v24.14.1`
- npm: `11.11.0`
- Rust: stable toolchain present

## Build And Test Runs

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

- `lint:frontend`: passed
- `build:frontend`: passed, production bundle emitted to `frontend/dist`
- `test:go`: passed for `./cmd/... ./core/... ./internal/...`, including new `core/agent` and stricter `core/policy` coverage
- `build:go`: passed
- `build:core`: passed, binary emitted to `apps/desktop/bin/rterm-core`
- `tauri:check`: passed

## Runtime Smoke Test

The built Go runtime was started directly and exercised over the real HTTP API with auth enabled:

```bash
RTERM_AUTH_TOKEN=test-token ./apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:0 \
  --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal \
  --state-dir <tmp>/state \
  --ready-file <tmp>/ready.json
```

Validated slice:

- `workspace.list_widgets`
- `workspace.focus_widget`
- `term.get_state`
- `term.send_input`
- `safety.add_trusted_rule`
- `safety.confirm` for dangerous policy mutations
- `safety.list_trusted_rules`
- `safety.remove_trusted_rule`
- `safety.add_ignore_rule`
- `safety.list_ignore_rules`
- `safety.remove_ignore_rule`
- audit tail fetch via `/api/v1/audit`

Smoke-test observations:

- workspace booted with 2 terminal widgets
- `workspace.focus_widget` returned an `operation` payload with `affected_widgets: ["term-side"]`
- terminal state reported `running`
- terminal input completed successfully
- trusted rule add/list/remove succeeded
- ignore rule add/list/remove succeeded
- audit feed recorded the exercised operations
- audit events included role/mode fields from the new agent profile subsystem

## Notes

- `cargo fmt` was not run because the local Rust toolchain does not currently include `rustfmt`
- a full packaged `tauri build` was not run; the validated desktop boundary is `cargo check` plus the built `rterm-core` runtime smoke test
