# Execution Contract

## 1. Actual Execution Flow

User input:
`/run <command>`

1. Detection in UI
   - The active compat AI panel parses the composer text in `frontend/app/aipanel/run-command.ts`.
   - Only explicit `/run <command>` and `run: <command>` match this path.
   - `frontend/app/aipanel/aipanel-compat.tsx` intercepts that parsed intent before generic conversation submission.

2. Routing to agent/tool layer
   - The panel builds a tool context from the active workspace snapshot:
     - `workspace_id`
     - `active_widget_id`
     - `repo_root`
   - It also builds a conversation context with the same fields plus `widget_context_enabled`.

3. Tool execution request
   - Before sending the command, the UI reads `GET /api/v1/terminal/{widgetID}` to capture the current `next_seq`.
   - It then sends `POST /api/v1/tools/execute` with:
     - `tool_name: "term.send_input"`
     - `input: { "widget_id": "<active widget>", "text": "<command>", "append_newline": true }`
     - `context: { "workspace_id": "...", "active_widget_id": "...", "repo_root": "..." }`
     - `approval_token` only on an approved retry

4. Backend processing
   - `core/transport/httpapi/handlers_tools.go` decodes the request into `toolruntime.ExecuteRequest`.
   - `core/app/tool_execution.go` resolves the active backend policy profile first and passes it explicitly into the tool runtime.
   - `core/toolruntime.Executor` resolves the tool definition, builds a normalized execution envelope, decodes input, builds an operation plan, verifies any supplied `approval_token`, and runs policy evaluation.
   - For `term.send_input`, the base tool metadata is mutating `terminal:input` with approval tier `moderate`.

5. Approval requirement
   - If policy escalates the effective tier to `dangerous` or `destructive` and no valid approval token is present, the backend does not execute the terminal input.
   - The transport returns HTTP `428 Precondition Required` with a structured tool response:
     - `status: "requires_confirmation"`
     - `error_code: "approval_required"`
     - `tool`
     - `operation`
     - `pending_approval: { "id", "tool_name", "summary", "approval_tier", "created_at", "expires_at" }`
   - The tool runtime appends an audit event for the blocked `term.send_input` attempt with `success:false` and `error:"approval_required"`.

6. Confirm
   - There is no separate `/api/v1/safety/confirm` HTTP route in the current implementation.
   - The UI confirms by sending another `POST /api/v1/tools/execute` request with:
     - `tool_name: "safety.confirm"`
     - `input: { "approval_id": "<pending approval id>" }`
     - the same execution context
   - On success, `safety.confirm` returns `status:"ok"` and `output: { "approval_id", "approval_token", "expires_at" }`.

7. Retry
   - After a successful confirm, the UI retries the original `term.send_input` request.
   - The retried payload keeps the same tool name, input, and context, and adds the returned `approval_token`.
   - `core/toolruntime/approval.go` binds the approval grant to a stable execution-intent hash derived from the tool name, normalized decoded input, and normalized execution context.
   - A mismatched retry is rejected explicitly with HTTP `403`, `status:"error"`, and `error_code:"approval_mismatch"`.
   - A mismatched retry does not consume the token for the original approved intent.

8. Final execution
   - When the retry is accepted, `term.send_input` executes through the normal terminal service path.
   - The AI panel then polls `GET /api/v1/terminal/{widgetID}?from=<captured next_seq>` until output stabilizes.
   - The visible execution result is built from the observed terminal snapshot, not from the raw tool `output`.

9. Audit logging
   - Every tool execution attempt is audited by the tool runtime:
     - initial blocked `term.send_input`
     - `safety.confirm`
     - retried `term.send_input`
   - On the approved retry, the audit event carries `approval_used:true`.

10. Explanation
   - After successful execution only, the UI calls `POST /api/v1/agent/terminal-commands/explain` with:
     - `prompt`
     - `command`
     - `widget_id`
     - `from_seq`
     - `context`
   - The backend does not execute the command here. It snapshots terminal output from `from_seq`, builds an excerpt, derives `approval_used` from the matching `term.send_input` audit event, asks the conversation provider for an assistant reply, persists that assistant message, and writes an `agent.terminal_command` audit event.

11. UI rendering
   - The active compat AI panel renders a mixed transcript:
     - local user `/run` prompt message
     - local execution-result message built from terminal output
     - backend conversation assistant message from the explain response
   - If `/run` hits approval, the frontend stores the pending retry intent in an explicit in-memory retry context and renders the approval card through `RunCommandApprovalList`.
   - The current tools floating window uses the same in-memory continuity approach for tool approvals.
   - If explanation fails after execution succeeds, the panel renders a local fallback explanation message instead of a persisted backend assistant message.

## 2. Execution Contract

### 2.1 Input contract

- `/run` is an explicit shell-command grammar, not a generic tool DSL.
- Accepted forms are:
  - `/run <command>`
  - `run: <command>`
- The derived command must be non-empty after trimming the prefix.
- The active compat AI panel must preserve both:
  - the original user prompt string
  - the derived command string
- The active `/run` path is scoped to the current terminal widget. The current UI must not issue `/run` without an active terminal widget.
- The `/run` tool context is the current execution context:
  - `workspace_id`
  - `active_widget_id`
  - `repo_root`
- The backend normalizes that request into an internal execution envelope that also carries explicit `role` and `mode` from the resolved backend policy profile for the active agent selection.
- `role` and `mode` are backend-derived execution context, not client-owned request fields for `/api/v1/tools/execute`.
- The explain request uses the corresponding conversation context:
  - the same execution fields
  - `widget_context_enabled`
- Backend transport types allow omitted context fields, but the active compat `/run` path is expected to send explicit context from frontend state rather than inventing it server-side.

### 2.2 Tool execution contract

- Tool execution uses `POST /api/v1/tools/execute`.
- Request body shape:
  - `tool_name: string`
  - `input?: object`
  - `context?: { workspace_id?, repo_root?, active_widget_id? }`
  - `approval_token?: string`
- `/run` execution must use:
  - `tool_name: "term.send_input"`
  - `input.text = <derived command>`
  - `input.append_newline = true`
- Response body shape is the runtime `ExecuteResponse`:
  - `status`
  - `output?`
  - `error?`
  - `error_code?`
  - `tool?`
  - `operation?`
  - `pending_approval?`
- Transport status mapping is part of the contract:
  - `200` for `status:"ok"`
  - `428` for `status:"requires_confirmation"`
  - `400`, `403`, `404`, `500` for `status:"error"` depending on `error_code`
- Frontend clients must treat structured non-2xx tool-execute bodies as tool responses when they match the runtime shape. Approval and policy-denial handling must not depend on transport exceptions alone.

### 2.3 Approval contract

- Approval is triggered by backend policy evaluation, not by UI heuristics.
- `dangerous` and `destructive` effective approval tiers require confirmation unless policy already allows the action through a valid approval or auto-approval path.
- A confirmation challenge returns:
  - HTTP `428`
  - `status: "requires_confirmation"`
  - `error_code: "approval_required"`
  - `tool`
  - `operation`
  - `pending_approval`
- `pending_approval` carries:
  - `id`
  - `tool_name`
  - `summary`
  - `approval_tier`
  - `created_at`
  - `expires_at`
- Confirmation is performed through the existing tool contract, not a separate approval endpoint:
  - `POST /api/v1/tools/execute`
  - `tool_name: "safety.confirm"`
  - `input: { "approval_id": "<pending approval id>" }`
- A successful confirm returns an approval grant in `output`:
  - `approval_id`
  - `approval_token`
  - `expires_at`
- The approval grant is bound internally to the original execution intent:
  - `tool_name`
  - normalized decoded tool `input`
  - normalized execution `context`
- Pending approvals are single-use and expire. The current implementation issues them with a 10-minute lifetime.

### 2.4 Retry contract

- Retry happens only after a successful `safety.confirm`.
- Retry must reuse the original execution intent:
  - same `tool_name`
  - same tool `input`
  - same execution `context`
- Retry adds exactly one new field:
  - `approval_token`
- Retry must not silently change:
  - command text
  - target widget
  - workspace context
  - repo-root context
- A retry whose tool name, normalized input, or normalized context does not match the approved intent must fail explicitly with:
  - HTTP `403`
  - `status: "error"`
  - `error_code: "approval_mismatch"`
- Approval tokens are single-use and expire. The current implementation issues them with a 10-minute lifetime.
- A mismatched retry must not consume the token for the original approved intent.
- A consumed or expired token must not yield ambient approval. The request falls back to normal policy evaluation, which may return a fresh `requires_confirmation`.

### 2.5 Audit contract

- Tool-runtime executions append audit events in the backend, not in the frontend.
- For the `/run` approval chain, the expected event order is:
  1. blocked `term.send_input`
  2. successful `safety.confirm`
  3. successful retried `term.send_input`
  4. `agent.terminal_command` if explanation is requested after execution
- Tool audit entries carry:
  - `tool_name`
  - `summary`
  - `workspace_id`
  - prompt profile / role / mode / security posture fields
  - approval tier fields
  - success/error
  - affected widgets/paths
  - `approval_used`
- `approval_used:true` means the execution consumed a valid approval token during policy evaluation of that request.
- `approval_used` is meaningful on the approved retry and on the follow-up explain audit event when the backend derives the matching execution as approved.

### 2.6 Agent contract

- The agent does not execute `/run` commands directly.
- Command execution truth remains in the tool/runtime path.
- The active agent selection participates indirectly in execution by supplying the policy overlay used during tool policy evaluation.
- The app layer resolves that selection into an explicit policy profile before invoking the executor; the executor no longer reads agent selection state implicitly.
- The explicit agent call in the `/run` flow is `POST /api/v1/agent/terminal-commands/explain`, and it happens only after successful execution.
- The explain route adds:
  - terminal-output summarization from `from_seq`
  - a persisted assistant message in conversation storage
  - an `agent.terminal_command` audit event
- The agent must not:
  - bypass tool policy
  - invent approval state
  - mark a command executed when `term.send_input` did not succeed
  - replace backend audit truth with frontend-only state

### 2.7 UI contract

- The frontend is not the source of truth for tool execution, approval, or audit.
- The frontend must render backend truth from:
  - `ExecuteResponse`
  - approval-grant `output`
  - explain response conversation snapshot
  - audit API results when audit is viewed
- The frontend may keep local transient state only for active UI flow control, including:
  - pending `/run` approvals waiting for user action
  - local `/run` prompt echo
  - local execution-result message
  - local explanation-fallback message
- Persisted conversation messages come from the backend conversation service.
- In the current `/run` flow, the persisted message is the assistant explanation; the local `/run` prompt and the local execution-result message are not written into conversation storage.

## 3. Contract vs Implementation

- `2.1 Input contract` -> `MATCHES`
  - `frontend/app/aipanel/run-command.ts` accepts only `/run <command>` and `run: <command>`.
  - `frontend/app/aipanel/aipanel-compat.tsx` preserves both prompt and derived command for explain and retry.
  - `executeRunCommandPrompt` rejects `/run` execution when there is no active widget.

- `2.2 Tool execution contract` -> `MATCHES`
  - `core/transport/httpapi/handlers_tools.go` and `core/toolruntime/types.go` match the documented request/response shape.
  - `core/transport/httpapi/error_model.go` matches the documented status mapping.
  - `frontend/rterm-api/tools/client.ts` unwraps structured non-2xx tool responses instead of flattening them into transport-only failures.

- `2.3 Approval contract` -> `MATCHES`
  - `core/policy/stage_approval.go` triggers confirmation from the effective approval tier.
  - `core/toolruntime/executor.go` returns `status:"requires_confirmation"` with `pending_approval`.
  - `core/app/tool_policy.go` exposes confirmation only as `safety.confirm` through the normal tool execution route.
  - `core/toolruntime/approval.go` makes pending approvals single-use with a 10-minute expiry.

- `2.4 Retry contract` -> `MATCHES`
  - `core/toolruntime/intent.go` computes a stable execution-intent hash from the tool name, normalized decoded input, and normalized execution context.
  - `core/toolruntime/approval.go` stores that intent binding with both the pending approval and the approval grant, and rejects mismatched retries with `approval_mismatch` without consuming the original matching token.
  - The active compat UI already replays the original request for both tools-panel and `/run` approval flows, so the hardened backend contract matches the existing frontend behavior.

- `2.5 Audit contract` -> `MATCHES`
  - `core/toolruntime/executor_audit.go` records tool execution attempts in the backend.
  - `core/app/ai_terminal_command.go` records the explain step as `agent.terminal_command`.
  - `core/app/ai_terminal_command.go` derives explain `approval_used` from the matching `term.send_input` audit event instead of trusting client input.

- `2.6 Agent contract` -> `MATCHES`
  - The agent selection store is used as the executor's policy-profile provider.
  - The explicit `/run` agent call is only the post-execution explain request in `core/transport/httpapi/handlers_agent_conversation.go`.
  - Execution remains in `term.send_input`; explain only summarizes observed output and persists an assistant reply.

- `2.7 UI contract` -> `MATCHES`
  - The AI panel reflects backend execution and approval responses from `/api/v1/tools/execute`.
  - Persisted conversation messages come from `core/conversation.Service`.
  - Pending approvals remain frontend-local but now use explicit in-memory continuity state so panel/window remount can recover the retry intent within the same frontend session.

## 4. Risks

- Approval continuity is transient.
  - Pending retry context is frontend-memory only.
  - `core/toolruntime/approval.go` stores pending approvals and grants only in in-memory maps.
  - Closing and reopening the current panel/window can now recover the pending retry in the same page session, but a full frontend reload or core restart still loses the confirm-and-retry chain.

- `/run` transcript persistence is incomplete by design.
  - The local `/run` prompt echo and the local execution-result message are not written into `core/conversation.Service`.
  - Conversation persistence keeps the assistant explanation message only.
  - Reconstructing the full `/run` exchange requires frontend local state, terminal state, and/or audit records.

## 5. Non-goals

- Streaming protocol redesign is not part of this contract.
- Plugin system implementation or side-process execution architecture is not part of this contract.
- AI panel or shell UI redesign is not part of this contract.
- Attachment transport or attachment persistence is not part of this contract.
- Remote execution expansion beyond the current terminal/tool runtime path is not part of this contract.
- New execution semantics, new approval semantics, or new transport endpoints are not part of this contract.
