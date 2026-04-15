# Frontend Action Audit Expectations

Validation source:

- runtime responses and `/api/v1/audit?limit=20` from `2026-04-15`
- active shell code path in `old_front/hooks/useRuntimeShell.ts` and `old_front/hooks/useApprovalFlow.ts`

## Action to audit visibility map

| Action | Runtime path | Current audit visibility | Timing | Notes |
| --- | --- | --- | --- | --- |
| `send_input` (terminal keyboard/paste) | `POST /api/v1/terminal/{widget}/input` | Missing in tool audit | Missing | Input reaches terminal output stream, but no `tool_name` audit event is expected on this direct endpoint path. |
| `send_input` (tool/runtime) | `POST /api/v1/tools/execute` with `tool_name:"term.send_input"` | Visible (`tool_name:"term.send_input"`) | Immediate | Includes summary, approval tier, and affected widget. |
| `interrupt` | `POST /api/v1/tools/execute` with `tool_name:"term.interrupt"` | Visible (`tool_name:"term.interrupt"`) | Immediate | Event is written even when user-visible command interruption is not definitive. |
| approval confirm | `POST /api/v1/tools/execute` with `tool_name:"safety.confirm"` | Visible (`tool_name:"safety.confirm"`) | Immediate | Confirmation itself is audited independently from the retried action. |
| retry after approval | original tool + `approval_token` | Visible on retried tool event | Immediate | Successful approved retry shows `approval_used:true`. |
| manual tool execution (operator panel) | `ToolConsolePanel` -> `executeTool` | Visible for tool-runtime actions | Immediate | Last response is also shown in `ToolConsolePanel`. |
| tool errors | `executeTool` status `error` | Visible (`success:false`, `error`) | Immediate | Includes policy errors such as `approval_required`. |

## What is currently visible in shell surfaces

- `AuditPanel` (backend audit list)
- `ExecutionNotice` / `ApprovalBar` (inline status surface)
- `AgentTranscript` (runtime/conversation feed)
- `ToolConsolePanel` last raw response

## What is not currently visible

- direct terminal input endpoint events as first-class audit records
- explicit “approval rejected/cancelled” audit event from UI (no reject action exists)

## Coupling summary

- Tool-runtime actions are audit-coupled by design and are refreshed after each execution/confirmation.
- Direct terminal input remains stream-visible but not audit-visible in the current model.
