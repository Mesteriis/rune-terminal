# Frontend Transport API Contract

## Route Inventory

Source: `core/transport/httpapi/api.go`.

| Method | Path | Handler file | Purpose |
| --- | --- | --- | --- |
| `GET` | `/healthz` | `handlers_system.go` | Service health probe |
| `GET` | `/api/v1/bootstrap` | `handlers_system.go` | Bootstrap app bootstrap data (product name, workspace snapshot, connections, tools, repo root) |
| `GET` | `/api/v1/workspace` | `handlers_system.go` | Workspace snapshot |
| `GET` | `/api/v1/connections` | `handlers_connections.go` | Connections snapshot |
| `POST` | `/api/v1/connections/{connectionID}/check` | `handlers_connections.go` | Check a connection by ID |
| `PUT` | `/api/v1/connections/active` | `handlers_connections.go` | Set active connection |
| `POST` | `/api/v1/connections/ssh` | `handlers_connections.go` | Save SSH connection |
| `POST` | `/api/v1/workspace/focus-widget` | `handlers_workspace.go` | Focus a widget |
| `POST` | `/api/v1/workspace/focus-tab` | `handlers_workspace.go` | Focus a tab |
| `POST` | `/api/v1/workspace/tabs` | `handlers_workspace.go` | Create terminal tab |
| `PATCH` | `/api/v1/workspace/tabs/{tabID}/rename` | `handlers_workspace.go` | Rename tab |
| `PATCH` | `/api/v1/workspace/tabs/{tabID}/pinned` | `handlers_workspace.go` | Pin/unpin tab |
| `POST` | `/api/v1/workspace/tabs/move` | `handlers_workspace.go` | Move tab |
| `DELETE` | `/api/v1/workspace/tabs/{tabID}` | `handlers_workspace.go` | Close tab |
| `GET` | `/api/v1/tools` | `handlers_system.go` | List tools |
| `POST` | `/api/v1/tools/execute` | `handlers_tools.go` | Execute tool |
| `GET` | `/api/v1/policy/trusted-rules` | `handlers_policy.go` | List trusted rules |
| `GET` | `/api/v1/policy/ignore-rules` | `handlers_policy.go` | List ignore rules |
| `GET` | `/api/v1/agent` | `handlers_agent.go` | Agent catalog |
| `PUT` | `/api/v1/agent/selection/profile` | `handlers_agent.go` | Set active prompt profile |
| `PUT` | `/api/v1/agent/selection/role` | `handlers_agent.go` | Set active role |
| `PUT` | `/api/v1/agent/selection/mode` | `handlers_agent.go` | Set active mode |
| `GET` | `/api/v1/agent/conversation` | `handlers_agent_conversation.go` | Conversation snapshot |
| `POST` | `/api/v1/agent/conversation/messages` | `handlers_agent_conversation.go` | Submit user prompt |
| `POST` | `/api/v1/agent/terminal-commands/explain` | `handlers_agent_conversation.go` | Explain terminal command with context |
| `GET` | `/api/v1/terminal/{widgetID}` | `handlers_terminal.go` | Terminal snapshot |
| `POST` | `/api/v1/terminal/{widgetID}/input` | `handlers_terminal.go` | Send terminal input |
| `GET` | `/api/v1/terminal/{widgetID}/stream` | `handlers_terminal.go` | Terminal SSE stream |
| `GET` | `/api/v1/audit` | `handlers_system.go` | Audit event list |

## Auth Model

Source: `core/transport/httpapi/middleware.go`.

- `Authorization` is expected on all non-`/healthz` endpoints as `Authorization: Bearer <token>`.
- If a request has an empty/invalid `Authorization` header, middleware checks a query token only when `allowsQueryToken(path)` is true.
- `allowsQueryToken` is true only for paths with prefix `/api/v1/terminal/` and suffix `/stream`.
- `/healthz` bypasses auth checks entirely.
- CORS middleware sets:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Headers: Authorization, Content-Type`
  - `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`
  - `OPTIONS` requests return `204`.

## Response Model

Source: `core/transport/httpapi/response.go`, `error_model.go`.

- No global success envelope helper is used for normal responses.
- Success responses are written through `writeJSON` as the handler payload shape (plain JSON object or array).
- Error responses use an envelope of shape:
  - `{"error": {"code": string, "message": string}}`
- Known error helpers:
  - `401` via `writeUnauthorized`
  - `400` via `writeBadRequest`
  - `403` via `writeForbidden`
  - `404` via `writeNotFound`
  - `500` via `writeInternalError`
- Tool execution success/error response uses `toolruntime.ExecuteResponse` and transport-mapped status codes:
  - `ok` → `200`
  - `requires_confirmation` → `428`
  - `error` → mapped from error code
- Known handler-specific response shapes are not normalized into a shared envelope and differ by endpoint.

## Terminal Transport Model

Source: `core/transport/httpapi/handlers_terminal.go`.

- Snapshot endpoint: `GET /api/v1/terminal/{widgetID}`
  - Query: `from` (string parsed with fallback to `0`)
  - Response: `terminal.Snapshot` (`state`, `chunks`, `next_seq`)
- Input endpoint: `POST /api/v1/terminal/{widgetID}/input`
  - Body: `{"text": string, "append_newline": bool}`
  - Response: `terminal.InputResult` (`widget_id`, `bytes_sent`, `append_newline`)
- Stream endpoint: `GET /api/v1/terminal/{widgetID}/stream`
  - Query: `from` and optional query `token` fallback for auth if header is missing
  - Response is `text/event-stream`
  - Server writes:
    - historical `snapshot.Chunks` replay first as SSE output events
    - event stream uses `event: output` and `data: <json chunk>`
    - keepalive comments `: keepalive` every 15 seconds
  - Requires `http.Flusher`
- No websocket path exists.
- Stream consumer should treat `data` payload as `terminal.OutputChunk`.

## Workspace Mutation Model

Source: `core/transport/httpapi/handlers_workspace.go`.

- Focus widget: `POST /api/v1/workspace/focus-widget`
  - Request: `{"widget_id": string}`
  - Response: `{"workspace": workspace.Snapshot}`
- Focus tab: `POST /api/v1/workspace/focus-tab`
  - Request: `{"tab_id": string}`
  - Response: `{"workspace": workspace.Snapshot}`
- Create terminal tab: `POST /api/v1/workspace/tabs`
  - Request: `{"title": string, "connection_id": string}`
  - Both fields are optional (`title` defaults server-side)
  - Response shape: `{"tab_id","widget_id","workspace"}`
- Rename tab: `PATCH /api/v1/workspace/tabs/{tabID}/rename`
  - Request: `{"title": string}`
  - Response shape: `{"tab": workspace.Tab, "workspace": workspace.Snapshot}`
- Pin/unpin tab: `PATCH /api/v1/workspace/tabs/{tabID}/pinned`
  - Request: `{"pinned": bool}`
  - Response shape: `{"tab": workspace.Tab, "workspace": workspace.Snapshot}`
- Move: `POST /api/v1/workspace/tabs/move`
  - Request: `{"tab_id": string, "before_tab_id": string}`
  - Response: `{"workspace": workspace.Snapshot}`
- Close tab: `DELETE /api/v1/workspace/tabs/{tabID}`
  - Response: `{"closed_tab_id": string, "workspace": workspace.Snapshot}`

## Gaps and Sharp Edges

- Request decoding uses `DisallowUnknownFields`; clients must send exact JSON object fields or receive `400`.
- No single success envelope means typed client must model each endpoint response shape separately.
- SSE payload is event-stream text with partial line format; output payloads are JSON chunks, keepalive uses SSE comment lines.
- Terminal command explain and tool execute response bodies include tool/context-dependent fields that are not uniform across payloads.
- Handler file coverage:
  - `api.go` includes a full route set for bootstrap/workspace/connections/tools/policy/agent/terminal/audit/health.
  - No undocumented handlers were found for additional `/api/v1/*` routes.
