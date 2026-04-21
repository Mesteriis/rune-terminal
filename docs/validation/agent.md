# Agent Validation

## Last verified state

- Date: `2026-04-21`
- State: `AUDITED`
- Scope:
  - backend AI agent HTTP surface and typed request/response contracts
  - frontend AI sidebar entry points and current demo/static state path
  - exact frontend integration seams that can switch to backend contracts without changing formatting

## Commands/tests used

- `rg -n "agent|conversation|profile|role|mode|attachments/references" README.md docs frontend/src core`
- `sed -n '1,240p' core/transport/httpapi/handlers_agent.go`
- `sed -n '1,260p' core/transport/httpapi/handlers_agent_conversation.go`
- `sed -n '1,260p' core/agent/view.go`
- `sed -n '1,260p' core/conversation/types.go`
- `sed -n '1,260p' core/app/conversation_actions.go`
- `sed -n '1,260p' core/app/conversation_attachments.go`
- `sed -n '1,260p' core/transport/httpapi/handlers_agent_test.go`
- `sed -n '1,380p' core/transport/httpapi/handlers_agent_conversation_test.go`
- `sed -n '1,260p' frontend/src/app/app-ai-sidebar.tsx`
- `sed -n '1,260p' frontend/src/widgets/ai/ai-panel-widget.tsx`
- `sed -n '1,260p' frontend/src/widgets/ai/ai-composer-widget.tsx`
- `sed -n '1,260p' frontend/src/widgets/ai/ai-prompt-card-widget.tsx`
- `sed -n '1,260p' frontend/src/widgets/ai/ai-panel-widget.mock.ts`
- `sed -n '1,280p' frontend/src/shared/api/runtime.ts`
- `sed -n '1,280p' frontend/src/features/commander/api/client.ts`

## Known limitations

- The current AI sidebar is still frontend-only mock composition; no agent feature/model layer exists under `frontend/src/features/`.
- No visible profile, role, or mode selector exists in the current AI sidebar.
- No explicit attachment-reference UI path exists in the current AI sidebar.
- The existing AI header settings button and composer options button are presentational only in this audit slice; treating them as selector or attachment entry points would require a new approved UI behavior.

## Evidence

### Backend AI agent API surface found

- `GET /api/v1/agent`
  - response is `agent.Catalog`
  - shape:
    - `profiles: PromptProfile[]`
    - `roles: RolePreset[]`
    - `modes: WorkMode[]`
    - `active.profile`
    - `active.role`
    - `active.mode`
    - `active.effective_prompt`
    - `active.effective_policy_profile`
- `PUT /api/v1/agent/selection/profile`
- `PUT /api/v1/agent/selection/role`
- `PUT /api/v1/agent/selection/mode`
  - request body: `{ "id": string }`
  - success response: full `agent.Catalog`
  - error codes:
    - `400 missing_id`
    - `404 prompt_profile_not_found`
    - `404 role_preset_not_found`
    - `404 work_mode_not_found`
- `GET /api/v1/agent/conversation`
  - response body: `{ "conversation": Snapshot }`
  - `Snapshot` shape:
    - `messages: Message[]`
    - `provider: { kind, base_url, model?, streaming }`
    - `updated_at`
- `POST /api/v1/agent/conversation/messages`
  - request body:
    - `prompt: string`
    - `attachments?: AttachmentReference[]`
    - `context: ConversationContext`
  - `ConversationContext` shape:
    - `workspace_id?`
    - `repo_root?`
    - `active_widget_id?`
    - `action_source?`
    - `target_session?`
    - `target_connection_id?`
    - `widget_context_enabled?`
  - success response:
    - `conversation: Snapshot`
    - `provider_error: string`
- `POST /api/v1/agent/conversation/attachments/references`
  - request body:
    - `path: string`
    - `workspace_id?`
    - `action_source?`
  - success response:
    - `attachment: { id, name, path, mime_type, size, modified_time }`
- attachment and conversation transport errors are explicit:
  - `400 invalid_prompt`
  - `400 invalid_attachment_path`
  - `400 invalid_attachment_reference`
  - `404 attachment_not_found`

### Frontend demo/static wiring found

- AI sidebar shell entry point is [app-ai-sidebar.tsx](../../frontend/src/app/app-ai-sidebar.tsx), which mounts:
  - [AiPanelHeaderWidget](../../frontend/src/widgets/ai/ai-panel-header-widget.tsx)
  - [AiPanelWidget](../../frontend/src/widgets/ai/ai-panel-widget.tsx)
- The current conversation/state source is the optional `state` prop on [AiPanelWidget](../../frontend/src/widgets/ai/ai-panel-widget.tsx), which defaults to `aiPanelWidgetMockState`.
- The main demo/static data source is [ai-panel-widget.mock.ts](../../frontend/src/widgets/ai/ai-panel-widget.mock.ts):
  - `toolbarLabel`
  - `activeTool`
  - `composerPlaceholder`
  - `prompts[]` with `preview/prompt/reasoning/summary/approvals`
- The prompt history UI is driven by [AiPromptCardWidget](../../frontend/src/widgets/ai/ai-prompt-card-widget.tsx), which currently renders mock prompt snapshots, local expand/collapse state, and local rollback toggles.
- The composer UI is presentational in [ai-composer-widget.tsx](../../frontend/src/widgets/ai/ai-composer-widget.tsx):
  - textarea is uncontrolled
  - send button has no submit wiring
  - options button has no runtime wiring
- Current profile/role/mode UI wiring:
  - none
  - no selector widget, no store, no API client, no existing visible selector control
- Current attachment UI wiring:
  - none
  - no visible attachment list, picker, or reference creation flow

### Exact mock/static entry points that must be replaced

- Replace the `AiPanelWidget` default `state = aiPanelWidgetMockState` path with backend-backed state on the main execution path.
- Replace `state.prompts.map(...)` in [ai-panel-widget.tsx](../../frontend/src/widgets/ai/ai-panel-widget.tsx) with a backend conversation projection that preserves the current card stack layout.
- Replace the uncontrolled composer/send no-op path in [ai-composer-widget.tsx](../../frontend/src/widgets/ai/ai-composer-widget.tsx) with backend submission wiring while preserving the same toolbar, textarea, and action-rail structure.
- Keep [ai-panel-widget.mock.ts](../../frontend/src/widgets/ai/ai-panel-widget.mock.ts) only as isolated scaffolding if needed; it must no longer back the main sidebar path.

### Exact backend integration seams available now

- Shared runtime transport resolution already exists in [runtime.ts](../../frontend/src/shared/api/runtime.ts) and must remain the source of `baseUrl` and `authToken`.
- The existing typed frontend transport pattern already exists in [frontend/src/features/commander/api/client.ts](../../frontend/src/features/commander/api/client.ts); the agent client can follow the same approach without scattering fetch calls into widgets.
- The narrow integration seam is:
  - add `frontend/src/features/agent/api/client.ts`
  - add a small agent model/hook layer under `frontend/src/features/agent/`
  - keep [AiPanelWidget](../../frontend/src/widgets/ai/ai-panel-widget.tsx) and [AiComposerWidget](../../frontend/src/widgets/ai/ai-composer-widget.tsx) as the existing view layer
- No backend contract ambiguity was found in this audit; the selection, conversation, and attachment routes are explicit in transport handlers and tests.
