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
   - `core/toolruntime.Executor` resolves the tool definition, decodes input, builds an operation plan, verifies any supplied `approval_token`, and runs policy evaluation.
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
   - Token verification is one-time and tool-name scoped inside `core/toolruntime/approval.go`.

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
     - `approval_used` when the command ran on an approved retry
     - `context`
   - The backend does not execute the command here. It snapshots terminal output from `from_seq`, builds an excerpt, asks the conversation provider for an assistant reply, persists that assistant message, and writes an `agent.terminal_command` audit event.

11. UI rendering
   - The active compat AI panel renders a mixed transcript:
     - local user `/run` prompt message
     - local execution-result message built from terminal output
     - backend conversation assistant message from the explain response
   - If `/run` hits approval, the panel stores the pending request in local component state and renders the approval card through `RunCommandApprovalList`.
   - If explanation fails after execution succeeds, the panel renders a local fallback explanation message instead of a persisted backend assistant message.
