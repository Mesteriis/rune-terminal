# Workflow Validation

## Last verified state

- Date: `2026-04-26`
- State: `VERIFIED`
- Scope:
  - operator cross-surface handoffs (Files/AI/`/run`/Tools/Audit/MCP)
  - active files-panel to AI attachment handoff through backend attachment references and the composer queue
  - quick-actions explicit action flow
  - workflow identity/provenance checks
  - repo release-gate command truth
  - standalone local split dev workflow from `Makefile` (`dev`, backed by `run-backend-watch`)

## Commands/tests used

- `python3 scripts/validate_operator_workflow.py`
- `npm run test:ui -- e2e/quick-actions.spec.ts`
- `npm run validate`
- `npm run tauri:dev`
- `make help`
- `make dev LOCAL_BACKEND_PORT=8092 LOCAL_BACKEND_LISTEN=127.0.0.1:8092 LOCAL_BACKEND_URL=http://127.0.0.1:8092 LOCAL_FRONTEND_PORT=4193`
- `curl -sf http://127.0.0.1:8092/healthz`
- `curl -sf http://127.0.0.1:4193`
- `bash -n scripts/dev.sh scripts/run-backend-watch.sh`
- `make -n run-backend`
- `make -n run-backend-watch`
- `make -n run-frontend`
- temporary no-op change + revert in `cmd/rterm-core/main.go` to confirm `air` rebuild/restart on watched Go source changes
- Workflow identity targeted tests:
  - `./scripts/go.sh test ./core/transport/httpapi -run 'TestExplainTerminalCommandUsesExplicitCommandAuditEventIDPayload'`
  - `./scripts/go.sh test ./core/app -run 'TestCreateAttachmentReferenceAppendsAuditEventWithProvenance|TestExplainTerminalCommandUsesExplicitCommandAuditEventID'`
- `./scripts/go.sh test ./core/transport/httpapi -run 'TestInvokeMCPAppendsAuditWithExplicitProvenance|TestExecuteToolAcceptsSessionTargetFieldsAtTransportBoundary'`
- `npm --prefix frontend run test -- src/widgets/files/files-panel-widget.test.tsx src/widgets/ai/ai-composer-widget.test.tsx src/widgets/ai/ai-chat-message-widget.test.tsx src/widgets/ai/ai-panel-widget.test.tsx`
- `./scripts/go.sh test ./core/app ./core/transport/httpapi -run 'TestCreateAttachmentReference|TestSubmitConversationPromptIncludesAttachmentContextInProviderRequest|TestSubmitConversationMessagePersistsAttachmentReferences|TestSubmitConversationMessageRejectsMissingAttachmentReference' -count=1`

## Known limitations

- Cross-surface automation is intentionally explicit/manual, not autonomous orchestration.
- Remote coverage in workflow runs is often guard-level unless a dedicated remote slice is executed.
- Full-frontend lint debt is tracked separately and not part of active-path release gate.
- The first split browser run that uses `make dev` or `make run-backend-watch` bootstraps `air-verse/air` into `tmp/tools/air`.
- The split browser path still depends on a shared `LOCAL_AUTH_TOKEN` / backend URL pair when targets are launched separately.
- The split backend path now also provisions a backend-only
  `LOCAL_TASK_CONTROL_TOKEN` into `RTERM_TASK_CONTROL_TOKEN`; this is required
  for task worker mutation routes and is intentionally not passed to Vite.
- This validation pass used alternate local ports (`8092` backend, `4193` frontend) because `5173` was already occupied on the validating machine.

## Evidence

- [Operator workflow](../workflow/operator-workflow.md)
- [Quick actions browser validation](../workflow/quick-actions-browser-validation.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#operator-workflow)
