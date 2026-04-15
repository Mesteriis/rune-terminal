# Frontend Approval Action Validation

Validation date: `2026-04-15`

Runtime base URL in this run: `http://127.0.0.1:61384`

## How dangerous action becomes pending

Executed dangerous mutation through tool runtime:

```bash
curl -sS -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"safety.add_ignore_rule","input":{"scope":"repo","matcher_type":"glob","pattern":"slice4-approval-*","mode":"metadata-only","note":"slice4 validation"},"context":{"workspace_id":"ws-local","repo_root":"/Users/avm/projects/Personal/tideterm/runa-terminal","active_widget_id":"term-main"}}'
```

Observed response:

```json
{"status":"requires_confirmation","error_code":"approval_required","pending_approval":{"id":"approval_9ae9da7f5019c00c","tool_name":"safety.add_ignore_rule","approval_tier":"dangerous"}}
```

## How approval is shown in active path

Active shell code path:

- `useRuntimeShell.executeTool` -> `useApprovalFlow.registerPendingApproval`
- `pendingApproval` state is passed into `AgentPanelStatus`
- `AgentPanelStatus` renders `ApprovalBar` with tool name + summary

UI affordance currently present:

- `Confirm and continue`

## What confirm does

`ApprovalBar` confirm triggers `useApprovalFlow.confirmPendingRequest`:

1. execute `safety.confirm` with `approval_id`
2. if successful, append approval feed entry and set notice
3. retry the original pending request with `approval_token`

Observed `safety.confirm` response:

```json
{"status":"ok","output":{"approval_id":"approval_9ae9da7f5019c00c","approval_token":"d0d38151cf81593d35ddb32bec6d0213"}}
```

## Retry behavior (automatic vs manual)

- Active UI path is automatic:
  - retry is executed by `confirmPendingRequest` immediately after successful `safety.confirm`
- Manual API replay validation:
  - retry with token succeeded once (`status:"ok"`)
  - replaying consumed token produced a fresh `requires_confirmation`

## Rejection/cancel behavior

- No explicit reject/cancel action exists in the current `ApprovalBar`
- Current approval UI is confirm-only

## Audit and response surfaces

Observed audit events:

- initial dangerous call: `success:false`, `error:"approval_required"`
- `safety.confirm`: `success:true`
- approved retry: `success:true`, `approval_used:true`

Response surfaces in active shell:

- transient notice (`ExecutionNotice`)
- approval card (`ApprovalBar`)
- runtime feed entry (`AgentTranscript`)
- last raw response (`ToolConsolePanel` -> `lastResponse`)

## Limitation scope for this pass

- This pass validated approval semantics with real runtime responses and code-path inspection.
- A full browser click-through of the approval bar was not rerun in this pass.
