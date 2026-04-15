# Frontend Terminal Action Model (Active Operator Path)

Source surface for this slice:

- `old_front/hooks/useRuntimeShell.ts`
- `old_front/hooks/useTerminalActions.ts`
- `old_front/hooks/useApprovalFlow.ts`
- `old_front/hooks/useAiCommandExecution.ts`
- `old_front/components/TerminalSurface.tsx`
- `old_front/components/ApprovalBar.tsx`
- `old_front/components/ToolConsolePanel.tsx`

## `send_input`

### Initiators

- terminal keyboard/paste in `TerminalSurface`
- AI composer explicit `/run ...` prompt path
- manual tool execution from `ToolConsolePanel` (`term.send_input`)

### API/store path

- keyboard/paste path:
  - `TerminalSurface.onSubmitInput` -> `useTerminalActions.submitTerminalInput`
  - `RtermClient.sendTerminalInput` -> `POST /api/v1/terminal/{widget_id}/input`
- tool/runtime path:
  - `useAiCommandExecution` or `ToolConsolePanel` -> `useRuntimeShell.executeTool`
  - `RtermClient.executeTool` -> `POST /api/v1/tools/execute` (`tool_name: "term.send_input"`)

### Success shape

- direct terminal endpoint: `{ widget_id, bytes_sent, append_newline }`
- tool/runtime endpoint: `ExecuteToolResponse` with `status:"ok"` and `output` carrying the same input result shape

### Failure/error shape

- direct terminal endpoint: thrown request error (`Error(message)` from non-2xx response)
- tool/runtime endpoint:
  - `status:"error"` + `error`/`error_code`
  - or `status:"requires_confirmation"` + `pending_approval`

### Audit expectation

- direct terminal endpoint path: no tool-runtime audit event expected
- tool/runtime path: `term.send_input` audit event expected

### Approval interaction

- direct terminal endpoint path: no approval handshake
- tool/runtime path: policy-driven; may return `requires_confirmation`

## `interrupt`

### Initiator

- terminal toolbar `Interrupt` button in `TerminalSurface`

### API/store path

- `TerminalSurface.onInterrupt` -> `useTerminalActions.interruptWidget`
- `useRuntimeShell.executeTool` -> `POST /api/v1/tools/execute` (`tool_name: "term.interrupt"`)

### Success shape

- `ExecuteToolResponse` with `status:"ok"` and output:
  - `{ widget_id, interrupted: true, status }`

### Failure/error shape

- request failure: `null` response in `executeTool` path + error notice
- tool/runtime failure: `status:"error"` with `error`/`error_code`

### Audit expectation

- `term.interrupt` audit event expected

### Approval interaction

- current observed profile (`balanced`) executes without confirmation
- path remains policy-governed via `executeTool`

## `confirm_approval`

### Initiator

- `ApprovalBar` button: `Confirm and continue`

### API/store path

- `ApprovalBar.onConfirm` -> `useApprovalFlow.confirmPendingRequest`
- `RtermClient.executeTool` -> `POST /api/v1/tools/execute` (`tool_name: "safety.confirm"`)

### Success shape

- `status:"ok"` with approval grant:
  - `{ approval_id, approval_token, expires_at }`

### Failure/error shape

- `status:"error"` with `error`
- request exception surfaced as notice

### Audit expectation

- `safety.confirm` audit event expected

### Approval interaction

- consumes `pending_approval.id`
- yields single-use approval token for retry

## `retry_after_approval`

### Initiator

- automatic from `useApprovalFlow.confirmPendingRequest` after successful `safety.confirm`

### API/store path

- `executeTool({ ...pendingRequest, approval_token })`
- same original tool path via `POST /api/v1/tools/execute`

### Success shape

- original tool `status:"ok"`

### Failure/error shape

- original tool `status:"error"` or `status:"requires_confirmation"`
- consumed token replay falls back to normal policy evaluation

### Audit expectation

- retried tool audit event expected
- when token is accepted, `approval_used:true` is expected

### Approval interaction

- automatic retry in active shell path (not manual re-submit from the user)

## `reject_or_cancel`

### Current state

- explicit reject/cancel action is not present in the active approval bar
- `ApprovalBar` exposes confirm only

### Consequence

- pending approval can be superseded/cleared by subsequent execution paths, but no dedicated reject action is currently modeled in UI

## `inspect_last_result` / response surface

### Initiator

- operator opens tool console / transcript views

### API/store path

- `useRuntimeShell.lastResponse` is updated by `executeTool` and approval confirmation path
- `ToolConsolePanel` renders `lastResponse`
- `AgentTranscript` renders action/result/approval feed entries (`runtimeFeed + conversationFeed`)

### Success/failure shape

- reflects `ExecuteToolResponse` and mapped feed entries (`ok`, `error`, `requires_confirmation`)

### Audit expectation

- audit visibility remains via explicit `refreshAudit` calls after tool execution and approval confirmation
