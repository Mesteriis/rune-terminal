# Agent Validation

## Last verified state

- Date: `2026-04-24`
- State: `VERIFIED`
- Scope:
  - backend-owned agent provider catalog
  - active conversation provider resolution
  - frontend AI/provider settings surfaces
  - AI composer request-context dropdown with explicit widget multiselect
  - frontend `/run ...` routing from the AI sidebar into the active terminal widget through backend tool execution plus terminal-command explanation
  - browser-level Playwright coverage for the AI sidebar over the split local dev path:
    - settings navigation for provider/model/limits/terminal/commander sections
    - live Codex CLI chat request/response through the real backend conversation route
    - explicit widget-context selection in the composer and `widget_ids` propagation into the stream request body
    - transcript persistence across AI panel close/reopen
    - live Claude provider routing with explicit `auth-required` handling when the local CLI is installed but not logged in
    - `/run printf ...` sending input into the active terminal session without falling back to plain provider chat

## Current provider contract

- Active provider kinds are limited to:
  - `codex`: local Codex CLI through `codex exec`
  - `claude`: local Claude Code CLI through `claude -p`
- The active runtime no longer includes direct Ollama, direct API-key OpenAI-compatible providers, `core/codexauth`, or the internal AI proxy draft.
- Unsupported legacy provider records are filtered during agent-state normalization. If filtering leaves no providers, the store recreates `codex-cli` and `claude-code-cli`.
- The provider catalog route returns `supported_kinds: ["codex", "claude"]`.

## `/run` contract

- `/run <command>` is now a frontend-owned branch in the AI sidebar, not a plain chat prompt.
- The frontend resolves the active terminal target from the current Dockview terminal panel registry, then:
  - reads the target terminal snapshot with `GET /api/v1/terminal/{widgetID}`
  - sends input through `POST /api/v1/tools/execute` using `term.send_input`
  - waits briefly for post-command terminal output
  - appends the backend-owned execution transcript/explanation chain through `POST /api/v1/agent/terminal-commands/explain`
- `widget_context_enabled` remains valid for conversation/explain routes, but is intentionally omitted from `POST /api/v1/tools/execute` because that transport contract does not accept it.
- Plain conversation requests now also support explicit `widget_ids` in the conversation context. The composer dropdown resolves widget options from `GET /api/v1/workspace`, and the backend context/audit path now uses that explicit widget list instead of only `active_widget_id`.

## Commands/tests used

- `go test ./core/agent ./core/conversation ./core/app ./core/transport/httpapi`
- `go test ./core/...`
- `./scripts/go.sh test ./core/app ./core/transport/httpapi`
- `npm --prefix frontend run test -- src/features/agent/api/client.test.ts src/features/agent/api/provider-client.test.ts src/features/agent/model/provider-settings-draft.test.ts src/widgets/ai/ai-panel-widget.test.tsx`
- `npm --prefix frontend run test -- src/shared/api/workspace.test.ts src/features/agent/api/client.test.ts src/widgets/ai/ai-panel-widget.test.tsx`
- `npm --prefix frontend run lint:active`
- `npm run test:ui -- --reporter=line`
- `npm run test:ui -- --reporter=line e2e/ai.spec.ts`
- `npm run tauri:dev`
- `codex login status`
- `printf 'Return exactly CODEX_E2E_OK\n' | codex exec --color never --sandbox read-only --skip-git-repo-check --ephemeral --output-last-message -`
- `claude auth status --json`
- `python3 -m py_compile scripts/validate_workspace_navigation.py scripts/validate_operator_workflow.py`
- `python3 scripts/validate_operator_workflow.py`
- `python3 scripts/validate_workspace_navigation.py`

## Known limitations

- CLI providers currently expose buffered chat completion through the existing SSE route; token-by-token provider streaming is not implemented.
- CLI-native tool calls are not yet mediated through `core/toolruntime`, policy approval, or audit events.
- No current visible profile, role, or mode selector exists in the AI sidebar, so the backend selection routes remain unwired to user controls.
- `/run` currently surfaces approval-required toolruntime responses as a chat-side error/status message; there is no dedicated approval-confirmation UI for this path yet.
- On this machine the local `claude` binary is installed but not authenticated, so the verified browser path is `auth-required` handling rather than a successful Claude completion.

## Related validation

- Provider settings details: [settings-providers.md](./settings-providers.md)
