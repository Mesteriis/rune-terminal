# Agent Streaming Backend Validation

## Last verified state

- Date: `2026-04-26`
- State: `PARTIAL`
- Scope:
  - the older Ollama-backed streaming provider was removed
  - current streaming-route validation is covered by [agent.md](./agent.md) and [settings-providers.md](./settings-providers.md)
  - OpenAI-compatible HTTP provider streaming is now covered by provider tests
  - frontend composer cancellation is covered by AI panel widget tests
  - the active SSE route now issues a backend-owned conversation stream id and exposes an explicit cancel route for live provider runs

## Current behavior

- `POST /api/v1/agent/conversation/messages/stream` remains the conversation SSE route.
- The same stream route now returns `X-Rterm-Conversation-Stream-Id` and mirrors that `stream_id` into stream events, so the frontend can address a live provider run explicitly instead of relying only on fetch abort state.
- `POST /api/v1/agent/conversation/streams/{streamID}/cancel` now cancels an in-flight provider run through a backend-owned cancel registry before the frontend tears down its local stream state.
- The active AI composer still exposes `Cancel response`, but that action now first posts backend cancellation for the active `stream_id`, then clears local busy state and preserves any partial assistant text as an operator-cancelled error message.
- Codex CLI and Claude Code CLI currently run as buffered completions and emit
  the final provider output as one `text-delta`.
- The narrow OpenAI-compatible HTTP source now sends `stream: true`, accepts
  `text/event-stream`, parses OpenAI-compatible `data:` frames, and forwards
  each `delta.content` chunk as an agent `text-delta`.
- Token-by-token provider streaming is therefore available only for the
  OpenAI-compatible HTTP source. CLI token streaming, reasoning deltas and
  provider-native tool-call streaming remain future work.
- Cancellation is now backend-addressable for the lifetime of a live request,
  but there is still no persisted detached job queue or resume-after-reload
  cancel orchestration once the stream itself is gone.
