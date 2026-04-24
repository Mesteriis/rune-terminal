# Agent Streaming Backend Validation

## Last verified state

- Date: `2026-04-23`
- State: `SUPERSEDED`
- Scope:
  - the older Ollama-backed streaming provider was removed
  - current streaming-route validation is covered by [agent.md](./agent.md) and [settings-providers.md](./settings-providers.md)

## Current behavior

- `POST /api/v1/agent/conversation/messages/stream` remains the conversation SSE route.
- Codex CLI, Claude Code CLI, and the narrow OpenAI-compatible HTTP source currently run as buffered completions.
- `CompleteStream` emits the final provider output as one `text-delta`; token-by-token provider streaming remains future work.
