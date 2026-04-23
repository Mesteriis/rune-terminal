# Agent Validation

## Last verified state

- Date: `2026-04-23`
- State: `FOCUSED VERIFIED`
- Scope:
  - backend-owned agent provider catalog
  - active conversation provider resolution
  - frontend AI/provider settings surfaces

## Current provider contract

- Active provider kinds are limited to:
  - `codex`: local Codex CLI through `codex exec`
  - `claude`: local Claude Code CLI through `claude -p`
- The active runtime no longer includes direct Ollama, direct API-key OpenAI-compatible providers, `core/codexauth`, or the internal AI proxy draft.
- Unsupported legacy provider records are filtered during agent-state normalization. If filtering leaves no providers, the store recreates `codex-cli` and `claude-code-cli`.
- The provider catalog route returns `supported_kinds: ["codex", "claude"]`.

## Commands/tests used

- `go test ./core/agent ./core/conversation ./core/app ./core/transport/httpapi`
- `go test ./core/...`
- `npm --prefix frontend run test -- src/features/agent/api/provider-client.test.ts src/features/agent/model/provider-settings-draft.test.ts src/widgets/ai/ai-panel-widget.test.tsx`
- `npm --prefix frontend run lint:active`
- `python3 -m py_compile scripts/validate_workspace_navigation.py scripts/validate_operator_workflow.py`
- `python3 scripts/validate_operator_workflow.py`
- `python3 scripts/validate_workspace_navigation.py`

## Known limitations

- CLI providers currently expose buffered chat completion through the existing SSE route; token-by-token provider streaming is not implemented.
- CLI-native tool calls are not yet mediated through `core/toolruntime`, policy approval, or audit events.
- No current visible profile, role, or mode selector exists in the AI sidebar, so the backend selection routes remain unwired to user controls.
- Browser/Tauri smoke was not rerun for this slice; validation is limited to the focused backend/frontend checks above plus backend HTTP smoke scripts using a Codex CLI stub.

## Related validation

- Provider settings details: [settings-providers.md](./settings-providers.md)
