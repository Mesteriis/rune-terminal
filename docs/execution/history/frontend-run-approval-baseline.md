# frontend `/run` approval baseline

Date: `2026-04-16`

## 1. Current `/run` execution path

- Active compat submit path: `frontend/app/aipanel/aipanel-compat.tsx`
- `/run` parsing: `parseRunCommandPrompt(...)` in `frontend/app/aipanel/run-command.ts`
- Runtime execution path for `/run`:
  - `executeRunCommandPrompt(...)`
  - `GET /api/v1/terminal/{widgetID}` to capture `next_seq`
  - `POST /api/v1/tools/execute` with `tool_name: "term.send_input"`
  - on success, poll terminal snapshot and append a local execution-result message
  - then call `POST /api/v1/agent/terminal-commands/explain`

## 2. Current approval-required response shape

`POST /api/v1/tools/execute` returns `428 Precondition Required` with a tool-runtime payload, not a separate approval endpoint response.

Actual shape from `core/toolruntime/types.go`:

- `status: "requires_confirmation"`
- `error_code: "approval_required"`
- `tool`
- `operation`
- `pending_approval`
  - `id`
  - `tool_name`
  - `summary`
  - `approval_tier`
  - `created_at`
  - `expires_at`

Current confirm contract already present elsewhere in the shell:

- `POST /api/v1/tools/execute`
- `tool_name: "safety.confirm"`
- `input: { "approval_id": "<pending_approval.id>" }`
- success output contains:
  - `approval_id`
  - `approval_token`
  - `expires_at`

## 3. Current UI behavior on `/run` approval

- `executeRunCommandPrompt(...)` treats any non-`ok` tool response as a terminal failure message.
- For `requires_confirmation`, it renders only assistant text such as `Approval required to run ...`.
- The pending approval ID is not preserved in AI-panel state.
- No confirm action is rendered in the active compat AI panel.
- No retry with `approval_token` is attempted.
- No explanation call runs, because execution never reaches the successful branch.

## 4. What is missing

- Preserve the pending `/run` request plus backend `pending_approval.id`
- Show the approval-required state in the active AI panel flow with a confirm action
- Call the existing `safety.confirm` tool contract
- Retry the original `term.send_input` request with `approval_token`
- Continue the existing `/run` path after retry:
  - capture terminal output
  - append the final execution result
  - call explain with `approval_used: true`

## 5. Strict slice boundary

- no AI panel redesign
- no generic approval framework rewrite
- no new backend approval semantics
- no unrelated tools panel, terminal, workspace, or audit work
