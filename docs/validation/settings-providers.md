# Settings Providers Validation

## Last verified state

- Date: `2026-04-21`
- State: `PARTIALLY VERIFIED`
- Scope:
  - backend-owned AI provider configuration runtime and CRUD surface
  - active-provider resolution for agent conversation execution
  - current frontend settings window state as the future consumer of that backend surface

## Commands/tests used

- Frontend settings audit:
  - `rg -n "settings|Settings" frontend/src docs core`
  - `rg --files frontend/src | rg "settings|dialog-popup|right-action-rail|modal|overview|trusted|secret|help"`
  - `rg -n "Open settings panel|Settings modal|Overview|Trusted tools|Secret shield|Help|settings" frontend/src/widgets frontend/src/shared frontend/src/features`
  - `rg -n "tab|tabs|subtab|Tab" frontend/src/shared frontend/src/widgets frontend/src/features | head -n 200`
  - `sed -n '1,260p' frontend/src/widgets/shell/right-action-rail-widget.tsx`
  - `sed -n '1,260p' frontend/src/widgets/panel/modal-host-widget.tsx`
  - `sed -n '1,220p' frontend/src/shared/model/modal.ts`
  - `sed -n '1,220p' frontend/src/shared/ui/components/dialog-popup.tsx`
  - `sed -n '1,220p' frontend/src/shared/ui/components/tabs.tsx`
  - `sed -n '1,220p' frontend/src/shared/ui/components/tabs.styles.ts`
- Backend provider/runtime audit and validation:
  - `sed -n '1,260p' core/agent/provider_types.go`
  - `sed -n '1,320p' core/agent/provider_store.go`
  - `sed -n '1,240p' core/agent/provider_view.go`
  - `sed -n '1,260p' core/codexauth/state.go`
  - `sed -n '1,260p' core/agent/store.go`
  - `sed -n '1,320p' core/app/provider_runtime.go`
  - `sed -n '1,260p' core/app/provider_actions.go`
  - `sed -n '1,260p' core/app/conversation_actions.go`
  - `sed -n '1,220p' core/app/ai_terminal_command.go`
  - `sed -n '1,260p' core/conversation/provider.go`
  - `sed -n '1,320p' core/conversation/provider_codex.go`
  - `sed -n '1,320p' core/conversation/provider_openai.go`
  - `sed -n '1,360p' core/conversation/service.go`
  - `sed -n '1,260p' core/transport/httpapi/handlers_agent_providers.go`
  - `sed -n '1,220p' core/transport/httpapi/api.go`
- Focused validation:
  - `go test ./core/codexauth ./core/conversation ./core/agent ./core/app ./core/transport/httpapi`
  - `npm --prefix frontend run test -- src/features/agent/api/provider-client.test.ts src/features/agent/model/provider-settings-draft.test.ts`
  - `npm --prefix frontend run build`
  - `npm run validate`

## Current frontend settings window state

### Active entry point

- The visible settings entry point in the active shell is the right-rail settings button in [frontend/src/widgets/shell/right-action-rail-widget.tsx](../../frontend/src/widgets/shell/right-action-rail-widget.tsx).
- That button still opens a body-scoped modal through [frontend/src/shared/model/modal.ts](../../frontend/src/shared/model/modal.ts).
- The mounted surface is still [frontend/src/shared/ui/components/dialog-popup.tsx](../../frontend/src/shared/ui/components/dialog-popup.tsx).

### Current behavior

- The settings window is still a generic `DialogPopup` with wide `variant="settings"` geometry, but it now hosts a real AI/provider management surface in the body slot.
- The active content lives in [frontend/src/widgets/settings/agent-provider-settings-widget.tsx](../../frontend/src/widgets/settings/agent-provider-settings-widget.tsx).
- The shared modal shell was not replaced or forked; the provider editor is mounted inside the existing body-scoped settings surface.

## Backend provider configuration runtime

### Provider model

- Provider configuration is now backend-owned in `core/agent`.
- The persisted agent state model now includes:
  - `active_provider_id`
  - `providers[]`
- Provider records are defined in [core/agent/provider_types.go](../../core/agent/provider_types.go).
- Supported provider kinds in the model:
  - `ollama`
  - `codex`
  - `openai`
  - `proxy`
- Each provider record persists:
  - `id`
  - `kind`
  - `display_name`
  - `enabled`
  - provider-specific settings
  - `created_at`
  - `updated_at`
- One provider becomes active/default by matching `active_provider_id` to a provider record id.

### Provider-specific fields

- `ollama` record fields:
  - `base_url`
  - `model`
- `codex` record fields:
  - `model`
  - optional `auth_file_path`
- `openai` record fields:
  - `base_url`
  - `model`
  - `api_key_secret`
- `proxy` record fields:
  - `model`
  - `channels[]`

### Public vs secret-sensitive fields

- Codex credentials are not copied into provider state.
- Codex providers only persist:
  - `model`
  - optional `auth_file_path`
- Codex provider views expose only backend-detected auth metadata from the local auth file:
  - `auth_state`
  - `auth_mode`
  - `status_message`
  - `last_refresh`
  - `account_id`
- Stored OpenAI credentials live only in backend-owned state as `api_key_secret`.
- Provider read responses do not expose that secret.
- Provider read responses expose only:
  - `has_api_key: true|false`
- Secret-bearing create/update requests are accepted only through backend write routes.

## Persistence strategy

- Provider configuration is persisted in the existing `agent-state.json` store, not in frontend state and not in a new ad hoc config file.
- The persistence boundary stays inside [core/agent/store.go](../../core/agent/store.go).
- The agent state schema version was advanced to `v1alpha2`.
- Legacy agent-state files without provider data are migrated on load by seeding:
  - one default bootstrap provider `ollama-local`
  - `active_provider_id = "ollama-local"`
- The bootstrap Ollama provider reads:
  - `RTERM_OLLAMA_BASE_URL`
  - `RTERM_OLLAMA_MODEL`
- That environment path is now bootstrap-only for the default local Ollama provider.
- Once provider state exists in `agent-state.json`, the persisted backend state is the source of truth.
- The store file continues to use `0600` permissions through the existing backend save path.

## Backend routes

### Provider CRUD/config API

- `GET /api/v1/agent/providers`
  - returns:
    - `providers[]`
    - `active_provider_id`
    - `supported_kinds`
- `POST /api/v1/agent/providers`
  - creates a provider record
  - returns:
    - `provider`
    - `providers`
- `PATCH /api/v1/agent/providers/{providerID}`
  - updates display name, enabled state, and provider-specific config
  - returns:
    - `provider`
    - `providers`
- `PUT /api/v1/agent/providers/active`
  - body: `{ "id": "<providerID>" }`
  - updates the active/default provider selection
  - returns the provider catalog
- `DELETE /api/v1/agent/providers/{providerID}`
  - deletes a non-active provider
  - returns the provider catalog

### Validation/error behavior

- Unknown provider ids return `provider_not_found`.
- Unsupported kinds return `provider_kind_unsupported`.
- Invalid payload/config returns `invalid_provider_config`.
- Selecting a disabled provider returns `provider_disabled`.
- Deleting the active provider returns `provider_delete_active`.
- JSON decoding remains strict through the shared `decodeJSON(...)` path with `DisallowUnknownFields()`.

## Runtime resolution

### Resolution path

- Runtime provider resolution now lives in [core/app/provider_runtime.go](../../core/app/provider_runtime.go).
- `Runtime` now owns a `ConversationProviderFactory`.
- `NewRuntime(...)` initializes that factory to resolve the active provider from backend state.
- The factory currently maps:
  - `ollama` -> `conversation.NewOllamaProvider(...)`
  - `codex` -> `conversation.NewCodexProvider(...)`
  - `openai` -> `conversation.NewOpenAIProvider(...)`
  - `proxy` -> `aiproxy.NewProvider(...)`

### Execution paths now using backend-owned provider state

- `GET /api/v1/agent/conversation`
  - provider info in the snapshot is now derived from the resolved active provider when the runtime factory is enabled
- `POST /api/v1/agent/conversation/messages`
  - resolves the active provider from backend state before submission
- `POST /api/v1/agent/conversation/messages/stream`
  - resolves the same active provider from backend state before streaming submission
- `POST /api/v1/agent/terminal-commands/explain`
  - now also resolves the active provider from backend state before the assistant explanation call

### Conversation service compatibility

- The conversation service still preserves its legacy default-provider methods for compatibility.
- New runtime-aware methods were added so the backend can pass the resolved provider per request:
  - `SnapshotWithProviderInfo(...)`
  - `SubmitWithProvider(...)`
  - `SubmitStreamWithProvider(...)`
  - `AppendAssistantPromptWithProvider(...)`
- This keeps the old request/response behavior stable for tests and narrow legacy call sites while allowing production runtime selection from backend state.

## External provider implementation

### Codex local-auth support

- A direct Codex provider implementation now exists in [core/conversation/provider_codex.go](../../core/conversation/provider_codex.go).
- The current implementation:
  - reads local Codex auth state through [core/codexauth/state.go](../../core/codexauth/state.go)
  - prefers `OPENAI_API_KEY` when present in `~/.codex/auth.json`
  - otherwise uses the stored ChatGPT access token and account id
  - sends Responses API requests to either:
    - `https://api.openai.com/v1/responses`
    - `https://chatgpt.com/backend-api/codex/responses`
  - supports both non-stream and SSE text-delta streaming

### OpenAI support

- A real external provider implementation now exists in [core/conversation/provider_openai.go](../../core/conversation/provider_openai.go).
- The current implementation uses OpenAI Chat Completions with:
  - non-stream completion
  - SSE streaming for `stream=true`
- Verified streaming behavior:
  - partial `text-delta` chunks are consumed during generation
  - the same provider path works for both stream and non-stream execution

### Ollama compatibility

- The Ollama provider path remains supported.
- The active/default provider can now be switched between:
  - the persisted local Ollama provider config
  - a persisted Codex local-auth provider config
  - a persisted OpenAI provider config
  - a persisted internal proxy provider config

## Secret handling

### Current v1 behavior

- OpenAI API keys are written only through backend create/update routes.
- API keys are stored locally in backend-owned state as `api_key_secret`.
- API keys are never returned through provider list/create/update responses.
- Read responses expose only `has_api_key`.
- Updating an OpenAI provider with `clear_api_key: true` and no replacement key is rejected explicitly.

### Explicit v1 constraint

- Secret storage is local plaintext inside `agent-state.json`, protected only by local file permissions (`0600`).
- This is an intentional local-first v1 constraint.
- No OS keychain, remote vault, sync, rotation, or enterprise secret-management layer was added in this slice.

## Cross-links

- Historical pre-implementation audit: [docs/validation/agent-streaming-and-provider-gap.md](./agent-streaming-and-provider-gap.md)
- Current AI sidebar/backend integration note: [docs/validation/agent.md](./agent.md)

## Remaining limitations

- The current provider matrix is still intentionally narrow even after this slice:
  - `ollama`
  - `codex`
  - `openai`
  - `proxy`
- No provider marketplace/discovery layer exists.
- No provider selection UI was added to the main AI sidebar, and this slice did not change that placement.
- The Codex path currently depends on an already-authenticated local `codex` install; this slice did not add an in-app browser/device-auth connect flow yet.
- The OpenAI implementation is intentionally minimal:
  - chat-completions text flow only
  - no tool calling
  - no reasoning-part surfacing
  - no organization/project header support
- Provider secrets remain local plaintext in backend state for v1.
