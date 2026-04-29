# Execution Validation

## Last verified state

- Date: `2026-04-30`
- State: `VERIFIED` (targeted + headed + local/remote guardrail coverage present)
- Scope:
  - explicit `/run` execution path
  - approved terminal-context natural-language execution path
  - approval confirm/retry intent binding
  - execution block identity/provenance
  - execution block append/replace/shutdown-fail mutations keep in-memory
    state unchanged when persistence fails, so failed writes cannot create
    runtime-only execution history
  - explain/audit linkage
  - explicit local vs remote target identity
  - plugin/MCP negative-path guardrails

## Commands/tests used

- `./scripts/go.sh test ./core/app ./core/transport/httpapi ./core/execution -count=1`
- `./scripts/go.sh test ./core/execution -run 'TestServiceAppendDoesNotChangeMemoryWhenPersistFails|TestServiceReplaceDoesNotChangeMemoryWhenPersistFails|TestServiceMarkActiveFailedDoesNotChangeMemoryWhenPersistFails' -count=1`
- `./scripts/go.sh test ./core/execution -count=1`
- `./scripts/go.sh test ./core/app ./core/toolruntime ./core/transport/httpapi ./core/execution -run 'Test.*Execution|Test.*Run|Test.*TerminalCommand|Test.*Tool|Test.*Approval|Test.*Blocks|TestService' -count=1`
- `./scripts/go.sh test ./core/app ./core/toolruntime ./core/transport/httpapi -count=1`
- `npm --prefix frontend run lint:active`
- `npm --prefix frontend run build`
- `npm exec vitest run app/aipanel/run-command.test.ts --config vite.config.ts` (from `frontend/`)
- `npx vitest run app/aipanel/run-command.test.ts app/workspace/widget-helpers.test.ts --config vite.config.ts` (from `frontend/`)
- `npm run test:ui -- e2e/structured-execution-block.spec.ts`
- `npm run test:ui`
- custom headed Playwright runtime validation against a live stack with:
  - visible Chromium window
  - local `/run`
  - remote `/run` against isolated localhost SSH
  - explicit invalid cross-target probes
- Runtime/API checks:
  - `POST /api/v1/tools/execute`
  - `POST /api/v1/agent/terminal-commands/explain`
  - `GET /api/v1/execution/blocks?limit=10`
  - `GET /api/v1/audit?limit=20`
  - `POST /api/v1/remote/profiles`
  - `POST /api/v1/remote/profiles/{profileID}/session`
  - `GET /api/v1/terminal/{widgetID}?from=0`
  - `POST /api/v1/mcp/invoke`

## Known limitations

- approved terminal-context planning now covers a narrow natural-language execution path, but the runtime still does not expose broad provider-native tool execution or unconstrained natural-language automation.
- Some earlier slices recorded `npm run validate` as not verified because of repo-wide lint debt at that time.
- Tide does not expose a literal `/run` UI in the inspected sources; parity is grounded in Tide's explicit terminal-session ownership semantics rather than a Tide `/run` screen.
- Remote guardrail validation in this pass used an isolated localhost SSH daemon, not an arbitrary external host.

## Evidence

- [Structured execution browser validation](./structured-execution-browser-validation.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#structured-execution-action-truth)
- [Execution model](../execution/execution-model.md)
