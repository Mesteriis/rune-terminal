# Approval Intent Binding Baseline

## Current approval-required response shape

- Tool execution uses `POST /api/v1/tools/execute`.
- When policy requires confirmation, the backend returns HTTP `428` with:
  - `status: "requires_confirmation"`
  - `error_code: "approval_required"`
  - `tool`
  - `operation`
  - `pending_approval: { id, tool_name, summary, approval_tier, created_at, expires_at }`
- `pending_approval` does not currently expose any execution-intent binding fields.

## Current confirm flow

- There is no separate `/api/v1/safety/confirm` route.
- Confirmation is another `POST /api/v1/tools/execute` call with:
  - `tool_name: "safety.confirm"`
  - `input: { approval_id }`
  - the current execution context
- `core/toolruntime/approval.go` consumes the pending approval ID and returns:
  - `approval_id`
  - `approval_token`
  - `expires_at`

## Current retry flow

- Frontend retry uses the original request plus `approval_token`.
- Current active flows do this explicitly:
  - tools panel stores the full pending tool request and replays it on confirm
  - `/run` stores the original command and tool context and rebuilds the same `term.send_input` request on confirm
- Backend retry verification currently happens in `core/toolruntime/executor_prepare.go` via `approvalStore.Verify`.

## Exact weakness in current binding

- `core/toolruntime/approval.go` stores only the tool name alongside the pending approval and approval grant.
- `Verify` checks only:
  - token presence
  - token expiry
  - matching `tool_name`
- It does not bind approval to:
  - normalized tool input
  - execution context (`workspace_id`, `repo_root`, `active_widget_id`)
- Result: a valid approval token for one request can currently approve a different request for the same tool name.

## Strict slice boundary

- no persistence or resumable approvals
- no UI redesign or approval UX rewrite
- no broader policy-model rewrite
- no remote-execution or plugin-contract expansion

## Minimal execution intent binding

The minimal approval binding for the current runtime is:

- `tool_name`
- normalized decoded tool `input`
- normalized execution `context`
  - `workspace_id`
  - `repo_root`
  - `active_widget_id`

Why this is the minimal safe shape:

- `tool_name` alone is insufficient because the same tool can execute materially different actions.
- decoded `input` is part of execution identity because it determines what the tool actually does.
- execution `context` is part of execution identity because current tools and planners can resolve behavior from workspace/widget/repo scope.

What is intentionally not included:

- prompt profile / role / mode
  - they still affect live policy evaluation on retry
  - they are not required to distinguish one execution request from another in the current transport contract
- audit metadata
  - it is derived from execution and policy evaluation, not the execution intent itself
- terminal output or explain payloads
  - they happen after execution and are outside approval identity
