# Agent Validation

## Last verified state

- Date: `2026-04-21`
- State: `PARTIALLY VERIFIED`
- Scope:
  - frontend AI sidebar main path loads backend conversation state from `GET /api/v1/agent/conversation`
  - existing textarea + send icon submit to `POST /api/v1/agent/conversation/messages/stream`
  - transcript rendering now projects backend messages into a chat-focused `ChatMessageView` instead of the earlier prompt/snapshot card model
  - the visible transcript is now a single top-anchored message stream with newest messages first instead of nested cards or snapshot containers
  - user messages render as right-aligned bubbles and assistant messages render as left-aligned bubbles with no visible `Assistant N` / snapshot-era labels
  - assistant execution metadata is hidden by default behind a per-message `Show details` toggle, with `prompt`, `reasoning`, `summary`, and compact metadata rendered only in the secondary details surface
  - assistant rows now expose a subdued `{model} · {status}` line below the main bubble
  - assistant replies and the user prompts beneath them are visually grouped with tighter pair spacing, while separate exchanges retain a larger gap
  - transcript scrolling is now top-anchor aware: if the user is already near the latest message the viewport snaps to the top on updates, otherwise the viewport offset is preserved while new content is inserted above
  - a UI-only `chat` / `dev` / `debug` header control now switches transcript visibility instantly without reload; it does not call backend agent mode selection routes
  - runtime transport still resolves through the shared frontend runtime context and no backend contract, API field, or execution pipeline change was introduced
  - visible assistant output still updates incrementally from backend stream events and the busy overlay/composer disabled state remains tied to the real stream lifecycle

## Commands/tests used

- Repository/contract audit:
  - `rg -n "agent|conversation|profile|role|mode|attachments/references" README.md docs frontend/src core`
  - `sed -n '1,240p' core/transport/httpapi/handlers_agent.go`
  - `sed -n '1,260p' core/transport/httpapi/handlers_agent_conversation.go`
  - `sed -n '1,260p' core/agent/view.go`
  - `sed -n '1,260p' core/conversation/types.go`
  - `sed -n '1,260p' core/app/conversation_actions.go`
  - `sed -n '1,260p' core/app/conversation_attachments.go`
  - `sed -n '1,380p' core/transport/httpapi/handlers_agent_conversation_test.go`
- Frontend targeted validation:
  - `npm --prefix frontend run test -- --reporter verbose --testTimeout=10000 src/widgets/ai/ai-panel-widget.test.tsx`
  - `npm --prefix frontend run build`
- Repository validation sweep:
  - `npm run validate`

## Known limitations

- No current visible profile, role, or mode selector exists in the AI sidebar, so the existing selection routes are not wired to the UI:
  - `GET /api/v1/agent`
  - `PUT /api/v1/agent/selection/profile`
  - `PUT /api/v1/agent/selection/role`
  - `PUT /api/v1/agent/selection/mode`
- The visible `chat` / `dev` / `debug` header toggle is presentation-only transcript state. It does not read or write the backend agent mode catalog and must not be treated as the transport-backed work-mode selector.
- No current visible attachment-reference control exists in the AI sidebar, so `POST /api/v1/agent/conversation/attachments/references` is implemented in the frontend API client but not wired to the UI.
- `npm run tauri:dev` was not rerun for this exact transcript refactor, so the supported desktop startup smoke remains outstanding for this slice even though `npm run validate` passed.
- `frontend/src/widgets/ai/ai-panel-widget.mock.ts` remains in the repository for isolated override/test scaffolding only; it is no longer the main execution path for the AI sidebar.
- The earlier prompt/snapshot card component path has been removed from the active frontend tree.

## Evidence

### Backend contracts used on the main path

- `GET /api/v1/agent/conversation`
  - response body: `{ "conversation": Snapshot }`
  - `Snapshot` shape:
    - `messages: Message[]`
    - `provider: { kind, base_url, model?, streaming }`
    - `updated_at`
- `POST /api/v1/agent/conversation/messages/stream`
  - request body:
    - `prompt: string`
    - `attachments?: AttachmentReference[]`
    - `context: ConversationContext`
  - `ConversationContext` fields used by the frontend main path:
    - `action_source`
    - `active_widget_id`
    - `repo_root`
    - `widget_context_enabled`
  - success transport:
    - `text/event-stream`
    - event mapping on the visible sidebar path:
      - `message-start`
        - creates or updates the pending assistant transcript entry
      - `text-delta`
        - appends partial assistant content into the existing transcript entry
      - `message-complete`
        - finalizes the assistant transcript entry and clears working state
      - `error`
        - finalizes the assistant error state when a message payload is present, or appends the existing backend error status prompt when only an error string is present

### Backend contracts retained in the frontend client but not used on the visible submit path

- `POST /api/v1/agent/conversation/messages`
  - retained as a non-stream request/response client path for compatibility/fallback isolation
  - not used by the current visible AI sidebar submit flow

### Backend contracts implemented in the frontend client but not wired to visible controls

- `GET /api/v1/agent`
- `PUT /api/v1/agent/selection/profile`
- `PUT /api/v1/agent/selection/role`
- `PUT /api/v1/agent/selection/mode`
- `POST /api/v1/agent/conversation/attachments/references`

These client functions were added so the frontend follows the real backend contract surface, but the visible UI wiring is intentionally deferred until the user specifies where those controls should live.

### Frontend files integrated

- Runtime transport / backend client:
  - [frontend/src/features/agent/api/client.ts](../../frontend/src/features/agent/api/client.ts)
  - [frontend/src/features/agent/api/client.test.ts](../../frontend/src/features/agent/api/client.test.ts)
- Agent model / backend-to-view projection:
  - [frontend/src/features/agent/model/types.ts](../../frontend/src/features/agent/model/types.ts)
  - [frontend/src/features/agent/model/chat-message-view.ts](../../frontend/src/features/agent/model/chat-message-view.ts)
  - [frontend/src/features/agent/model/panel-state.ts](../../frontend/src/features/agent/model/panel-state.ts)
  - [frontend/src/features/agent/model/use-agent-panel.ts](../../frontend/src/features/agent/model/use-agent-panel.ts)
  - [frontend/src/shared/model/ai-blocked-widgets.ts](../../frontend/src/shared/model/ai-blocked-widgets.ts)
- Existing widget surface kept in place:
  - [frontend/src/app/app-ai-sidebar.tsx](../../frontend/src/app/app-ai-sidebar.tsx)
  - [frontend/src/widgets/ai/ai-panel-widget.tsx](../../frontend/src/widgets/ai/ai-panel-widget.tsx)
  - [frontend/src/widgets/ai/ai-panel-header-widget.tsx](../../frontend/src/widgets/ai/ai-panel-header-widget.tsx)
  - [frontend/src/widgets/ai/ai-chat-message-widget.tsx](../../frontend/src/widgets/ai/ai-chat-message-widget.tsx)
  - [frontend/src/widgets/ai/ai-composer-widget.tsx](../../frontend/src/widgets/ai/ai-composer-widget.tsx)
  - [frontend/src/widgets/ai/ai-panel-widget.mock.ts](../../frontend/src/widgets/ai/ai-panel-widget.mock.ts)
  - [frontend/src/widgets/ai/ai-panel-widget.test.tsx](../../frontend/src/widgets/ai/ai-panel-widget.test.tsx)

### Exact main-path replacement that happened

- The `AiPanelWidget` default path no longer uses `aiPanelWidgetMockState`.
- The sidebar no longer projects backend conversation messages into the old prompt/snapshot card layout.
- The visible transcript now renders backend messages through the chat-focused `ChatMessageView` mapper, keeps execution/audit data out of the primary bubble surface, and orders the stream newest-first so the latest exchange stays at the top.
- The existing textarea and send icon still submit through the backend SSE route.
- The visible transcript now prepends the local user message immediately, prepends the assistant entry on `message-start`, and updates assistant content incrementally on `text-delta` without forcing the viewport away from older messages being read.
- Backend error events and stream transport failures still surface inside the existing transcript surface instead of adding a new panel, toast, or control.
- Assistant details are now collapsed by default in `chat` mode, auto-expanded in `dev` mode, and always visible in `debug` mode.

### Busy-state behavior

- Busy state begins when the visible sidebar starts a real stream submission.
- The existing composer remains disabled while the stream is active.
- The existing widget busy overlay is now driven by the real stream lifecycle for the AI sidebar instead of only by manual demo toggling.
- Busy state clears on `message-complete`, `error`, or stream abort/cleanup.
- No timer-driven busy simulation was added.

### Remaining demo/static-only paths

- `frontend/src/widgets/ai/ai-panel-widget.mock.ts`
  - retained only for explicit override/test scaffolding using the new chat message model

### Formatting change record

- Formatting changes:
  - prompt/snapshot cards were replaced with conversational left/right chat bubbles
  - the transcript was reordered into a newest-first top-anchored stream
  - scroll updates now preserve the reader position unless the viewport is already near the latest message anchor
  - assistant execution details moved into a collapsed secondary panel
  - assistant rows gained a subdued compact metadata line
  - the AI header gained a UI-only `chat` / `dev` / `debug` visibility control
  - spacing, pair grouping, max width, line height, and contrast were tuned to reduce transcript noise

### Placement blockers requiring user direction

- Profile/role/mode selector placement is not defined in the current AI sidebar.
- Attachment reference control placement is not defined in the current AI sidebar.

If those controls are required next, the user must specify exactly where they should be placed before any visible UI is added or repurposed.
