# Frontend Audit Slice Baseline

Дата фиксации: `2026-04-15`

## 1. Backend route и payload

- Route: `GET /api/v1/audit`
- Registration: `core/transport/httpapi/api.go`
- Handler: `core/transport/httpapi/handlers_system.go`
- Data source: `api.runtime.Audit.List(limit)` from `core/audit/log.go`
- Query params:
  - `limit` with default `50`
- Response shape:
  - envelope: `{ "events": AuditEvent[] }`
  - event fields confirmed in `core/audit/log.go` and mirrored in `frontend/rterm-api/audit/types.ts`:
    - `id`
    - `tool_name`
    - `summary`
    - `workspace_id`
    - `prompt_profile_id`
    - `role_id`
    - `mode_id`
    - `security_posture`
    - `approval_tier`
    - `effective_approval_tier`
    - `trusted_rule_id`
    - `ignore_rule_id`
    - `ignore_mode`
    - `success`
    - `error`
    - `timestamp`
    - `approval_used`
    - `affected_paths`
    - `affected_widgets`

## 2. Frontend audit client status

- Typed client exists in `frontend/rterm-api/audit/client.ts`
- Typed payload exists in `frontend/rterm-api/audit/types.ts`
- Compat API already exposes `clients.audit` through:
  - `frontend/compat/api.ts`
  - `frontend/compat/types.ts`
- Current client behavior:
  - `AuditClient.getEvents(limit = 50)` -> `GET /api/v1/audit?limit=<n>`

## 3. Current UI status

- Active compat shell lives on:
  - `frontend/app/workspace/workspace.tsx`
  - `frontend/app/workspace/widgets.tsx`
- Existing right utility rail already hosts floating utility surfaces for:
  - tools
  - apps
  - settings/help
- Audit-specific UI in active compat path:
  - no connected audit panel found
  - no audit placeholder found in `frontend/app/**`
  - no active button/wiring to `clients.audit` found

## 4. What is missing in active UI

- No active audit entrypoint in the right utility rail
- No audit surface wired to `GET /api/v1/audit`
- No rendering of audit rows/items in the active compat shell
- No validated tool -> audit visibility path in current UI

## 5. Strict slice boundary

- Tools panel in `frontend/app/workspace/widgets.tsx` must remain intact
- Existing tool execute and approval flow must not regress
- No redesign of the right rail or floating panel layout
- No unrelated utility-panel work outside audit surface integration
