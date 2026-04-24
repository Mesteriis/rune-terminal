# 0024. CLI-only AI Provider Boundary

- Status: Superseded by [0025. Narrow OpenAI-Compatible Source Reintroduction](./0025-narrow-openai-compatible-source-reintroduction.md)

## Context

The earlier AI provider work accumulated multiple provider paths before the product had exercised the end-to-end chat surface:

- direct Ollama HTTP
- direct API-key OpenAI-compatible HTTP
- a Codex auth-file path
- an internal multi-channel AI proxy draft

That breadth conflicted with the current pre-release phase. It made settings, model discovery, validation, and runtime behavior look broader than the product direction currently needs.

## Decision

rune-terminal narrows the active AI provider boundary to local CLI providers only:

- `codex`: Codex CLI through `codex exec`
- `claude`: Claude Code CLI through `claude -p`

The backend provider catalog returns only `codex` and `claude` in `supported_kinds`.

The active runtime removes the old direct/provider-proxy implementations:

- direct Ollama provider
- direct OpenAI-compatible provider
- old Codex auth-file provider
- internal AI proxy provider draft

Legacy persisted provider records with unsupported kinds are filtered during agent-state normalization. If no supported providers remain, the store bootstraps the default CLI providers.

## Consequences

Positive:

- provider settings and runtime behavior now match the product's immediate chat slice
- frontend settings no longer carry dead provider forms
- backend model discovery is small and deterministic
- old unsupported provider records fail closed instead of staying editable

Negative:

- Ollama and direct API-key upstreams are no longer available from the active runtime
- CLI providers currently return buffered output rather than token-level streaming
- CLI-native tool calls are not yet mediated by `core/toolruntime`, policy approval, or audit

## Alternatives considered

### Keep Ollama as a third local provider

Rejected for now. The current goal is to exercise one local Codex path and one Claude Code path before reopening provider breadth.

### Keep proxy records for migration

Rejected. The repository is pre-release, and unsupported records can be filtered safely during normalization.
