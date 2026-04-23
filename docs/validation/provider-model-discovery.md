# Provider Model Discovery Validation

## Last verified state

- Date: `2026-04-23`
- State: `SUPERSEDED`
- Scope:
  - direct Ollama/OpenAI-compatible model discovery was removed with the old provider implementations
  - current model discovery is CLI-provider-only and is tracked in [settings-providers.md](./settings-providers.md)

## Current behavior

- `POST /api/v1/agent/providers/models` supports:
  - `codex`
  - `claude`
- CLI model discovery is static/backend-owned:
  - Codex includes the configured/default Codex model.
  - Claude includes the configured/default Claude Code model plus `opus`.

## Commands/tests used

- See [settings-providers.md](./settings-providers.md).
