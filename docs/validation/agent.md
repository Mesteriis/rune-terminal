# Agent Validation

## Last verified state

- Date: `2026-04-21`
- State: `PARTIALLY VERIFIED`
- Scope:
  - backend agent/provider catalog now supports direct `codex` providers that read existing local Codex CLI auth from `~/.codex/auth.json` and talk to the Codex/OpenAI Responses API without exposing credentials through transport
  - backend agent/provider catalog also supports a `proxy` kind, which stores a backend-owned multi-channel account/router configuration instead of a single direct upstream
  - the new `core/aiproxy` domain adapts TideTerm proxy concepts into `rterm` backend rules: channel validation, masked API key storage, priority/failover selection, and direct protocol adapters for OpenAI-compatible, Claude-compatible, and Gemini upstreams
  - the new `core/codexauth` domain resolves local Codex auth state for status/reporting and runtime credential loading, which keeps the frontend/provider catalog secret-free while still showing whether machine auth is ready
  - proxy provider updates now preserve existing stored channel API keys when a channel is updated by id without a new `api_keys` payload, which keeps masked-secret frontend editing safe by default
  - the shell-wide settings modal now renders a real settings-navigation shell inside its body without changing the shared modal chrome: `General`, `AI`, `Terminal`, and `Commander` live in a left sidebar, and the provider-management editor now sits under `AI > Установленные приложения`
  - the frontend provider editor now resolves through typed agent-provider transport adapters and draft serializers instead of inline modal state: `features/agent/api/provider-client.ts` owns the backend routes, `provider-settings-draft.ts` owns create/update payload shaping, and `use-agent-provider-settings.ts` owns editor state
  - the frontend settings surface now treats `codex` as a separate local-auth provider instead of folding it into the generic `openai` API-key form; the editor can show backend-detected auth state while leaving the shared modal shell untouched
  - `ollama`, `codex`, and `openai` settings now load model catalogs from the backend and present model selection through dropdowns instead of forcing manual model typing; the inline action remains only as an explicit retry path
  - the proxy editor now exposes multi-channel routing inside settings, including service type, base URLs, priority/status, model mapping, TLS skip, and masked key replacement/preservation semantics for each channel
  - conversation runtime resolution can now materialize the active provider from direct `ollama` / `codex` / `openai` records or from the internal proxy provider record
  - proxy-routed conversation streaming is currently buffered at the provider boundary for Claude/Gemini channels, so the SSE route still works but does not yet expose true token-by-token deltas for those upstreams
  - frontend AI sidebar main path loads backend conversation state from `GET /api/v1/agent/conversation`
  - existing textarea + send icon submit to `POST /api/v1/agent/conversation/messages/stream`
  - transcript rendering now projects backend messages into a chat-focused `ChatMessageView` instead of the earlier prompt/snapshot card model
  - the visible transcript is now a single bottom-appended message stream in natural chronological order instead of nested cards or snapshot containers
  - user messages render as right-aligned bubbles and assistant messages render as left-aligned bubbles with no visible `Assistant N` / snapshot-era labels
  - the AI transcript now also supports explicit `plan`, `approval`, `audit`, and `questionnaire` message types in the frontend view model without changing the backend conversation payload
  - frontend submit now classifies each prompt into `chat`, `execution`, or `question` intent using a UI-local tool heuristic; empty or missing tool sets force the prompt into `chat`
  - pure chat prompts stream to the backend immediately with no plan, no approval gate, and no audit block
  - execution prompts render a local plan first, require explicit approval before the backend stream starts, and keep approval cancellation entirely on the frontend path
  - questionnaire prompts override execution gating until the user answers; the plan is deferred until the prompt is reclassified after that answer
  - a frontend audit block now renders only for approved execution flows and updates status around the real backend stream lifecycle (`pending` / `running` / `done` / `error`)
  - assistant execution metadata is hidden by default behind a per-message `Show details` toggle, with `prompt`, `reasoning`, `summary`, and compact metadata rendered only in the secondary details surface
  - assistant rows now expose a subdued `{model} · {status}` line below the main bubble
  - user prompts and the assistant replies beneath them are visually grouped with tighter pair spacing, while separate exchanges retain a larger gap
  - transcript scrolling is now bottom-anchor aware: if the user is already near the latest message the viewport snaps to the bottom on updates, otherwise the viewport offset is preserved while new content is appended below
  - a UI-only `chat` / `dev` / `debug` header control now switches transcript visibility instantly without reload; it does not call backend agent mode selection routes
  - runtime transport still resolves through the shared frontend runtime context and no backend contract, API field, or execution pipeline change was introduced
  - visible assistant output still updates incrementally from backend stream events and the busy overlay/composer disabled state remains tied to the real stream lifecycle

## Commands/tests used

- Repository/contract audit:
  - `sed -n '1,260p' core/aiproxy/types.go`
  - `sed -n '1,260p' core/aiproxy/provider.go`
  - `sed -n '1,260p' core/codexauth/state.go`
  - `sed -n '1,260p' core/agent/provider_types.go`
  - `sed -n '1,360p' core/agent/provider_store.go`
  - `sed -n '1,260p' core/app/provider_runtime.go`
  - `sed -n '1,280p' core/transport/httpapi/handlers_agent_providers.go`
  - `rg -n "agent|conversation|profile|role|mode|attachments/references" README.md docs frontend/src core`
  - `sed -n '1,240p' core/transport/httpapi/handlers_agent.go`
  - `sed -n '1,260p' core/transport/httpapi/handlers_agent_conversation.go`
  - `sed -n '1,260p' core/agent/view.go`
  - `sed -n '1,260p' core/conversation/types.go`
  - `sed -n '1,260p' core/app/conversation_actions.go`
  - `sed -n '1,260p' core/app/conversation_attachments.go`
  - `sed -n '1,380p' core/transport/httpapi/handlers_agent_conversation_test.go`
- Frontend targeted validation:
  - `npm --prefix frontend run lint:active`
  - `npm --prefix frontend run test -- src/features/agent/api/provider-client.test.ts src/features/agent/model/provider-settings-draft.test.ts src/shared/ui/components/dialog-popup.test.tsx`
  - `npm --prefix frontend run test -- --reporter verbose --testTimeout=10000 src/features/agent/model/interaction-flow.test.ts src/widgets/ai/ai-panel-widget.test.tsx src/widgets/ai/ai-chat-message-widget.test.tsx`
  - `npm --prefix frontend run build`
- Backend targeted validation:
  - `go test ./core/codexauth ./core/conversation ./core/agent ./core/app ./core/transport/httpapi`
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
- The settings-surface provider editor currently treats replacement key input as newline-separated enabled keys only; it does not expose per-key enabled/disabled toggles or a richer per-account secret management workflow yet.
- The Codex settings surface currently depends on a pre-existing local `codex` login. It does not yet expose the browser/device-auth callback flow inside `rterm`.
- Proxy-routed Claude/Gemini conversation traffic currently uses buffered completion under `POST /api/v1/agent/conversation/messages/stream`; the route remains SSE, but delta granularity for those upstreams is not yet equivalent to the direct OpenAI/Ollama paths.
- `npm run tauri:dev` was not rerun for this exact transcript refactor, so the supported desktop startup smoke remains outstanding for this slice even though `npm run validate` passed.
- `frontend/src/widgets/ai/ai-panel-widget.mock.ts` remains in the repository for isolated override/test scaffolding only; it is no longer the main execution path for the AI sidebar.
- The earlier prompt/snapshot card component path has been removed from the active frontend tree.
- Plan, approval, audit, and questionnaire messages are simulated in the frontend view-model layer because the current backend conversation stream does not emit those states directly.

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

### Backend provider/proxy catalog contract added in this slice

- `GET /api/v1/agent/providers`
  - returns `providers[]`, `active_provider_id`, and `supported_kinds`
  - `supported_kinds` now includes `codex` and `proxy`
- `POST /api/v1/agent/providers`
  - accepts `kind: "codex"` with:
    - `codex.model`
    - optional `codex.auth_file_path`
  - provider views expose only non-secret Codex auth metadata:
    - `auth_state`
    - `auth_mode`
    - `status_message`
    - `last_refresh`
    - `account_id`
- `POST /api/v1/agent/providers`
  - now accepts `kind: "proxy"` with:
    - `proxy.model`
    - `proxy.channels[]`
    - per-channel `service_type`, `base_url` / `base_urls`, `api_keys`, `auth_type`, `priority`, `status`, `model_mapping`
- `PATCH /api/v1/agent/providers/{providerID}`
  - now accepts `codex` updates for model/auth-file path and `proxy` updates for model and full channel replacement
- `POST /api/v1/agent/providers/models`
  - now loads backend-owned model catalogs for `ollama`, `codex`, and `openai`
  - the current frontend uses it both for provider dropdowns and for the read-oriented `AI > Модели` directory in the shell settings modal
- provider views mask proxy secrets:
  - channel API key values are never returned
  - channel views expose `key_count` and `enabled_key_count` instead

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
  - [frontend/src/features/agent/model/interaction-flow.ts](../../frontend/src/features/agent/model/interaction-flow.ts)
  - [frontend/src/features/agent/model/panel-state.ts](../../frontend/src/features/agent/model/panel-state.ts)
  - [frontend/src/features/agent/model/use-agent-panel.ts](../../frontend/src/features/agent/model/use-agent-panel.ts)
  - [frontend/src/shared/model/ai-blocked-widgets.ts](../../frontend/src/shared/model/ai-blocked-widgets.ts)
- Existing widget surface kept in place:
  - [frontend/src/app/app-ai-sidebar.tsx](../../frontend/src/app/app-ai-sidebar.tsx)
  - [frontend/src/widgets/ai/ai-panel-widget.tsx](../../frontend/src/widgets/ai/ai-panel-widget.tsx)
  - [frontend/src/widgets/ai/ai-panel-header-widget.tsx](../../frontend/src/widgets/ai/ai-panel-header-widget.tsx)
  - [frontend/src/widgets/ai/ai-chat-message-widget.tsx](../../frontend/src/widgets/ai/ai-chat-message-widget.tsx)
  - [frontend/src/widgets/ai/approval-message-block.tsx](../../frontend/src/widgets/ai/approval-message-block.tsx)
  - [frontend/src/widgets/ai/audit-message-block.tsx](../../frontend/src/widgets/ai/audit-message-block.tsx)
  - [frontend/src/widgets/ai/ai-composer-widget.tsx](../../frontend/src/widgets/ai/ai-composer-widget.tsx)
  - [frontend/src/widgets/ai/chat-text-message-widget.tsx](../../frontend/src/widgets/ai/chat-text-message-widget.tsx)
  - [frontend/src/widgets/ai/plan-message-block.tsx](../../frontend/src/widgets/ai/plan-message-block.tsx)
  - [frontend/src/widgets/ai/questionnaire-message-block.tsx](../../frontend/src/widgets/ai/questionnaire-message-block.tsx)
  - [frontend/src/widgets/ai/ai-panel-widget.mock.ts](../../frontend/src/widgets/ai/ai-panel-widget.mock.ts)
  - [frontend/src/widgets/ai/ai-chat-message-widget.test.tsx](../../frontend/src/widgets/ai/ai-chat-message-widget.test.tsx)
  - [frontend/src/widgets/ai/ai-panel-widget.test.tsx](../../frontend/src/widgets/ai/ai-panel-widget.test.tsx)

### Exact main-path replacement that happened

- The `AiPanelWidget` default path no longer uses `aiPanelWidgetMockState`.
- The sidebar no longer projects backend conversation messages into the old prompt/snapshot card layout.
- The visible transcript now renders backend messages through the chat-focused `ChatMessageView` mapper, keeps execution/audit data out of the primary bubble surface, and orders the stream oldest-first so the latest exchange stays at the bottom.
- The existing textarea and send icon still lead to the backend SSE route, but pure chat prompts now go there immediately while tool-backed execution prompts stay behind the frontend-local planning and approval gate.
- The visible transcript now classifies prompts before rendering any secondary execution UI: `chat` prompts stay as plain bubbles, `execution` prompts append a local plan and approval gate, and `question` prompts append only the questionnaire until the answer is provided.
- The visible transcript now appends the local user message immediately, appends the assistant entry on `message-start`, and updates assistant content incrementally on `text-delta` without forcing the viewport away from older messages being read.
- The visible transcript now appends an audit block only when approval is granted for an execution flow and updates that audit block as the real backend stream progresses or fails.
- Backend error events and stream transport failures still surface inside the existing transcript surface instead of adding a new panel, toast, or control.
- Assistant details are now collapsed by default in `chat` mode, auto-expanded in `dev` mode, and always visible in `debug` mode.

### Busy-state behavior

- Busy state begins when the visible sidebar starts a real stream submission.
- The existing composer is now also disabled while a local plan/questionnaire/approval flow is pending, so execution cannot bypass the approval gate through duplicate submits.
- The existing widget busy overlay is now driven by the real stream lifecycle for the AI sidebar instead of only by manual demo toggling.
- Busy state clears on `message-complete`, `error`, or stream abort/cleanup.
- No timer-driven busy simulation was added.

### Remaining demo/static-only paths

- `frontend/src/widgets/ai/ai-panel-widget.mock.ts`
  - retained only for explicit override/test scaffolding using the new chat message model

### Formatting change record

- Formatting changes:
  - prompt/snapshot cards were replaced with conversational left/right chat bubbles
  - the transcript was reordered into a bottom-appended natural chat stream
  - scroll updates now preserve the reader position unless the viewport is already near the latest message anchor at the bottom
  - the transcript now also renders dedicated plan, approval, audit, and questionnaire blocks alongside chat bubbles when the classified prompt intent requires them
  - the composer path now pauses on a frontend approval gate only for execution-classified prompts before the backend stream starts
  - assistant execution details moved into a collapsed secondary panel
  - assistant rows gained a subdued compact metadata line
  - the AI header gained a UI-only `chat` / `dev` / `debug` visibility control
  - spacing, pair grouping, max width, line height, and contrast were tuned to reduce transcript noise

### Placement blockers requiring user direction

- Profile/role/mode selector placement is not defined in the current AI sidebar.
- Attachment reference control placement is not defined in the current AI sidebar.

If those controls are required next, the user must specify exactly where they should be placed before any visible UI is added or repurposed.
