# Settings Providers Validation

## Last verified state

- Date: `2026-04-21`
- State: `BLOCKED`
- Scope:
  - current shell settings window implementation in the active `frontend/src/` tree
  - current backend provider-configuration surface relevant to AI providers
  - exact gaps blocking real provider configuration inside Settings

## Commands used

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
  - `sed -n '1,220p' frontend/src/shared/ui/components/tabs.test.tsx`
  - `sed -n '1,220p' frontend/src/app/App.tsx`
- Backend provider/config audit:
  - `rg -n "provider|providers|ollama|openai|anthropic|gemini|selection/profile|selection/role|selection/mode" core frontend/src docs`
  - `rg -n "HandleFunc\\(\"(GET|POST|PUT|DELETE) /api/v1/.*provider|provider.*HandleFunc|/api/v1/agent|/api/v1/settings|/api/v1/config|provider config|provider store|ProviderConfig|active provider|default provider" core`
  - `rg -n "RTERM_OLLAMA|OLLAMA|ProviderConfig|NewOllamaProvider|runtime_settings|watcher_mode|provider" core frontend/src | head -n 300`
  - `sed -n '1,260p' core/transport/httpapi/api.go`
  - `sed -n '1,260p' core/transport/httpapi/handlers_agent.go`
  - `sed -n '1,220p' core/transport/httpapi/handlers_agent_test.go`
  - `sed -n '1,260p' core/agent/store.go`
  - `sed -n '1,260p' core/agent/types.go`
  - `sed -n '1,240p' core/agent/view.go`
  - `sed -n '1,260p' core/agent/builtins.go`
  - `sed -n '1,240p' core/conversation/provider.go`
  - `sed -n '1,260p' core/app/runtime.go`
  - `sed -n '1,220p' core/config/paths.go`

## Current settings window state

### Entry points and active files

- The visible settings entry point in the active shell is the right-rail settings button in [frontend/src/widgets/shell/right-action-rail-widget.tsx](../../frontend/src/widgets/shell/right-action-rail-widget.tsx).
- That button opens a body-scoped modal through `openBodyModal(...)` from [frontend/src/shared/model/modal.ts](../../frontend/src/shared/model/modal.ts).
- The active shell mounts body modals in [frontend/src/app/App.tsx](../../frontend/src/app/App.tsx) through [frontend/src/widgets/panel/modal-host-widget.tsx](../../frontend/src/widgets/panel/modal-host-widget.tsx).
- The rendered surface is [frontend/src/shared/ui/components/dialog-popup.tsx](../../frontend/src/shared/ui/components/dialog-popup.tsx).

### Actual behavior today

- The current settings window is not a dedicated settings screen or settings widget.
- It is a generic `DialogPopup` in `variant="settings"` mode.
- The `settings` variant only changes geometry and the close button presentation:
  - fixed `90vw x 95vh` sizing
  - icon-based close button
- The current body content is only:
  - `title`
  - `description`
  - dismiss/confirm actions
- `DialogPopup` does not accept arbitrary children or section content today.
- There is no current settings-specific content area, no settings navigation, no tab model, and no provider panel inside the modal.

### Existing tab/subtab building blocks

- A reusable shared `Tabs` component already exists in [frontend/src/shared/ui/components/tabs.tsx](../../frontend/src/shared/ui/components/tabs.tsx).
- That component already supports:
  - `orientation="horizontal"`
  - `orientation="vertical"`
- The related style and tests already exist in:
  - [frontend/src/shared/ui/components/tabs.styles.ts](../../frontend/src/shared/ui/components/tabs.styles.ts)
  - [frontend/src/shared/ui/components/tabs.test.tsx](../../frontend/src/shared/ui/components/tabs.test.tsx)
- Those tabs are not currently used by the settings window.
- No dedicated settings-nav or settings-subnav component exists today.

### Exact frontend gaps for this slice

- The current settings modal cannot host real settings sections because `DialogPopup` is still a stateless title/description dialog shell.
- The settings window has no existing content composition path for:
  - vertical navigation
  - nested subtabs
  - AI / Providers section content
- The reusable vertical tab capability exists at the shared component layer, but there is no settings-specific composition around it yet.

## Current backend provider-config state

### Verified backend routes related to the agent

- `GET /api/v1/agent`
- `GET /api/v1/agent/conversation`
- `POST /api/v1/agent/conversation/messages`
- `POST /api/v1/agent/conversation/messages/stream`
- `POST /api/v1/agent/conversation/attachments/references`
- `POST /api/v1/agent/terminal-commands/explain`
- `PUT /api/v1/agent/selection/profile`
- `PUT /api/v1/agent/selection/role`
- `PUT /api/v1/agent/selection/mode`

### What those routes actually configure

- `GET /api/v1/agent` returns the agent catalog from `core/agent`.
- That catalog contains:
  - prompt profiles
  - role presets
  - work modes
  - active profile/role/mode selection
- The mutable selection routes only update:
  - `ActiveProfileID`
  - `ActiveRoleID`
  - `ActiveModeID`
- These values are persisted in `agent-state.json` through `core/agent/store.go`.

### What provider configuration exists today

- The active runtime still constructs the conversation backend as:
  - `conversation.NewOllamaProvider(conversation.DefaultProviderConfig())`
  - see [core/app/runtime.go](../../core/app/runtime.go)
- `DefaultProviderConfig()` currently resolves only:
  - `RTERM_OLLAMA_BASE_URL`
  - `RTERM_OLLAMA_MODEL`
  - see [core/conversation/provider.go](../../core/conversation/provider.go)
- The provider path is therefore environment-backed and Ollama-specific.
- There is no verified persisted provider store in `core/config/paths.go`.
- There is no verified provider CRUD service in `core/app` or `core/agent`.
- There is no verified HTTP route for:
  - listing configured providers
  - adding a provider
  - updating provider config
  - deleting a provider
  - selecting the active/default provider

### Exact backend gaps blocking provider Settings integration

- Missing route to list configured providers for a settings panel.
- Missing route to create/add a provider configuration.
- Missing route to persist edited provider configuration.
- Missing route to select an active/default provider.
- Missing backend state model/store for persisted provider definitions.
- Missing runtime wiring that resolves conversation execution from a persisted active provider instead of hard-wiring `NewOllamaProvider(DefaultProviderConfig())`.

## Exact gaps that must be filled for this slice

### Frontend settings structure gap

- The current settings window needs a real content-hosting settings surface before any provider UI can exist.
- The narrowest honest path is:
  - keep the existing modal entry point
  - replace the settings-modal body from generic dialog-only content to a dedicated settings content widget
  - reuse the existing shared `Tabs` component for vertical navigation
  - add settings-specific wrappers only where needed for section navigation and optional subtabs

### Backend provider gap

- Public-v1 provider configuration in Settings is currently blocked by missing backend provider CRUD/select/persistence routes.
- The current agent catalog/selection routes are not a substitute for provider configuration.
- The current backend provider model is effectively:
  - single-provider
  - Ollama-only
  - env-configured at runtime bootstrap

## Slice conclusion

- The current settings window implementation is too thin for real provider configuration, but it has a viable frontend foundation because shared vertical tabs already exist.
- The backend provider configuration surface required for real Settings integration is not implemented.
- A truthful provider-settings UI cannot be completed against the current backend without inventing a fake persistence path.
- This blocks the provider-integration phases of the requested slice until backend provider CRUD/select/persistence support exists.
