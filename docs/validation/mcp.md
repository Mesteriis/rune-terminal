# MCP Validation

## Last verified state

- Date: `2026-04-26`
- State: `PARTIAL` overall (`VERIFIED` for lifecycle/invoke/normalization paths and active settings registration/lifecycle UI, broad onboarding/discovery still limited)
- Scope:
  - explicit lifecycle controls
  - active `frontend/src` settings onboarding section
  - explicit invoke path
  - output normalization/bounding behavior
  - explicit MCP-to-AI handoff behavior (no auto-injection)

## Commands/tests used

- `./scripts/go.sh test ./core/plugins ./core/app ./core/transport/httpapi -count=1`
- `npm --prefix frontend run test -- src/features/mcp/api/client.test.ts src/widgets/settings/mcp-settings-section.test.tsx`
- `npm run lint:frontend`
- `npm run build:frontend`
- Runtime/API checks:
  - `GET /api/v1/mcp/servers`
  - `POST /api/v1/mcp/servers`
  - `POST /api/v1/mcp/servers/{id}/start|stop|restart|enable|disable`
  - `POST /api/v1/mcp/invoke`
  - `GET /api/v1/agent/conversation` (before/after explicit invoke)

## Known limitations

- External provider onboarding remains narrower than desired: settings supports explicit remote endpoint registration, but there is no broad discovery/catalog/import workflow.
- No broad MCP discovery/catalog UX in this phase.
- Explicit-only handoff is intentional: invoke does not auto-append agent conversation context.

## Evidence

- [MCP model](../mcp/mcp-model.md)
- [MCP playground validation](../mcp/mcp-playground-validation.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#mcp-playground-validation)
