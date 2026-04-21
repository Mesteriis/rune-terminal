# Agent Validation

## Last verified state

- Date: `2026-04-21`
- State: `PARTIALLY VERIFIED`
- Scope:
  - frontend AI sidebar main path now loads backend conversation state from `GET /api/v1/agent/conversation`
  - existing textarea + send icon now submit to `POST /api/v1/agent/conversation/messages/stream`
  - runtime transport resolves through the shared frontend runtime context; no localhost hardcoding was introduced
  - visible assistant output now updates incrementally from backend stream events on the main sidebar path
  - the existing busy overlay and composer disabled state are now driven by the real stream lifecycle
  - current formatting, spacing, layout, hierarchy, typography, and control placement were intentionally preserved
  - profile/role/mode selection and attachment reference UI remain blocked because there is no existing approved visible control for them in the current AI sidebar

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
  - `npm --prefix frontend run test -- --reporter verbose --testTimeout=10000 src/features/agent/api/client.test.ts`
  - `npm --prefix frontend run test -- --reporter verbose --testTimeout=10000 src/widgets/ai/ai-panel-widget.test.tsx src/features/agent/api/client.test.ts`
  - `npm --prefix frontend run build`
- Desktop startup smoke:
  - `npm run tauri:dev`
  - observed successful compile/start on the supported npm Tauri entrypoint before manual stop

## Known limitations

- No current visible profile, role, or mode selector exists in the AI sidebar, so the existing selection routes are not wired to the UI:
  - `GET /api/v1/agent`
  - `PUT /api/v1/agent/selection/profile`
  - `PUT /api/v1/agent/selection/role`
  - `PUT /api/v1/agent/selection/mode`
- No current visible attachment-reference control exists in the AI sidebar, so `POST /api/v1/agent/conversation/attachments/references` is implemented in the frontend API client but not wired to the UI.
- The existing AI header settings button and composer options button remain presentational. Reusing either one for selectors or attachment flow would introduce new visible behavior and requires explicit placement approval.
- `frontend/src/widgets/ai/ai-panel-widget.mock.ts` remains in the repository for isolated override/test scaffolding only; it is no longer the main execution path for the AI sidebar.
- Mock-only rollback snapshots and mock approval rows still exist in that isolated scaffolding path and are not part of the backend-backed main sidebar flow.

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
        - creates or updates the pending assistant card
      - `text-delta`
        - appends partial assistant content into the existing transcript card
      - `message-complete`
        - finalizes the assistant card and clears working state
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
  - [frontend/src/features/agent/model/panel-state.ts](../../frontend/src/features/agent/model/panel-state.ts)
  - [frontend/src/features/agent/model/use-agent-panel.ts](../../frontend/src/features/agent/model/use-agent-panel.ts)
  - [frontend/src/shared/model/ai-blocked-widgets.ts](../../frontend/src/shared/model/ai-blocked-widgets.ts)
- Existing widget surface kept in place:
  - [frontend/src/widgets/ai/ai-panel-widget.tsx](../../frontend/src/widgets/ai/ai-panel-widget.tsx)
  - [frontend/src/widgets/ai/ai-composer-widget.tsx](../../frontend/src/widgets/ai/ai-composer-widget.tsx)
  - [frontend/src/widgets/ai/ai-prompt-card-widget.tsx](../../frontend/src/widgets/ai/ai-prompt-card-widget.tsx)
  - [frontend/src/widgets/ai/ai-panel-widget.mock.ts](../../frontend/src/widgets/ai/ai-panel-widget.mock.ts)
  - [frontend/src/widgets/ai/ai-panel-widget.test.tsx](../../frontend/src/widgets/ai/ai-panel-widget.test.tsx)

### Exact main-path replacement that happened

- The `AiPanelWidget` default path no longer uses `aiPanelWidgetMockState`.
- The existing card stack now projects backend conversation messages into the current prompt-card layout without moving or restyling the widget.
- The existing textarea and send icon now submit through the backend SSE route instead of waiting for a full request/response transcript replacement.
- The visible transcript now appends a local user message immediately, creates the assistant entry on `message-start`, and updates assistant content incrementally on `text-delta`.
- Backend error events and stream transport failures are surfaced inside the existing card stack instead of adding a new panel, toast, or control.

### Busy-state behavior

- Busy state begins when the visible sidebar starts a real stream submission.
- The existing composer remains disabled while the stream is active.
- The existing widget busy overlay is now driven by the real stream lifecycle for the AI sidebar instead of only by manual demo toggling.
- Busy state clears on `message-complete`, `error`, or stream abort/cleanup.
- No timer-driven busy simulation was added.

### Remaining demo/static-only paths

- `frontend/src/widgets/ai/ai-panel-widget.mock.ts`
  - retained only for explicit override/test scaffolding
- rollback snapshot toggling in `AiPromptCardWidget`
  - only active when rollback data is supplied through the mock override path
- approval rows in `AiPromptCardWidget`
  - only active when approval mock data is supplied through the mock override path

### Formatting change record

- Formatting changes: `none`
- No layout, spacing, visual hierarchy, typography, or component placement changes were introduced in this integration slice.

### Placement blockers requiring user direction

- Profile/role/mode selector placement is not defined in the current AI sidebar.
- Attachment reference control placement is not defined in the current AI sidebar.

If those controls are required next, the user must specify exactly where they should be placed before any visible UI is added or repurposed.
