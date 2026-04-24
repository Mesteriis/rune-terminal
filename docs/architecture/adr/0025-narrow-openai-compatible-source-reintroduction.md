# 0025. Narrow OpenAI-Compatible Source Reintroduction

- Status: Accepted

## Context

The CLI-only provider boundary in [0024](./0024-cli-only-ai-provider-boundary.md) was the right narrowing move while the chat surface, audit flow, and CLI provider wiring were still unstable.

That boundary is now too restrictive for the current operator workflow:

- the product already has a backend-owned provider catalog
- settings already host provider management
- the AI composer now has a real toolbar surface for source/model controls
- operators need a narrow way to point the runtime at an existing OpenAI-compatible LAN endpoint without reopening a full provider/proxy universe

The requirement is not "bring back every upstream." The requirement is one explicit, backend-owned HTTP source path that fits the existing conversation contract and remains auditable.

## Decision

rune-terminal reopens one narrow non-CLI provider kind:

- `openai-compatible`: operator-supplied HTTP endpoint using:
  - `GET /v1/models` for model discovery
  - `POST /v1/chat/completions` for chat completion

The backend provider catalog now supports:

- `codex`
- `claude`
- `openai-compatible`

The provider remains backend-owned:

- base URL, default model, and discovered chat models live in the backend provider record
- the frontend consumes the catalog instead of inventing provider semantics locally
- the AI toolbar can switch provider and model explicitly, but selection still resolves through backend provider state

This reintroduction stays intentionally narrow:

- no internal proxy path
- no generalized API-key settings universe in this slice
- no automatic provider failover
- no provider-native tool calling

## Consequences

Positive:

- operators can target an existing LAN/OpenAI-compatible source without bypassing backend provider state
- provider/model switching is now visible in the chat toolbar instead of being hidden in settings only
- model discovery remains explicit and backend-owned
- the runtime supports both local CLI workflows and one explicit HTTP source workflow

Negative:

- provider breadth grows again, so docs and validation must stay disciplined
- `openai-compatible` is still buffered completion, not token-level streaming
- this slice does not solve API-key management, proxy routing, or provider-native tool execution

## Alternatives considered

### Keep the CLI-only boundary and force all non-CLI traffic through external wrappers

Rejected. That would push source selection outside the product even though the backend/provider catalog already exists.

### Reopen the old broad provider/proxy surface

Rejected. The product still does not need a broad provider matrix. One explicit OpenAI-compatible source path is enough for this phase.
