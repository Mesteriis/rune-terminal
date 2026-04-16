# Explain Approval Baseline

## Current `approval_used` source

- The active `/run` path sets `approvalUsed: true` in `frontend/app/aipanel/aipanel-compat.tsx` after confirm-and-retry succeeds.
- `frontend/app/aipanel/run-command.ts` forwards that value as `approval_used` in `POST /api/v1/agent/terminal-commands/explain`.
- `core/transport/httpapi/handlers_agent_conversation.go` decodes `approval_used` and passes it into `app.ExplainTerminalCommandRequest`.
- `core/app/ai_terminal_command.go` writes `request.ApprovalUsed` directly into the `agent.terminal_command` audit event.

## Why the frontend is the current source

- The explain backend does not derive approval state on its own.
- The only value used for the explain audit entry is the boolean provided by the client payload.
- A client can therefore mark explain as approved without the backend re-checking the actual execution chain.

## Where backend truth already exists

- The tool runtime already writes authoritative audit events for `term.send_input` in `core/toolruntime/executor_audit.go`.
- On an approved retry, that tool audit event already carries `approval_used:true`.
- The same audit trail also records the surrounding chain:
  - blocked `term.send_input` with `error:"approval_required"`
  - `safety.confirm`
  - successful retried `term.send_input`
- `core/audit/log.go` already exposes those events through `List`, so the explain backend can derive approval truth from the existing backend-owned audit chain.
