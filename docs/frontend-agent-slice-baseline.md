# frontend agent/conversation slice baseline

Дата: `2026-04-16`

## 1. Реальные backend routes и payload shapes

- `GET /api/v1/agent`
  - handler: `core/transport/httpapi/handlers_agent.go`
  - response: agent catalog
    - `profiles[]`
    - `roles[]`
    - `modes[]`
    - `active.profile`
    - `active.role`
    - `active.mode`
    - `active.effective_prompt`
    - `active.effective_policy_profile`

- `PUT /api/v1/agent/selection/profile`
- `PUT /api/v1/agent/selection/role`
- `PUT /api/v1/agent/selection/mode`
  - handler: `core/transport/httpapi/handlers_agent.go`
  - request body: `{"id":"<selection-id>"}`
  - response: updated agent catalog from `GET /api/v1/agent`

- `GET /api/v1/agent/conversation`
  - handler: `core/transport/httpapi/handlers_agent_conversation.go`
  - response:
    - `conversation.messages[]`
      - `id`
      - `role`
      - `content`
      - `status`
      - `provider`
      - `model`
      - `created_at`
    - `conversation.provider`
      - `kind`
      - `base_url`
      - `model`
      - `streaming`
    - `conversation.updated_at`

- `POST /api/v1/agent/conversation/messages`
  - handler: `core/transport/httpapi/handlers_agent_conversation.go`
  - request body:
    - `prompt: string`
    - `context`
      - `workspace_id?: string`
      - `repo_root?: string`
      - `active_widget_id?: string`
      - `widget_context_enabled?: boolean`
  - response:
    - `conversation: ConversationSnapshot`
    - `provider_error: string`

- `POST /api/v1/agent/terminal-commands/explain`
  - handler: `core/transport/httpapi/handlers_agent_conversation.go`
  - request body:
    - `prompt: string`
    - `command: string`
    - `widget_id?: string`
    - `from_seq?: number`
    - `approval_used?: boolean`
    - `context`
      - `workspace_id?: string`
      - `repo_root?: string`
      - `active_widget_id?: string`
      - `widget_context_enabled?: boolean`
  - response:
    - `conversation: ConversationSnapshot`
    - `provider_error: string`
    - `output_excerpt: string`

- `/api/v1/system-prompts/*`
  - actual routed status: отсутствует
  - факт: system prompt selection не вынесен в отдельный transport namespace; он уже инкапсулирован в `GET /api/v1/agent` и `PUT /api/v1/agent/selection/*`

## 2. Текущий frontend client status

- typed clients уже существуют:
  - `frontend/rterm-api/agent/client.ts`
  - `frontend/rterm-api/conversation/client.ts`
- typed payloads уже соответствуют текущим backend handlers:
  - `frontend/rterm-api/agent/types.ts`
  - `frontend/rterm-api/conversation/types.ts`
- generic compat API facade уже собирает эти клиенты:
  - `frontend/compat/api.ts`
- текущий gap не в HTTP client layer, а в том, что active AI UI их не использует

## 3. Текущий active UI status

- existing surface:
  - `frontend/app/aipanel/aipanel.tsx`
  - `frontend/app/aipanel/waveai-model.tsx`
  - `frontend/app/aipanel/aimode.tsx`
  - AI panel реально mounted в active compat workspace через `frontend/app/workspace/workspace.tsx`

- runtime status по коду:
  - panel structure, header, message feed area и composer surface существуют
  - initial load использует legacy RPC chat path:
    - `WaveAIModel.reloadChatFromBackend()` -> `RpcApi.GetWaveAIChatCommand(...)`
  - submit path использует legacy AI SDK transport endpoint:
    - `WaveAIModel.getUseChatEndpointUrl()` -> `${getWebServerEndpoint()}/api/post-chat-message`
  - mode selector использует legacy `waveaiModeConfigAtom`, а не `GET /api/v1/agent`

- runtime status по факту:
  - active compat AI surface открывается
  - на baseline run UI показывал legacy telemetry gate card вместо рабочего conversation composer
  - причина gate в active path: `aipanel.tsx` вычисляет `allowAccess` из legacy telemetry + `waveai` mode config, хотя новый backend conversation path к этому transport не привязан

- classification:
  - existing panel/surface: `existing`
  - wiring status: `partially wired / broken`
  - broken points:
    - active submit path ждёт legacy `/api/post-chat-message`
    - active initial transcript path ждёт legacy `getwaveaichat`
    - active selector path ждёт legacy `waveai` mode config
    - active compat panel всё ещё gated legacy telemetry logic

## 4. Exact missing pieces in active UI

- загрузка `GET /api/v1/agent/conversation` вместо legacy chat RPC
- submit через `POST /api/v1/agent/conversation/messages`
- mapping backend `ConversationSnapshot` -> current UI message model
- compat-side context builder для `workspace_id`, `repo_root`, `active_widget_id`, `widget_context_enabled`
- загрузка `GET /api/v1/agent` для активного selection/catalog
- wiring существующего selector surface к `PUT /api/v1/agent/selection/*` хотя бы для реально присутствующего active dropdown path
- снятие legacy telemetry gate с compat conversation path, потому что он блокирует уже существующий backend-owned local agent flow

## 5. Strict slice boundary

- no redesign
- no new AI product semantics
- no invented streaming
- no unrelated tools/audit/terminal/workspace work
- no fake transcript model outside backend truth
- only active compat AI/conversation surface wiring to existing backend path
