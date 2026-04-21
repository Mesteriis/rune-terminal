# Agent Streaming Backend Validation

## Last verified state

- Date: `2026-04-21`
- State: `PARTIALLY VERIFIED`
- Scope:
  - backend-only AI Agent streaming contract
  - no frontend streaming UI changes in this slice
  - existing non-stream conversation submission path remains in place

## Commands/tests used

- Source inspection:
  - `sed -n '1,260p' core/conversation/provider.go`
  - `sed -n '1,260p' core/conversation/provider_ollama.go`
  - `sed -n '1,360p' core/conversation/service.go`
  - `sed -n '1,220p' core/app/conversation_actions.go`
  - `sed -n '1,220p' core/transport/httpapi/api.go`
  - `sed -n '1,280p' core/transport/httpapi/handlers_agent_conversation.go`
- Validation:
  - `go test ./core/conversation`
  - `go test ./core/transport/httpapi -run 'TestConversationRoutesKeepJSONAndStreamPathsSeparate|TestSubmitConversationMessagePersistsTranscript'`
  - `go test ./core/conversation ./core/transport/httpapi -run 'TestServiceSubmitStreamEmitsStructuredEvents|TestServiceSubmitStreamPreservesPartialAssistantOnError|TestStreamConversationMessageEmitsStructuredEventSequence|TestStreamConversationMessageEmitsErrorEventOnFailure'`
  - `go test ./core/conversation ./core/app ./core/transport/httpapi`

## Streaming contract

- Stream route:
  - `POST /api/v1/agent/conversation/messages/stream`
- Request body:
  - same payload shape as `POST /api/v1/agent/conversation/messages`
  - `{ prompt, attachments?, context }`
- Response transport:
  - `text/event-stream`
  - SSE event name matches the stream event type
- Stream event payload shape:
  - `message-start`
    - `{ type, message_id, message }`
  - `text-delta`
    - `{ type, message_id, delta }`
  - `message-complete`
    - `{ type, message_id, message }`
  - `error`
    - `{ type, message_id?, message?, error }`

## Provider-backed streaming status

- Current provider path:
  - `core/app/runtime.go` still instantiates `conversation.NewOllamaProvider(...)`
  - real streaming is implemented in `core/conversation/provider_ollama.go`
- Verified behavior:
  - `CompleteStream(...)` sends `stream: true` to Ollama `/api/chat`
  - the provider reads newline-delimited Ollama chunks during generation
  - each `message.content` chunk is forwarded immediately through the callback
  - final assistant content is accumulated from real in-flight deltas, not reconstructed from a completed response afterward
- Current limitation:
  - only assistant text deltas are streamed in this slice
  - reasoning/tool-specific parts are not emitted because the current provider/runtime model does not expose them
  - third-party providers are still a separate backend slice
  - live Ollama daemon validation was not run in this slice; the provider transport was exercised with `httptest` NDJSON responses

## Compatibility note

- Existing request/response route remains:
  - `POST /api/v1/agent/conversation/messages`
- Frontend migration intent:
  - current sidebar can stay on the non-stream route until the dedicated frontend streaming slice consumes the SSE contract
- Compatibility behavior:
  - both routes use the same prompt/context preparation and audit path in `core/app/conversation_actions.go`
  - the non-stream route still returns the existing JSON `{ conversation, provider_error }` payload
  - the stream route emits SSE events and leaves the non-stream frontend path untouched

## Backend files integrated

- `core/conversation/types.go`
- `core/conversation/provider.go`
- `core/conversation/provider_ollama.go`
- `core/conversation/service.go`
- `core/app/conversation_actions.go`
- `core/transport/httpapi/api.go`
- `core/transport/httpapi/handlers_agent_conversation.go`
- `core/transport/httpapi/response.go`
- `core/conversation/provider_ollama_test.go`
- `core/conversation/service_test.go`
- `core/transport/httpapi/handlers_agent_conversation_test.go`
- `core/transport/httpapi/test_helpers_test.go`

## Validation status

- Contract defined from backend code: verified
- Stream route present: verified
- Real provider-backed partial emission: verified at provider/unit-test level
- Existing non-stream route remains stable: verified
- Follow-up frontend slice:
  - consume `POST /api/v1/agent/conversation/messages/stream`
  - map `message-start` / `text-delta` / `message-complete` / `error` into the existing transcript state without changing layout
