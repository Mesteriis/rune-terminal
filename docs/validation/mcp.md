# MCP Validation

## Last verified state

- Date: `2026-04-16`
- State: `PARTIAL` overall (`VERIFIED` for lifecycle/invoke/normalization paths, onboarding breadth still limited)
- Scope:
  - explicit lifecycle controls
  - explicit invoke path
  - output normalization/bounding behavior
  - explicit MCP-to-AI handoff behavior (no auto-injection)

## Commands/tests used

- `./scripts/go.sh test ./core/plugins ./core/app ./core/transport/httpapi -count=1`
- `npm exec eslint app/workspace/tools-floating-window.tsx compat/mcp.ts rterm-api/mcp/client.ts rterm-api/mcp/types.ts` (from `frontend/`)
- Runtime/API checks:
  - `GET /api/v1/mcp/servers`
  - `POST /api/v1/mcp/servers`
  - `POST /api/v1/mcp/servers/{id}/start|stop|restart|enable|disable`
  - `POST /api/v1/mcp/invoke`
  - `GET /api/v1/agent/conversation` (before/after explicit invoke)

## Known limitations

- External provider onboarding remains narrower than desired and was `PARTIAL` in playground validation.
- No broad MCP discovery/catalog UX in this phase.
- Explicit-only handoff is intentional: invoke does not auto-append agent conversation context.

## Evidence

- [MCP model](../mcp/mcp-model.md)
- [MCP playground validation](../mcp/mcp-playground-validation.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#mcp-playground-validation)
