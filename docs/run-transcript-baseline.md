# /run Transcript Persistence Baseline

## 1. Current `/run` message lifecycle

1. User submits `/run <command>` in `frontend/app/aipanel/aipanel-compat.tsx`.
2. Frontend appends a local user transcript message (`createTranscriptTextMessage("user", prompt)`).
3. Frontend executes `term.send_input` through tools runtime (`executeRunCommandPrompt`).
4. On success, frontend appends a local execution-result assistant message (`Executed \`<command>\`` + output excerpt).
5. Frontend calls `POST /api/v1/agent/terminal-commands/explain`.
6. Backend `ExplainTerminalCommand` currently uses `Conversation.AppendAssistantPrompt(...)`, which persists only the generated assistant explanation message.
7. Frontend appends the last backend assistant message from explain response.

## 2. Local-only transcript entries

- `/run` user prompt echo
- local execution-result message (`Executed ...` block)
- explanation fallback error message when explain request fails

These are created in frontend state only (`messages` in `AIPanelCompatInner`).

## 3. Persisted transcript entries

- Standard conversation prompt/reply pairs via `POST /api/v1/agent/conversation/messages`
- `/run` explain assistant reply via `POST /api/v1/agent/terminal-commands/explain`

Persistence source: `core/conversation.Service` (`conversation.json`).

## 4. Exact truth gap after reload

- Before reload, user sees full `/run` chain in UI: user prompt -> execution result -> explanation.
- After reload/snapshot restore, backend snapshot contains explanation message but does not contain the frontend-local `/run` prompt/result entries.
- Result: `/run` activity trail is partially reconstructed and not fully backend-truth-backed.

## 5. Slice boundary

- No UI redesign
- No command UX changes
- No new execution semantics
