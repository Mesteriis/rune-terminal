# Agent Streaming And Provider Gap Validation

## Last verified state

- Date: `2026-04-21`
- State: `PARTIALLY VERIFIED`
- Scope:
  - current RunaTerminal AI Agent backend and frontend state was audited from source
  - this note tracks the verified gaps around streaming, provider support, and busy/working visibility
  - no runtime behavior was changed in this audit phase

## Commands/tests used

- Repository/source audit:
  - `rg -n "agent|conversation|provider|stream|ollama|selection|terminal-commands/explain" core frontend/src docs`
  - `sed -n '1,260p' core/transport/httpapi/api.go`
  - `sed -n '1,260p' core/transport/httpapi/handlers_agent.go`
  - `sed -n '1,320p' core/transport/httpapi/handlers_agent_conversation.go`
  - `sed -n '1,260p' core/app/runtime.go`
  - `sed -n '1,260p' core/app/conversation_actions.go`
  - `sed -n '1,320p' core/app/ai_terminal_command.go`
  - `sed -n '1,260p' core/conversation/provider.go`
  - `sed -n '1,320p' core/conversation/provider_ollama.go`
  - `sed -n '1,320p' core/conversation/service.go`
  - `sed -n '1,260p' core/conversation/types.go`
  - `sed -n '1,260p' frontend/src/features/agent/api/client.ts`
  - `sed -n '1,260p' frontend/src/features/agent/model/use-agent-panel.ts`
  - `sed -n '1,260p' frontend/src/features/agent/model/panel-state.ts`
  - `sed -n '1,260p' frontend/src/features/agent/model/types.ts`
  - `sed -n '1,260p' frontend/src/widgets/ai/ai-panel-widget.tsx`
  - `sed -n '1,260p' frontend/src/widgets/ai/ai-composer-widget.tsx`
  - `sed -n '1,260p' frontend/src/widgets/ai/ai-prompt-card-widget.tsx`
  - `sed -n '1,220p' frontend/src/shared/model/ai-blocked-widgets.ts`
  - `sed -n '1,220p' frontend/src/widgets/panel/widget-busy-overlay-widget.tsx`
- Historical repo context:
  - `sed -n '1,260p' docs/parity/history/tideterm-feature-inventory.md`

## Known limitations

- This phase verified current state from repository source, not from a live provider-backed agent session.
- Tide/TideTerm reference findings are not included yet in this phase.
- Any capability not directly demonstrated by code is marked `not verified` rather than inferred.

## Evidence

### Current RunaTerminal AI Agent state

#### Backend

- Conversation/message submission flow:
  - `GET /api/v1/agent/conversation` returns `{ conversation: Snapshot }` from `api.runtime.ConversationSnapshot()`.
  - `POST /api/v1/agent/conversation/messages` accepts a prompt plus optional attachment references and conversation context, then calls `api.runtime.SubmitConversationPrompt(...)`.
  - `SubmitConversationPrompt(...)` resolves attachment references, builds context text from the active widget/workspace, reads the current agent selection, composes the effective system prompt, submits to the conversation service, and records an audit event.
  - The conversation service persists the user message first, then performs one provider completion call, then appends a final assistant message after the provider returns.
- Streaming support:
  - No agent conversation streaming transport route is verified in `core/transport/httpapi/api.go`.
  - No partial assistant message lifecycle is verified in `core/conversation/service.go`.
  - The only concrete provider verified in this slice is `OllamaProvider`, and it reports `streaming: false` and sends `stream: false` to the Ollama API in `core/conversation/provider_ollama.go`.
  - Result: current agent conversation flow is request/response, not incremental streaming.
- Provider abstraction:
  - A provider interface exists in `core/conversation/provider.go`.
  - The runtime currently instantiates the conversation service with `conversation.NewOllamaProvider(conversation.DefaultProviderConfig())` in `core/app/runtime.go`.
  - `DefaultProviderConfig()` reads Ollama-specific environment variables.
  - No provider registry, provider factory, or multiple third-party provider implementations were verified in this slice.
  - Result: provider abstraction exists at the interface level, but the runtime path currently appears single-provider and Ollama-backed.
- Current provider/runtime coupling:
  - Agent prompt execution is coupled to runtime selection state (`r.Agent.Selection()`), attachment resolution, widget/workspace context injection, and audit logging.
  - `POST /api/v1/agent/terminal-commands/explain` is a separate AI path coupled to terminal snapshot state, execution blocks, conversation persistence, and audit logging.
- Current API surface verified:
  - `GET /api/v1/agent`
  - `GET /api/v1/agent/conversation`
  - `POST /api/v1/agent/conversation/messages`
  - `POST /api/v1/agent/conversation/attachments/references`
  - `PUT /api/v1/agent/selection/profile`
  - `PUT /api/v1/agent/selection/role`
  - `PUT /api/v1/agent/selection/mode`
  - `POST /api/v1/agent/terminal-commands/explain`
- Message lifecycle behavior:
  - Verified message statuses are only `complete` and `error`.
  - No `pending`, `streaming`, `partial`, or token-delta lifecycle state was verified.
  - Assistant messages are appended after completion, not incrementally.

#### Frontend

- Current visible AI Agent sidebar/panel behavior:
  - The main AI sidebar uses `AiPanelWidget` with `useAgentPanel(...)` as the backend-backed path.
  - `useAgentPanel(...)` loads the full conversation snapshot once and maps it into the existing prompt-card layout.
  - `AiPanelWidget` still preserves the earlier card-based demo structure, but the main path now reads the real backend transcript.
- Request/response vs partial streaming:
  - The frontend agent client only exposes request/response fetch functions.
  - `useAgentPanel(...)` waits for the full `POST /api/v1/agent/conversation/messages` response and then replaces the entire visible conversation state.
  - No SSE, `ReadableStream`, token-delta reducer, or partial assistant rendering path was verified.
  - Result: current frontend behavior is request/response only.
- Busy/loading state:
  - Initial conversation load uses a synthetic loading prompt card (`Loading backend conversation.`).
  - Message submission uses a local `isSubmitting` boolean that disables the composer and send action.
  - Submission failure is rendered as an appended synthetic status/error prompt card.
- Working animation/state visibility:
  - No AI-specific thinking/working animation was verified.
  - `WidgetBusyOverlayWidget` exists in the AI panel tree, but it is driven by `$aiBlockedWidgetHostIds`, which is a manual blocked-widget store unrelated to agent request execution.
  - Result: current AI submit flow has minimal disabled/loading state, but no verified working animation tied to agent execution.
- Mock/demo residue:
  - `frontend/src/widgets/ai/ai-panel-widget.mock.ts` still exists as an isolated mock/demo state source.
  - The current main sidebar path does not use that mock by default.
  - Mock-only approval rows and rollback snapshot affordances remain available when the mock state is explicitly supplied.
- Partial assistant output rendering:
  - Not verified.
  - No partial-output renderer or token-by-token transcript update path was found in the current AI widget/model files.
