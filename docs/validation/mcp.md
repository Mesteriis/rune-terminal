# MCP Validation

## Last verified state

- Date: `2026-04-26`
- State: `PARTIAL` overall (`VERIFIED` for lifecycle/invoke/normalization paths and active settings registration/lifecycle UI, broad onboarding/discovery still limited)
- Scope:
  - explicit lifecycle controls
  - active `frontend/src` settings onboarding section
  - filterable MCP server inventory inside the active settings shell
  - backend-owned MCP onboarding catalog and draft probe contract
  - explicit invoke path
  - output normalization/bounding behavior
  - explicit MCP-to-AI handoff behavior (no auto-injection)

## Commands/tests used

- `./scripts/go.sh test ./core/plugins ./core/app ./core/transport/httpapi -count=1`
- `./scripts/go.sh test ./core/app ./core/transport/httpapi -run 'TestNormalizeRemoteMCPRegistrationRequest|TestProbeRemoteMCPServerReportsReadyWithToolCount|TestListMCPCatalogReturnsTemplates|TestProbeMCPServerRejectsInvalidDraft' -count=1`
- `npm --prefix frontend run test -- src/features/mcp/api/client.test.ts src/widgets/settings/mcp-settings-section.test.tsx`
- `frontend/node_modules/.bin/vitest run src/widgets/settings/mcp-settings-section.test.tsx --reporter=verbose`
- `npm run lint:frontend`
- `npm run build:frontend`
- Runtime/API checks:
  - `GET /api/v1/mcp/servers`
  - `GET /api/v1/mcp/catalog`
  - `GET /api/v1/mcp/servers/{id}`
  - `POST /api/v1/mcp/probe`
  - `POST /api/v1/mcp/servers`
  - `PUT /api/v1/mcp/servers/{id}`
  - `DELETE /api/v1/mcp/servers/{id}`
  - `POST /api/v1/mcp/servers/{id}/start|stop|restart|enable|disable`
  - `POST /api/v1/mcp/invoke`
  - `GET /api/v1/agent/conversation` (before/after explicit invoke)

## Known limitations

- External provider onboarding remains narrower than desired: settings supports explicit remote endpoint registration, inspection, edit, and removal, but there is no broad discovery/catalog/import workflow.
- Template catalog and draft probe now exist at the backend contract, but active settings UI has not yet been widened to drive them end to end.
- Explicit-only handoff is intentional: invoke does not auto-append agent conversation context.

## Evidence

- [MCP model](../mcp/mcp-model.md)
- [MCP playground validation](../mcp/mcp-playground-validation.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#mcp-playground-validation)
