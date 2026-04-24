# Settings Providers Validation

## Last verified state

- Date: `2026-04-24`
- State: `VERIFIED`
- Scope:
  - backend-owned AI provider catalog and active-provider resolution
  - CLI-only provider runtime for `codex` and `claude`
  - frontend settings provider client/draft helpers and TypeScript surface
  - browser-level Playwright validation for the provider/settings surfaces under the split local dev path

## Commands/tests used

- `go test ./core/agent ./core/conversation ./core/app ./core/transport/httpapi`
- `go test ./core/...`
- `npm --prefix frontend run test -- src/features/agent/api/provider-client.test.ts src/features/agent/model/provider-settings-draft.test.ts src/widgets/ai/ai-panel-widget.test.tsx`
- `npm --prefix frontend run lint:active`
- `npm run test:ui -- --reporter=line`
- `python3 -m py_compile scripts/validate_workspace_navigation.py scripts/validate_operator_workflow.py`
- `python3 scripts/validate_operator_workflow.py`
- `python3 scripts/validate_workspace_navigation.py`
- `npm --prefix frontend run typecheck` was attempted, but this repo has no `typecheck` npm script; `lint:active` is the current `tsc --noEmit` entrypoint.

## Current provider contract

- Active supported provider kinds are now limited to:
  - `codex` for local Codex CLI
  - `claude` for local Claude Code CLI
- `ollama`, `openai`, and `proxy` are no longer returned in `supported_kinds` and new records for those kinds are rejected as unsupported.
- The old direct provider/proxy implementation packages were removed from the active tree:
  - `core/conversation/provider_ollama.go`
  - `core/conversation/provider_openai.go`
  - `core/conversation/provider_codex.go`
  - `core/conversation/provider_models.go`
  - `core/aiproxy`
  - `core/codexauth`
- Legacy persisted provider records with unsupported kinds are filtered during agent-state normalization. If filtering leaves no providers, the store bootstraps the default CLI providers.
- Default bootstrap providers:
  - `codex-cli`, active, kind `codex`, command `codex`, model `gpt-5.4`
  - `claude-code-cli`, kind `claude`, command `claude`, model `sonnet`

## Runtime behavior

- `core/app/provider_runtime.go` resolves active records only to:
  - `conversation.NewCodexCLIProvider(...)`
  - `conversation.NewClaudeCodeProvider(...)`
- The Codex CLI provider uses `codex exec` in non-interactive mode with:
  - read-only sandbox
  - `--skip-git-repo-check`
  - ephemeral session
  - `--output-last-message` for final response capture
- The Claude provider uses `claude -p` in non-interactive mode with:
  - text output
  - no session persistence
  - tools disabled via `--tools ""`
- CLI providers expose non-streaming runtime info; `CompleteStream` emits the final CLI output as one text delta so the existing SSE conversation route remains usable.

## Frontend settings state

- `AI > Установленные приложения` creates only `Codex CLI` and `Claude Code CLI` providers from the toolbar.
- The editor exposes command and model fields for both CLI providers.
- Backend CLI command availability is surfaced through `status_state`, `status_message`, and `resolved_binary`.
- CLI auth state is also surfaced through the same provider view payload:
  - `ready` when the binary is present and authenticated
  - `auth-required` when the binary is present but local login is missing
  - `missing` when the binary cannot be resolved
- The frontend provider client now normalizes nullable backend arrays at the API boundary:
  - `chat_models: null -> []`
  - discovery `models: null -> []`
  - `supported_kinds: null -> []`
- `AI > Модели` uses the same backend model discovery route, but CLI model discovery is static/backend-owned:
  - Codex returns the configured/default Codex model list, currently led by `gpt-5.4` with `gpt-5-codex` still available as an explicit choice.
  - Claude returns the configured/default Claude Code aliases, currently including `sonnet` and `opus`.

## Known limitations

- CLI execution is intentionally minimal and chat-focused. It does not yet integrate Codex/Claude tool calls with the core `toolruntime` approval/audit pipeline.
- CLI providers do not stream token-by-token output yet.
- Browser validation now covers:
  - successful live Codex chat on the product default model
  - Claude provider routing plus the `auth-required` UI path when the local CLI is installed but not logged in
- Browser validation was rerun through the split local dev path; a fresh `npm run tauri:dev` desktop smoke was not run in this pass.
