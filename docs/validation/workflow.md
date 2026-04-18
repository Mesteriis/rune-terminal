# Workflow Validation

## Last verified state

- Date: `2026-04-18`
- State: `VERIFIED`
- Scope:
  - operator cross-surface handoffs (Files/AI/`/run`/Tools/Audit/MCP)
  - quick-actions explicit action flow
  - workflow identity/provenance checks
  - repo release-gate command truth
  - standalone local split dev entrypoints from `Makefile` (`run-backend`, `run-frontend`)

## Commands/tests used

- `python3 scripts/validate_operator_workflow.py`
- `npm run test:ui -- e2e/quick-actions.spec.ts`
- `npm run validate`
- `npm run tauri:dev`
- `make help`
- `make run-backend`
- `curl -sf http://127.0.0.1:8090/healthz`
- `make run-frontend`
- `curl -sf http://127.0.0.1:5173`
- Workflow identity targeted tests:
  - `./scripts/go.sh test ./core/transport/httpapi -run 'TestExplainTerminalCommandUsesExplicitCommandAuditEventIDPayload'`
  - `./scripts/go.sh test ./core/app -run 'TestCreateAttachmentReferenceAppendsAuditEventWithProvenance|TestExplainTerminalCommandUsesExplicitCommandAuditEventID'`
  - `./scripts/go.sh test ./core/transport/httpapi -run 'TestInvokeMCPAppendsAuditWithExplicitProvenance|TestExecuteToolAcceptsSessionTargetFieldsAtTransportBoundary'`

## Known limitations

- Cross-surface automation is intentionally explicit/manual, not autonomous orchestration.
- Remote coverage in workflow runs is often guard-level unless a dedicated remote slice is executed.
- Full-frontend lint debt is tracked separately and not part of active-path release gate.
- The standalone browser split path requires two terminals and a shared `LOCAL_AUTH_TOKEN` / backend URL pair.

## Evidence

- [Operator workflow](../workflow/operator-workflow.md)
- [Quick actions browser validation](../workflow/quick-actions-browser-validation.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#operator-workflow)
