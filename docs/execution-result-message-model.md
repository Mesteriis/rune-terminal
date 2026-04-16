# Execution Result Message Model

## 1. Transcript message kind

- `/run` execution result is persisted as a regular conversation message with `role: "assistant"`.
- `/run` intent is persisted as a regular conversation message with `role: "user"` and content equal to submitted `/run ...` prompt.

## 2. Role and status semantics

- `/run` intent message:
  - `role: "user"`
  - `status: "complete"`
- `/run` execution-result message:
  - `role: "assistant"`
  - `status: "complete"`
- `/run` explanation message:
  - `role: "assistant"`
  - `status: "complete"` or `status: "error"` (provider failure path)

## 3. Minimal required fields

Persisted execution-result message uses the existing conversation message envelope:

- `id`
- `role`
- `content`
- `status`
- `created_at`

`content` must contain, minimally:

- executed command marker (`Executed \`<command>\``)
- observed output summary or explicit empty-output note

## 4. UI-only (not persisted) data

- pending-approval cards and confirm button state
- local `confirming`/`busy` state for retries
- attachment-drag transient UI state
- local fallback-only error decorations when explain request fails before backend append

No hidden frontend cache is treated as transcript truth.
