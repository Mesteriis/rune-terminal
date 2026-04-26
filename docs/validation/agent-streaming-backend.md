# Agent Streaming Backend Validation

## Last verified state

- Date: `2026-04-26`
- State: `VERIFIED`
- Scope:
  - the older Ollama-backed streaming provider was removed
  - current streaming-route validation is covered by [agent.md](./agent.md) and [settings-providers.md](./settings-providers.md)
  - Codex CLI structured JSONL streaming is covered by provider tests and browser e2e through a mocked local CLI command
  - Claude Code `stream-json` parsing is covered by provider tests
  - OpenAI-compatible HTTP provider streaming is covered by provider tests and existing browser validation
  - frontend composer cancellation is covered by AI panel widget tests
  - the active SSE route now issues a backend-owned conversation stream id and exposes an explicit cancel route for live provider runs

## Current behavior

- `POST /api/v1/agent/conversation/messages/stream` remains the conversation SSE route.
- The same stream route now returns `X-Rterm-Conversation-Stream-Id` and mirrors that `stream_id` into stream events, so the frontend can address a live provider run explicitly instead of relying only on fetch abort state.
- `POST /api/v1/agent/conversation/streams/{streamID}/cancel` now cancels an in-flight provider run through a backend-owned cancel registry before the frontend tears down its local stream state.
- The active AI composer still exposes `Cancel response`, but that action now first posts backend cancellation for the active `stream_id`, then clears local busy state and preserves any partial assistant text as an operator-cancelled error message.
- Codex CLI now runs through `codex exec --json` and emits structured provider events over the same backend contract:
  - `text-delta` from live message chunks
  - `reasoning-delta` from reasoning items
  - `tool-call` from command-execution lifecycle items
  - session continuity from `thread.started`
- Claude Code now runs through `claude -p --output-format stream-json --verbose --include-partial-messages` and emits:
  - `text-delta` from partial content blocks
  - `tool-call` lifecycle updates for streamed `tool_use` blocks
  - session continuity from `session_id`
- The narrow OpenAI-compatible HTTP source now sends `stream: true`, accepts
  `text/event-stream`, parses OpenAI-compatible `data:` frames, and forwards
  each `delta.content` chunk as an agent `text-delta`.
- Provider stream events now share one active SSE contract across Codex CLI,
  Claude Code CLI, and OpenAI-compatible HTTP:
  - all providers use the same `message-start` / `text-delta` / `message-complete` / `error` envelope
  - CLI providers can additionally emit `reasoning-delta` and `tool-call`
    events without opening a second frontend transport path
- Cancellation is now backend-addressable for the lifetime of a live request,
  but there is still no persisted detached job queue or resume-after-reload
  cancel orchestration once the stream itself is gone.
