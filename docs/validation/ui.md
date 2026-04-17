# UI Validation

## Last verified state

- Date: `2026-04-17`
- State: `VERIFIED` for active compat surfaces
- Scope:
  - AI panel render/send/reload behavior
  - Tools panel execute + approval retry behavior
  - Audit panel event visibility and chain coherence
  - terminal streaming/interrupt and terminal parity closure checks
  - asset-pipeline checks

## Commands/tests used

- `npm --prefix frontend run dev -- --host 127.0.0.1 --port <port> --strictPort`
- `go run ./cmd/rterm-core serve --listen 127.0.0.1:<port> ...`
- Runtime/API checks:
  - `GET /api/v1/agent/conversation`
  - `POST /api/v1/agent/conversation/messages`
  - `GET /api/v1/tools`
  - `POST /api/v1/tools/execute`
  - `GET /api/v1/audit?limit=50`
- Related validation documents:
  - [frontend-terminal-interrupt-validation.md](./frontend-terminal-interrupt-validation.md)
  - [frontend-streaming-runtime-validation.md](./frontend-streaming-runtime-validation.md)
  - [frontend-approval-action-validation.md](./frontend-approval-action-validation.md)
  - [frontend-asset-pipeline-validation.md](./frontend-asset-pipeline-validation.md)
  - [../terminal-parity-validation.md](../terminal-parity-validation.md)

## Known limitations

- Shell/UI parity breadth remains partial versus full TideTerm chrome/surface density.
- Expected `428` browser noise on approval challenge can appear while UI flow still succeeds.
- Streaming AI response UX is not part of the current active validation scope.

## Evidence

- [UI surfaces](../ui/surfaces.md)
- [Terminal parity headed validation](../terminal-parity-validation.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#agent--conversation-panel)
