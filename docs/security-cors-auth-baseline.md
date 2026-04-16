# CORS and Auth Baseline

## Current CORS behavior

- `core/transport/httpapi/middleware.go` sets `Access-Control-Allow-Origin: *` for every request.
- It also allows `Authorization, Content-Type` headers and `GET, POST, PUT, PATCH, DELETE, OPTIONS` methods for every origin.
- Preflight `OPTIONS` requests return `204` without origin checks.

## Current auth behavior

- `core/transport/httpapi/middleware.go` protects all routes except `GET /healthz`.
- Auth currently accepts:
  - `Authorization: Bearer <token>` on normal API routes
  - `?token=<token>` only on terminal SSE stream routes
- If `api.authToken == ""`, auth becomes effectively disabled for every protected route.

## Intentionally public routes

- `GET /healthz` is intentionally public for bootstrap/health checks.

## Currently too permissive

- Wildcard CORS exposes the local API to any browser origin that can reach the loopback listener.
- Protected routes silently become public when `RTERM_AUTH_TOKEN` is unset.
- The transport request type still syntactically accepts some fields that are not trusted by execution truth; this is adjacent hardening that can be tightened if it fits the auth/origin contract cleanup naturally.

## Slice boundary

- No UI redesign
- No persistence work
- No transport redesign beyond auth/origin hardening
