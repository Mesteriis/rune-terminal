# UI Validation

## Last verified state

- Date: `2026-04-17`
- State: `VERIFIED` for active compat surfaces
- Scope:
  - shell chrome parity coverage for compact top-shell density, tab hierarchy, and AI reopen behavior
  - panels parity coverage for AI panel + settings utility surfaces
  - AI panel render/send/reload behavior
  - Tools panel execute + approval retry behavior
  - Audit panel event visibility and chain coherence
  - terminal streaming/interrupt and terminal parity closure checks
  - structured execution local/remote target truth in a visible browser
  - asset-pipeline checks

## Commands/tests used

- `npm --prefix frontend run dev -- --host 127.0.0.1 --port <port> --strictPort`
- `go run ./cmd/rterm-core serve --listen 127.0.0.1:<port> ...`
- headed Playwright Chromium validation with launcher -> AI panel -> local `/run` -> remote `/run`
- `npx playwright test e2e/shell-chrome-parity.spec.ts -c e2e/playwright.config.ts --headed`
- `npx playwright test e2e/panels-parity.spec.ts -c e2e/playwright.config.ts --headed`
- Runtime/API checks:
  - `GET /api/v1/agent/conversation`
  - `POST /api/v1/agent/conversation/messages`
  - `GET /api/v1/tools`
  - `POST /api/v1/tools/execute`
  - `GET /api/v1/audit?limit=50`
  - `POST /api/v1/remote/profiles`
  - `POST /api/v1/remote/profiles/{profileID}/session`
- Related validation documents:
  - [frontend-terminal-interrupt-validation.md](./frontend-terminal-interrupt-validation.md)
  - [frontend-streaming-runtime-validation.md](./frontend-streaming-runtime-validation.md)
  - [frontend-approval-action-validation.md](./frontend-approval-action-validation.md)
  - [frontend-asset-pipeline-validation.md](./frontend-asset-pipeline-validation.md)
  - [structured-execution-browser-validation.md](./structured-execution-browser-validation.md)
  - [../panels-parity-validation.md](../panels-parity-validation.md)
  - [../shell-chrome-validation.md](../shell-chrome-validation.md)
  - [../terminal-parity-validation.md](../terminal-parity-validation.md)

## Known limitations

- Expected `428` browser noise on approval challenge can appear while UI flow still succeeds.
- Terminal advanced affordances, broader attachment UX, and streaming AI response UX are not part of the current active validation scope.

## Evidence

- [UI surfaces](../ui/surfaces.md)
- [Panels parity headed validation](../panels-parity-validation.md)
- [Shell chrome desktop + headed validation](../shell-chrome-validation.md)
- [Terminal parity headed validation](../terminal-parity-validation.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#agent--conversation-panel)
