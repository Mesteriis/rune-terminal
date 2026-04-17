# Frontend Runtime Adapter Usage

## What the adapter is

`frontend/runtime` is a small, framework-agnostic runtime source-of-truth layer for frontend runtime inputs used by the new Go HTTP paths.

It resolves:
- HTTP base URL
- auth token
- runtime environment (`isTauri`, `isDev`, `platform`)
- terminal stream auth constraints

## What it owns now

- Runtime config resolution (`resolveRuntimeConfig`, `bootstrapRuntime`)
- Environment detection (`detectRuntimeEnvironment`, `isTauriRuntime`, `hasBrowserWindow`)
- Terminal stream URL construction for Go terminal SSE (`buildRuntimeTerminalStreamUrl`)
- Public exported surface through `frontend/runtime/index.ts`

## What it does not own yet

- Legacy app bootstrap logic in `frontend/wave.ts`
- `frontend/util/endpoints.ts`, `frontend/util/getenv.ts`, `frontend/util/fetchutil.ts`
- `frontend/app/store/**` network calls and websocket orchestration
- Any store or React wiring changes

## How future slices must use it

- typed API client configuration: pass `RuntimeConfig` from `resolveRuntimeConfig()` into `frontend/rterm-api/http` clients
- compatibility facade: map existing frontend requests to typed clients while preserving current behavior
- terminal migration: use `buildRuntimeTerminalStreamUrl` / stream auth mode for `/api/v1/terminal/{widgetID}/stream`
- workspace migration: resolve API base/auth once and reuse for workspace clients

## What remains legacy after this slice

- `frontend/app/store` still drives runtime assumptions through `WAVE_SERVER_*` helpers.
- legacy websocket/runtime calls stay unchanged.
- no UI/network integration to `rterm-api` has been made yet.
