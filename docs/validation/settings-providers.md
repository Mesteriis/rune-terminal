# Settings Providers Validation

## Last verified state

- Date: `2026-04-26`
- State: `VERIFIED`
- Scope:
  - backend-owned AI provider catalog and active-provider resolution
  - backend-owned provider gateway operational snapshot, recent-run history, and persisted probe state
  - explicit provider probe route that refreshes the same operational snapshot instead of creating a second UI truth
  - narrow provider runtime for `codex`, `claude`, and `openai-compatible`
  - frontend settings provider client/draft helpers and TypeScript surface
  - browser-level Playwright validation for the provider/settings surfaces plus AI-toolbar provider/model switching under the split local dev path

## Commands/tests used

- `go test ./core/agent ./core/conversation ./core/app ./core/transport/httpapi`
- `go test ./core/...`
- `npm --prefix frontend run test -- src/features/agent/api/provider-client.test.ts src/features/agent/model/provider-settings-draft.test.ts src/widgets/ai/ai-panel-widget.test.tsx`
- `npm --prefix frontend run test -- src/features/agent/api/provider-client.test.ts src/widgets/settings/agent-provider-settings-widget.test.tsx --reporter=verbose`
- `npm --prefix frontend run lint:active`
- `npm run test:ui -- --reporter=line`
- `npm run test:ui -- --reporter=line e2e/ai.spec.ts --grep "AI provider settings show gateway telemetry after a mocked Codex run"`
- `./scripts/go.sh test ./core/providergateway ./core/app ./core/transport/httpapi -run 'TestStore|TestProviderGatewaySnapshotReturnsRecentRunsAndStats' -count=1`
- `./scripts/go.sh test ./core/app ./core/transport/httpapi -run 'TestProbeProviderReturnsReachableOpenAICompatibleStatus|TestProviderGatewaySnapshotReturnsRecentRunsAndStats' -count=1`
- `python3 -m py_compile scripts/validate_workspace_navigation.py scripts/validate_operator_workflow.py`
- `python3 scripts/validate_operator_workflow.py`
- `python3 scripts/validate_workspace_navigation.py`
- `npm --prefix frontend run typecheck` was attempted, but this repo has no `typecheck` npm script; `lint:active` is the current `tsc --noEmit` entrypoint.

## Current provider contract

- Active supported provider kinds are:
  - `codex` for local Codex CLI
  - `claude` for local Claude Code CLI
  - `openai-compatible` for an operator-supplied HTTP source
- `ollama`, the older broad `openai` kind, and `proxy` are not returned in `supported_kinds`, and new records for those older kinds are rejected as unsupported.
- Legacy persisted provider records with unsupported kinds are filtered during agent-state normalization. If filtering leaves no providers, the store bootstraps the default CLI providers.
- Default bootstrap providers:
  - `codex-cli`, active, kind `codex`, command `codex`, model `gpt-5.4`
  - `claude-code-cli`, kind `claude`, command `claude`, model `sonnet`

## Runtime behavior

- `core/app/provider_runtime.go` resolves active records only to:
  - `conversation.NewCodexCLIProvider(...)`
  - `conversation.NewClaudeCodeProvider(...)`
  - `conversation.NewOpenAICompatibleProvider(...)`
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
- The OpenAI-compatible HTTP provider is likewise non-streaming in this slice:
  - discovery: `GET <base_url>/v1/models`
  - completion: `POST <base_url>/v1/chat/completions`
  - the final response is normalized into the same assistant message contract as the CLI providers

## Frontend settings state

- `AI > Установленные приложения` creates:
  - `Codex CLI`
  - `Claude Code CLI`
  - `OpenAI-Compatible HTTP`
- The editor exposes:
  - command + model fields for CLI providers
  - base URL + model fields for the OpenAI-compatible provider
- The provider catalog is now configuration-only:
  - CLI provider views expose command/model/chat-model configuration
  - runtime readiness is no longer derived from `GET /api/v1/agent/providers`
- The settings shell now consumes `GET /api/v1/agent/providers/gateway` as the single operational source:
  - per-provider route readiness (`route_ready`, `route_status_state`, `route_status_message`)
  - resolved CLI binary when the backend probe found one
  - OpenAI-compatible route source/model echo from the backend probe snapshot
  - route checked-at / probe latency
  - per-provider recent run totals
  - health status derived from backend run truth
  - average and last latency
  - recent activity rows with request mode, model, duration, and last error
- Provider settings now also expose an explicit `Probe provider route` action:
  - `POST /api/v1/agent/providers/{providerID}/probe`
  - CLI providers return explicit binary/auth readiness from the backend-owned probe path
  - OpenAI-compatible providers probe `/v1/models`, return discovered models, and fail explicitly when the configured model is not present
  - the probe writes back into the same backend-owned gateway snapshot, so the editor and shell summaries read one source of truth
- Gateway telemetry load no longer fails silently in the settings shell:
  - if `/api/v1/agent/providers/gateway` fails, the UI shows an explicit gateway telemetry error instead of quietly pretending the telemetry surface has no data
- CLI/OpenAI probe states are now surfaced only through the gateway snapshot:
  - `ready` when the route is usable
  - `auth-required` when the CLI is present but local login is missing
  - `missing` when the CLI binary cannot be resolved
  - `unchecked` before any explicit operator probe has been run
- The frontend provider client now normalizes nullable backend arrays at the API boundary:
  - `chat_models: null -> []`
  - discovery `models: null -> []`
  - `supported_kinds: null -> []`
- `AI > Модели` uses the same backend model discovery route, but CLI model discovery is static/backend-owned:
  - Codex returns the configured/default Codex model list, currently led by `gpt-5.4` with `gpt-5-codex` still available as an explicit choice.
  - Claude returns the configured/default Claude Code aliases, currently including `sonnet` and `opus`.
- The AI composer toolbar now also consumes the same backend provider catalog directly:
  - provider combobox
  - model combobox
  - switching provider updates visible model choices to that provider's `chat_models`
- The OpenAI-compatible browser validation in this pass used the live LAN source:
  - `base_url: http://192.168.1.8:8317`
  - verified model discovery from `/v1/models`
  - verified completion with `gpt-5.4` over `/v1/chat/completions`

## Known limitations

- CLI execution is intentionally minimal and chat-focused. It does not yet integrate Codex/Claude tool calls with the core `toolruntime` approval/audit pipeline.
- Neither CLI nor OpenAI-compatible providers stream token-by-token output yet.
- Browser validation now covers:
  - successful live Codex chat on the product default model
  - successful live OpenAI-compatible HTTP chat through the toolbar-selected LAN source
  - Claude provider routing plus the `auth-required` UI path when the local CLI is installed but not logged in
  - provider settings gateway telemetry plus explicit probe action after a mocked Codex run
- Browser validation was rerun through the split local dev path, and a fresh `npm run tauri:dev` desktop smoke was also run in this pass.
