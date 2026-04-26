# Agent Streaming Backend Validation

## Last verified state

- Date: `2026-04-26`
- State: `PARTIAL`
- Scope:
  - the older Ollama-backed streaming provider was removed
  - current streaming-route validation is covered by [agent.md](./agent.md) and [settings-providers.md](./settings-providers.md)
  - OpenAI-compatible HTTP provider streaming is now covered by provider tests
  - frontend composer cancellation is covered by AI panel widget tests

## Current behavior

- `POST /api/v1/agent/conversation/messages/stream` remains the conversation SSE route.
- The active AI composer exposes `Cancel response` while a cancellable chat stream is in flight; cancel aborts the browser request, clears local busy state, and preserves any partial assistant text as an operator-cancelled error message.
- Codex CLI and Claude Code CLI currently run as buffered completions and emit
  the final provider output as one `text-delta`.
- The narrow OpenAI-compatible HTTP source now sends `stream: true`, accepts
  `text/event-stream`, parses OpenAI-compatible `data:` frames, and forwards
  each `delta.content` chunk as an agent `text-delta`.
- Token-by-token provider streaming is therefore available only for the
  OpenAI-compatible HTTP source. CLI token streaming, reasoning deltas and
  provider-native tool-call streaming remain future work.
- Cancellation is frontend/request scoped. There is no separate persisted
  backend job cancellation queue for already-detached provider work.
