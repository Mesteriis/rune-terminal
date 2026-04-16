# MCP Registration Baseline

Date: `2026-04-16`  
Phase: `1.0.0-rc1` hardening

## Why `POST /api/v1/mcp/servers` returns `405`

Current HTTP routing only registers:

- `GET /api/v1/mcp/servers`
- `POST /api/v1/mcp/servers/{serverID}/start`
- `POST /api/v1/mcp/servers/{serverID}/stop`
- `POST /api/v1/mcp/servers/{serverID}/restart`
- `POST /api/v1/mcp/servers/{serverID}/enable`
- `POST /api/v1/mcp/servers/{serverID}/disable`
- `POST /api/v1/mcp/invoke`

There is no `POST /api/v1/mcp/servers` handler, so Go `ServeMux` returns `405 Method Not Allowed` for that path/method combination.

## What is missing for registration

1. Transport layer entrypoint for MCP creation:
   - no request decoder/validator for MCP server registration payload
2. Runtime registration method:
   - no app-level method to register a new MCP server spec at runtime
3. Registry model for external MCP endpoint config:
   - MCP registry currently stores process-only spec and has no minimal remote endpoint/header shape
4. UI wiring:
   - tools panel can list/control/invoke existing servers, but cannot add a new server

## Minimal API needed

Add a minimal explicit registration endpoint:

- `POST /api/v1/mcp/servers`
- request body:
  - `id` (string, required)
  - `type` (string, required, currently only `remote`)
  - `endpoint` (string, required for `remote`)
  - `headers` (object string->string, optional)

Behavior requirements:

- validate input and reject invalid payloads with explicit `400` errors
- register server in backend-owned MCP registry
- do not auto-start the server after registration
- new server must appear in `GET /api/v1/mcp/servers` with initial state `stopped`
