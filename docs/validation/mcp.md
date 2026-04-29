# MCP Validation

## Last verified state

- Date: `2026-04-30`
- State: `VERIFIED` overall for the active bounded MCP scope (explicit lifecycle/invoke/normalization plus template-driven onboarding; no marketplace-style discovery claimed)
- Scope:
  - explicit lifecycle controls
  - lifecycle controls now append core-owned audit events for
    register/update/start/stop/restart/enable/disable/delete success and
    failure paths
  - draft probe now also appends a core-owned `mcp.probe` audit event, and MCP
    lifecycle/probe audit summaries redact URL userinfo, query strings, and
    fragments instead of recording endpoint-embedded secrets
  - active `frontend/src` settings onboarding section
  - filterable MCP server inventory inside the active settings shell
  - backend-owned MCP onboarding catalog and draft probe contract
  - remote MCP detail responses redact sensitive persisted headers, while
    updates preserve existing secret values when the redaction placeholder is
    submitted unchanged
  - remote MCP register/update/delete/enable mutations restore the live
    registry state when registry-file persistence fails, so failed lifecycle
    writes cannot leave runtime-only MCP capabilities behind
  - template-driven onboarding helpers inside active settings
  - explicit invoke path
  - output normalization/bounding behavior
  - explicit MCP-to-AI handoff behavior (no auto-injection)

## Commands/tests used

- `./scripts/go.sh test ./core/transport/httpapi -run 'TestMCPServerLifecycleAppendsAuditEvents|TestMCPServerLifecycleAppendsFailureAuditEvent' -count=1`
- `./scripts/go.sh test ./core/app ./core/transport/httpapi -run 'TestMCPLifecycleAuditSummaryRedactsEndpointSecrets|TestMCPProbeAppendsAuditEventWithoutSecretHeadersOrQuery' -count=1`
- `./scripts/go.sh test ./core/transport/httpapi -run 'TestGetMCPServerRedactsSensitiveHeaders|TestGetAndUpdateMCPServer' -count=1`
- `./scripts/go.sh test ./core/app -run TestUpdateMCPServerPreservesRedactedSensitiveHeaders -count=1`
- `./scripts/go.sh test ./core/app -run 'Test(Register|Update|Delete|Set)MCPServer.*PersistFails' -count=1`
- `./scripts/go.sh test ./core/app -run 'TestMCPRegistryPersistence|TestUpdateMCPServerPreservesRedactedSensitiveHeaders|Test.*MCPServer.*PersistFails|TestMCPLifecycleAuditSummaryRedactsEndpointSecrets|TestMCPProbeAppendsAuditEventWithoutSecretHeadersOrQuery' -count=1`
- `./scripts/go.sh test ./core/app ./core/plugins ./core/transport/httpapi -run 'Test.*MCP' -count=1`
- `./scripts/go.sh test ./core/plugins ./core/app ./core/transport/httpapi -count=1`
- `./scripts/go.sh test ./core/app ./core/transport/httpapi -run 'TestNormalizeRemoteMCPRegistrationRequest|TestProbeRemoteMCPServerReportsReadyWithToolCount|TestListMCPCatalogReturnsTemplates|TestProbeMCPServerRejectsInvalidDraft' -count=1`
- `npm --prefix frontend run test -- src/features/mcp/api/client.test.ts src/widgets/settings/mcp-settings-section.test.tsx`
- `frontend/node_modules/.bin/vitest run src/widgets/settings/mcp-settings-section.test.tsx --reporter=verbose`
- `npm run test:ui -- --reporter=line e2e/shell-workspace.spec.ts --grep "mcp settings onboard a remote server from template helpers and draft probe"`
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
- Active settings now drives the bounded template catalog and draft probe end to end; this remains a curated onboarding surface rather than a broad MCP marketplace/discovery product.
- Explicit-only handoff is intentional: invoke does not auto-append agent conversation context.

## Evidence

- [MCP model](../mcp/mcp-model.md)
- [MCP playground validation](../mcp/mcp-playground-validation.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#mcp-playground-validation)
