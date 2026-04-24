# Agent Validation

## Last verified state

- Date: `2026-04-24`
- State: `VERIFIED`
- Scope:
  - DB-backed AI conversations with explicit create/switch/rename lifecycle
  - provider-native CLI session continuity scoped per conversation
  - shell-visible AI conversation navigator with recent-thread menu over the same backend conversation contract
  - backend-owned agent provider catalog
  - active conversation provider resolution
  - frontend AI/provider settings surfaces
  - frontend-owned AI composer submit-shortcut preference (`Enter` vs `Ctrl/Cmd+Enter`)
  - narrow OpenAI-compatible HTTP source discovery/completion path
  - AI toolbar provider/model selection over the backend provider catalog
  - AI composer request-context toolbar trigger with explicit widget multiselect
  - AI composer context quick actions (`Use current`, `Only current`, `All widgets`, `Use default`) over the existing workspace/widget context contract
  - AI composer visible selected-context strip with direct remove actions for chosen widgets
  - AI composer two-row toolbar grouping with explicit `Source / Model / Context` field labels
  - AI composer denser request-context dropdown summary block and widget option rows
  - AI assistant message meta row and details panel chrome refinement
  - frontend `/run ...` routing from the AI sidebar into the active terminal widget through backend tool execution plus terminal-command explanation
  - browser-level Playwright coverage for the AI sidebar over the split local dev path:
    - settings navigation for provider/model/limits/terminal/commander sections
    - settings navigation for the dedicated `AI / Composer` section
    - live Codex CLI chat request/response through the real backend conversation route
    - explicit widget-context selection in the composer and `widget_ids` propagation into the stream request body
    - settings-driven keyboard submit behavior: `Enter` newline plus `Ctrl/Cmd+Enter` submit
    - conversation persistence across AI panel reload/reopen with backend conversation switching
    - shell-visible conversation menu for recent thread selection, `New` creation, and active-thread rename
    - live Claude provider routing with explicit `auth-required` handling when the local CLI is installed but not logged in
    - `/run printf ...` sending input into the active terminal session without falling back to plain provider chat

## Current provider contract

- AI conversations are now backend-owned thread entities persisted in `runtime.db`:
  - one active conversation for the shell at a time
  - explicit list/create/activate/rename transport routes
  - messages persisted per conversation
  - provider session metadata persisted per conversation
  - the AI shell header now projects that contract through a conversation navigator menu with active-thread summary, recent thread list, `New` creation action, and inline rename for the active thread
- CLI-backed provider session continuity is conversation-scoped:
  - `codex` reuses the stored provider-native thread id for the active conversation
  - `claude` reuses the stored session id for the active conversation
  - hidden helper/explain flows intentionally do not mutate the stored provider-native session
- Active provider kinds are:
  - `codex`: local Codex CLI through `codex exec`
  - `claude`: local Claude Code CLI through `claude -p`
  - `openai-compatible`: operator-supplied HTTP source using `/v1/models` and `/v1/chat/completions`
- The active runtime still does not include `ollama`, the earlier internal AI proxy draft, or a broad provider/API-key universe.
- Unsupported legacy provider records are filtered during agent-state normalization. If filtering leaves no providers, the store recreates the default local CLI providers.
- The provider catalog route returns `supported_kinds: ["codex", "claude", "openai-compatible"]`.
  - The AI composer toolbar now consumes that backend-owned catalog directly:
  - provider switcher
  - model switcher scoped to the active provider's `chat_models`
  - explicit widget-context trigger with visible selection summary
  - explicit widget-context multiselect
  - explicit context quick actions inside the request-context dropdown
  - explicit selected-context strip with direct remove actions in the composer body
  - explicit two-row toolbar grouping with `Source / Model / Context` labels over the existing selector contract
  - denser request-context dropdown summary block and widget option rows without changing selection semantics
- The AI composer submit shortcut is frontend-owned UI state:
  - default: `Enter` submits, `Shift+Enter` inserts a new line
  - alternate mode: `Enter` inserts a new line, `Ctrl/Cmd+Enter` submits
  - persistence is local to the shell UI and does not extend the backend provider/runtime contract

## `/run` contract

- `/run <command>` is now a frontend-owned branch in the AI sidebar, not a plain chat prompt.
- The frontend resolves the active terminal target from the current Dockview terminal panel registry, then:
  - reads the target terminal snapshot with `GET /api/v1/terminal/{widgetID}`
  - sends input through `POST /api/v1/tools/execute` using `term.send_input`
  - waits briefly for post-command terminal output
  - appends the backend-owned execution transcript/explanation chain through `POST /api/v1/agent/terminal-commands/explain`
- `widget_context_enabled` remains valid for conversation/explain routes, but is intentionally omitted from `POST /api/v1/tools/execute` because that transport contract does not accept it.
- Plain conversation requests now also support explicit `widget_ids` in the conversation context. The composer dropdown resolves widget options from `GET /api/v1/workspace`, and the backend context/audit path now uses that explicit widget list instead of only `active_widget_id`.
- The visible context trigger in the composer remains frontend-owned UX over that same contract:
  - the closed trigger summarizes the effective selection state (`Context off`, active widget title, or widget count)
  - the dropdown exposes `Use current`, `Only current`, `All widgets`, and `Use default` actions without introducing a second backend context model
- The selected widget set is now also visible outside the dropdown:
  - explicit selections render as removable chips in the composer body
  - removing chips narrows both `widget_ids` and `active_widget_id` to the remaining explicit selection, matching the current frontend context contract
- The dropdown body itself is now denser but semantically unchanged:
  - summary rows render inside a compact grouped block
  - searchable widget options use tighter rows with clearer `Selected` / `Add` status chips
- Assistant chat messages now also use denser presentation-only chrome without changing message semantics:
  - assistant model/status metadata and the details toggle share one compact action row under the bubble
  - expanded details render inside a grouped panel with an explicit header and per-field inset sections
  - chat/dev/debug visibility behavior for details is unchanged

## Commands/tests used

- `go test ./core/agent ./core/conversation ./core/app ./core/transport/httpapi`
- `./scripts/go.sh test ./core/conversation ./core/transport/httpapi ./core/app`
- `go test ./core/...`
- `./scripts/go.sh test ./core/app ./core/transport/httpapi`
- `./scripts/go.sh test ./core/agent ./core/app ./core/conversation ./core/transport/httpapi`
- `npm --prefix frontend run test -- src/features/agent/api/client.test.ts src/widgets/ai/ai-panel-header-widget.test.tsx src/widgets/ai/ai-panel-widget.test.tsx`
- `npm --prefix frontend run test -- src/features/agent/api/client.test.ts src/features/agent/api/provider-client.test.ts src/features/agent/model/provider-settings-draft.test.ts src/widgets/ai/ai-panel-widget.test.tsx`
- `npm --prefix frontend run test -- src/shared/api/workspace.test.ts src/features/agent/api/client.test.ts src/widgets/ai/ai-panel-widget.test.tsx`
- `npm --prefix frontend run test -- src/features/agent/model/use-ai-composer-preferences.test.tsx src/widgets/ai/ai-composer-widget.test.tsx src/widgets/ai/ai-panel-widget.test.tsx`
- `npm --prefix frontend run test -- src/widgets/ai/ai-composer-widget.test.tsx src/widgets/ai/ai-panel-widget.test.tsx src/shared/ui/components/accessibility-contracts.test.tsx`
- `npm --prefix frontend run test -- src/widgets/ai/ai-chat-message-widget.test.tsx src/widgets/ai/ai-panel-widget.test.tsx`
- `npm --prefix frontend run lint:active`
- `npm run test:ui -- --reporter=line`
- `npm run test:ui -- --reporter=line e2e/ai.spec.ts`
- `npm run tauri:dev`
- `curl -sS http://192.168.1.8:8317/v1/models`
- `curl -sS http://192.168.1.8:8317/v1/chat/completions -H 'Content-Type: application/json' -d '{"model":"gpt-5.4","messages":[{"role":"user","content":"Reply with exactly this token and nothing else: endpoint-ok-1777"}]}'`
- `codex login status`
- `printf 'Return exactly CODEX_E2E_OK\n' | codex exec --color never --sandbox read-only --skip-git-repo-check --ephemeral --output-last-message -`
- `claude auth status --json`
- `python3 -m py_compile scripts/validate_workspace_navigation.py scripts/validate_operator_workflow.py`
- `python3 scripts/validate_operator_workflow.py`
- `python3 scripts/validate_workspace_navigation.py`

## Known limitations

- conversation management is still intentionally narrow: create + switch + active-thread rename only. Archive, delete, search, and multi-panel conversation views are not implemented in this slice.
- CLI providers currently expose buffered chat completion through the existing SSE route; token-by-token provider streaming is not implemented.
- CLI-native tool calls are not yet mediated through `core/toolruntime`, policy approval, or audit events.
- The OpenAI-compatible HTTP source path is also buffered and non-streaming in this slice.
- No current visible profile, role, or mode selector exists in the AI sidebar, so those backend selection routes remain unwired to user controls.
- `/run` currently surfaces approval-required toolruntime responses as a chat-side error/status message; there is no dedicated approval-confirmation UI for this path yet.
- On this machine the local `claude` binary is installed but not authenticated, so the verified browser path is `auth-required` handling rather than a successful Claude completion.
- The composer shortcut preference is intentionally local UI state today; there is no backend/user-profile sync for this behavior.

## Related validation

- Provider settings details: [settings-providers.md](./settings-providers.md)
