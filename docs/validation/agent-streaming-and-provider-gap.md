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
- Tide/TideTerm reference source audit:
  - `curl -fsSL 'https://api.github.com/repos/sanshao85/tideterm/git/trees/main?recursive=1' | rg 'aipanel|aiusechat|waveai|provider|gemini|anthropic|openai|chat'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/frontend/app/aipanel/aipanel.tsx'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/frontend/app/aipanel/aipanelmessages.tsx'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/frontend/app/aipanel/aimessage.tsx'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/frontend/app/aipanel/aipanelinput.tsx'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/frontend/app/aipanel/aimode.tsx'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/frontend/app/aipanel/waveai-model.tsx'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/frontend/app/aipanel/aitypes.ts'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/pkg/aiusechat/usechat.go'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/pkg/aiusechat/usechat-backend.go'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/pkg/aiusechat/usechat-mode.go'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/pkg/aiusechat/uctypes/uctypes.go'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/pkg/aiusechat/chatstore/chatstore.go'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/pkg/aiusechat/openai/openai-backend.go'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/pkg/aiusechat/anthropic/anthropic-backend.go'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/pkg/aiusechat/gemini/gemini-backend.go'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/pkg/web/sse/ssehandler.go'`
  - `curl -fsSL 'https://raw.githubusercontent.com/sanshao85/tideterm/main/pkg/wconfig/defaultconfig/waveai.json'`

## Known limitations

- This phase verified current state from repository source, not from a live provider-backed agent session.
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

### Tide/TideTerm reference findings

#### Scope note

- Reference source inspected: `sanshao85/tideterm` on GitHub `main`.
- A separate `tide` TUI framework reference was not used for this AI audit because the AI implementation under comparison lives in the TideTerm application repo, not in the generic framework.

#### Streaming assistant responses

- What exists:
  - TideTerm uses a streaming HTTP chat endpoint plus a frontend stream consumer.
  - `frontend/app/aipanel/aipanel.tsx` uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` pointed at `model.getUseChatEndpointUrl()`, which resolves to `/api/post-chat-message`.
  - `pkg/aiusechat/usechat.go` exposes `WaveAIPostMessageHandler`, creates an SSE handler, and calls `WaveAIPostMessageWrap(...)`.
  - `pkg/web/sse/ssehandler.go` emits AI SDK-style stream parts such as `start`, `text-start`, `text-delta`, `reasoning-delta`, `tool-input-delta`, `finish-step`, and `finish`, and sets `x-vercel-ai-ui-message-stream: v1`.
  - `pkg/aiusechat/openai/openai-backend.go`, `pkg/aiusechat/anthropic/anthropic-backend.go`, and `pkg/aiusechat/gemini/gemini-backend.go` all parse provider SSE responses and translate provider-specific events into the generic stream-part protocol.
- How it works at a high level:
  - The frontend sends one request to the stream endpoint.
  - The backend chooses a provider backend, opens the provider stream, translates provider events into generic stream parts, and forwards those parts over SSE.
  - The frontend `useChat` state updates incrementally as those parts arrive.
- What is portable to RunaTerminal:
  - A generic backend stream contract that emits assistant text deltas, reasoning deltas, and finish/error events.
  - A provider adapter layer that converts provider-native streaming events into one internal stream shape.
  - A frontend render path that can append partial assistant output without waiting for the full response.
- What is not portable or would conflict with RunaTerminal architecture:
  - TideTerm’s exact route shape (`/api/post-chat-message`) and AI SDK transport contract should not be copied verbatim into RunaTerminal’s current `/api/v1/agent/...` API surface.
  - TideTerm’s frontend implementation depends on `@ai-sdk/react`, Jotai singletons, and the legacy `frontend/app/...` structure, which conflicts with RunaTerminal’s current frontend layering and existing backend-owned contract model.

#### Busy/working/thinking UI state

- What exists:
  - `frontend/app/aipanel/aipanelmessages.tsx` treats `status === "streaming"` as a first-class render state and can show an in-progress assistant message even before a text part arrives.
  - `frontend/app/aipanel/aimessage.tsx` contains `AIThinking`, which renders animated pulse dots while the model is thinking and a clock icon plus message when waiting for approvals.
  - `frontend/app/aipanel/aipanelinput.tsx` swaps the send button for a stop button while streaming.
- How it works at a high level:
  - The transport status drives visible busy state.
  - The last assistant message is marked streaming, incomplete markdown is rendered in-place, and a thinking indicator remains visible while only reasoning/tool activity is arriving.
  - Approval waits are surfaced as a distinct waiting state rather than as a generic spinner.
- What is portable to RunaTerminal:
  - Deriving busy/working state directly from the live agent transport state instead of from a manual overlay.
  - Showing a small in-panel assistant-working indicator before final assistant text is complete.
  - Preserving existing layout while changing only the conversation state projection and composer action state.
- What is not portable or would conflict with RunaTerminal architecture:
  - TideTerm’s exact visual treatment, approval-specific widgets, and stop-button behavior are tied to its richer tool-use workflow and should not be transplanted wholesale without matching backend semantics and explicit UI placement decisions.

#### Provider abstraction and multi-provider support

- What exists:
  - `pkg/aiusechat/usechat-backend.go` defines `UseChatBackend` and chooses an implementation with `GetBackendByAPIType(...)`.
  - Verified backend implementations exist for:
    - OpenAI Responses
    - OpenAI Chat Completions
    - Anthropic Messages
    - Google Gemini
  - `pkg/aiusechat/usechat-mode.go` resolves AI modes from config and applies provider defaults for `wave`, `openai`, `openrouter`, `azure`, `azure-legacy`, and `google`.
  - `frontend/app/aipanel/aimode.tsx` renders a mode dropdown that groups hosted and custom modes and disables incompatible mode switches mid-chat.
- How it works at a high level:
  - TideTerm exposes user-selectable AI modes rather than a raw provider dropdown.
  - Each mode resolves to a provider, API type, endpoint, model, token source, and capabilities.
  - The backend then picks the matching provider adapter from the resolved API type.
- What is portable to RunaTerminal:
  - A backend-owned provider/mode registry that resolves provider configuration before execution.
  - A provider interface plus provider-specific adapters behind one runtime path.
  - Treating provider selection as a runtime/backend concern first, with frontend selection UI added only after backend resolution exists.
- What is not portable or would conflict with RunaTerminal architecture:
  - TideTerm’s telemetry gating, premium/cloud mode rules, and Wave proxy semantics are product-specific and should not be imported into RunaTerminal.
  - TideTerm’s mode/config system is broader than the current RunaTerminal agent selection model and would need to be reduced rather than copied directly.

#### Message lifecycle states and partial output rendering

- What exists:
  - `pkg/aiusechat/uctypes/uctypes.go` defines richer message-part state than RunaTerminal currently has:
    - text/reasoning parts can be `streaming` or `done`
    - tool parts can be `input-streaming`, `input-available`, `output-available`, or `output-error`
    - stop reasons include `done`, `tool_use`, `max_tokens`, `content_filter`, `canceled`, `error`, `pause_turn`, and rate-limit variants
  - `frontend/app/aipanel/aitypes.ts` mirrors those backend shapes into frontend types.
  - `frontend/app/aipanel/aimessage.tsx` renders incomplete assistant markdown with `WaveStreamdown parseIncompleteMarkdown={isStreaming}` and also renders reasoning/tool-use parts.
  - `pkg/aiusechat/chatstore/chatstore.go` stores native provider messages keyed by `chatid`, while provider adapters can convert stored native messages back into UI chat.
- How it works at a high level:
  - Stream parts update the last assistant message progressively.
  - The UI can render partial markdown, reasoning traces, and tool activity before the provider step fully completes.
  - Persisted chat state is backend-owned and can be reloaded after streaming stops or is interrupted.
- What is portable to RunaTerminal:
  - Introducing explicit in-progress/partial message states in the backend and frontend models.
  - Rendering partial assistant text in the current transcript surface instead of waiting for a final snapshot replacement.
  - Treating busy/thinking visibility as part of message lifecycle, not as a separate shell concern.
- What is not portable or would conflict with RunaTerminal architecture:
  - TideTerm’s full tool-use, reasoning, and approval message taxonomy is broader than RunaTerminal’s currently exposed AI sidebar and should not be copied unless the backend contract also grows to support it.

#### Cancellation and abort behavior

- What exists:
  - `frontend/app/aipanel/aipanelinput.tsx` shows a stop button during streaming and calls `model.stopResponse()`.
  - `frontend/app/aipanel/waveai-model.tsx` implements `stopResponse()` by calling `useChatStop?.()` and then reloading persisted chat state.
  - Backend stream handlers treat request cancellation or SSE disconnect as `StopKindCanceled`; OpenAI and Gemini handlers explicitly recover partial text from streaming state when the client disconnects.
  - `pkg/aiusechat/usechat.go` also guards active chats and serializes one active run per `chatid`.
- How it works at a high level:
  - The frontend aborts the active stream request.
  - The backend detects the canceled stream, stops the step, preserves whatever partial assistant state it can, and the frontend reloads chat state afterward.
- What is portable to RunaTerminal:
  - Treating cancelation as part of the streaming contract from day one.
  - Preserving partial assistant output on cancellation when possible.
  - Preventing overlapping runs for one conversation/session.
- What is not portable or would conflict with RunaTerminal architecture:
  - TideTerm’s stop-control placement and `chatid`-scoped concurrency rules are tied to its own panel workflow and should be adapted to RunaTerminal’s conversation/session model instead of copied as-is.

### Gap analysis and v1 recommendation

#### Streaming

- Current RunaTerminal status:
  - Backend agent conversation is synchronous request/response.
  - No agent streaming route is verified.
  - Conversation messages only become visible after provider completion.
  - Frontend replaces the full transcript snapshot after `POST /api/v1/agent/conversation/messages` returns.
- Relevant Tide/TideTerm reference behavior:
  - TideTerm streams assistant text, reasoning, and tool events incrementally over SSE.
  - The frontend renders incomplete assistant output while the response is still in flight.
- Required backend work:
  - Add an explicit agent streaming contract to the RunaTerminal backend without inventing ad-hoc frontend semantics in the widget layer.
  - Extend conversation/runtime state to support an in-progress assistant response and partial text accumulation instead of only final `complete`/`error` messages.
  - Define cancellation/error handling for an interrupted stream.
- Required frontend work:
  - Replace full-snapshot-only submission flow with a stream consumer that can append partial assistant output in the existing card layout.
  - Add transcript state that can represent an in-progress assistant message.
- Must be done before public v1:
  - `A. must-have before public v1`
- Separate slice:
  - Yes. Backend stream contract and frontend stream integration should be separate slices.
- Recommendation:
  - Public v1 should not ship with the current opaque request/response-only assistant flow. This is a direct usability gap relative to the current goals and to the reference implementation.

#### Busy/working state visibility

- Current RunaTerminal status:
  - Initial load has a loading card.
  - Submit path only disables the composer with `isSubmitting`.
  - No verified AI-specific working animation or in-transcript assistant-working state exists.
  - The existing busy overlay is a manual blocked-widget mechanism, not an agent-runtime indicator.
- Relevant Tide/TideTerm reference behavior:
  - TideTerm exposes a live streaming status, a visible thinking state, and a distinct waiting-for-approval state.
  - The composer visibly changes behavior during an active run.
- Required backend work:
  - Minimal if the streaming slice lands first, provided the stream contract includes start/finish/error boundaries.
  - No separate provider/runtime redesign is required for a first v1 pass.
- Required frontend work:
  - Add a clear working indicator in the existing AI sidebar layout without moving controls or adding unapproved UI.
  - Tie that indicator to the real agent request lifecycle instead of to manual widget blocking.
- Must be done before public v1:
  - `A. must-have before public v1`
- Separate slice:
  - Yes, but it should be a narrow slice layered on top of the streaming/request lifecycle work.
- Recommendation:
  - Even if full streaming slipped, public v1 would still need explicit working visibility. In the current code, long-running requests appear inert.

#### Third-party providers

- Current RunaTerminal status:
  - A provider interface exists.
  - The runtime currently instantiates a single Ollama provider by default.
  - No verified provider registry, provider factory, or non-Ollama agent backend implementation exists in the active runtime path.
  - The frontend does not expose any visible provider selector today.
- Relevant Tide/TideTerm reference behavior:
  - TideTerm resolves AI modes from config and maps them to multiple providers and API types.
  - Backend implementations are verified for OpenAI Responses, OpenAI Chat, Anthropic, and Gemini.
  - The frontend mode dropdown is a thin selector over backend-owned mode resolution.
- Required backend work:
  - Introduce a backend-owned provider resolution layer for the agent runtime.
  - Add at least one non-Ollama third-party provider implementation behind the existing provider abstraction.
  - Decide how provider credentials and defaults are supplied without leaking provider semantics into unrelated frontend code.
- Required frontend work:
  - For backend capability alone: none is strictly required if one configured provider can be selected outside the sidebar.
  - For user-switchable provider selection: a visible selector or mode control would be required, which is a separate UI placement decision in RunaTerminal.
- Must be done before public v1:
  - Backend third-party provider support: `A. must-have before public v1`
  - Frontend on-panel provider selection UI: `B. can ship after v1` unless product requirements explicitly demand in-sidebar switching on day one
- Separate slice:
  - Yes. Backend provider abstraction/support and frontend provider selection UI should be separate slices.
- Recommendation:
  - Public v1 should not be limited to the current Ollama-only runtime.
  - The backend capability is the v1 blocker.
  - A visible provider-selection control is not yet a v1 blocker because the current sidebar has no approved placement for it.

#### Classification summary

- `A. must-have before public v1`
  - Agent streaming backend contract
  - Agent streaming frontend integration
  - Clear AI busy/working state tied to real agent execution
  - Backend support for at least one third-party provider beyond Ollama
- `B. can ship after v1`
  - Frontend provider selection UI inside the current AI sidebar, unless product requires on-screen switching for v1
  - TideTerm-style rich reasoning/tool-use/approval lifecycle beyond what RunaTerminal’s current AI sidebar needs for v1
