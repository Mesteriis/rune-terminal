# Conversation Snapshot / Reload Baseline

## 1. What backend snapshot returns

- `GET /api/v1/agent/conversation` returns `conversation` from `runtime.ConversationSnapshot()`:
  - `messages` (persisted transcript entries),
  - `provider`,
  - `updated_at`.
- Backend snapshot is sourced from `core/conversation.Service` persisted state.
- Persisted conversation roles are stored as `user` / `assistant` (with status/provider/model metadata).

## 2. What frontend adds locally today

- Active compat AI panel loads snapshot on mount and maps it to UI messages via `mapConversationSnapshot`.
- During `/run` execution, frontend appends local messages before backend snapshot refresh:
  - local user `/run ...` prompt message,
  - local execution-result message.
- If explain succeeds, frontend replaces local transcript with backend snapshot from explain response.
- Pending `/run` approval cards are stored in frontend memory (`frontend/app/approval/continuity.ts`) and restored on remount in the same session.

## 3. Where truth diverges currently

- Between local `/run` append and successful explain response, UI can temporarily show state not yet persisted.
- If explain fails, fallback explanation message is local-only and is not present in backend snapshot after reload.
- Pending approval UI state is frontend-only:
  - survives panel remount in same page session,
  - disappears after full page reload.

## 4. Strict slice boundary

- No UI redesign.
- No offline mode.
- No persistence system rewrite.
