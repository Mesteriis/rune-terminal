# Agent Streaming Backend Validation

## Last verified state

- Date: `2026-04-21`
- State: `PARTIALLY VERIFIED`
- Scope:
  - backend-only AI Agent streaming contract
  - no frontend streaming UI changes in this slice
  - existing non-stream conversation submission path remains in place

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

## Compatibility note

- Existing request/response route remains:
  - `POST /api/v1/agent/conversation/messages`
- Frontend migration intent:
  - current sidebar can stay on the non-stream route until the dedicated frontend streaming slice consumes the SSE contract

## Current provider limitation at contract introduction

- The stream route and event contract exist in the backend.
- Provider-backed incremental output is not yet verified in this commit.
- Current Ollama provider still reports non-streaming capability at this step.

## Files touched for contract introduction

- `core/conversation/types.go`
- `core/conversation/provider.go`
- `core/conversation/provider_ollama.go`
- `core/conversation/service.go`
- `core/app/conversation_actions.go`
- `core/transport/httpapi/api.go`
- `core/transport/httpapi/handlers_agent_conversation.go`
- `core/transport/httpapi/response.go`

## Validation status

- Contract defined from backend code: verified
- Stream route present: verified
- Real provider-backed partial emission: not yet verified in this commit
