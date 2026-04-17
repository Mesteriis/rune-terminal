# Frontend Runtime Bootstrap Truth

## 1) Current frontend bootstrap path

Frontend startup continues to begin in `frontend/wave.ts`.

- `wave.ts` reads `platform` from `getApi().getPlatform()`.
- `wave.ts` imports `getApi` from `frontend/app/store/global`.
- On `DOMContentLoaded`, `wave.ts` calls `initBare()`, then waits for `getApi().onWaveInit` / `getApi().onBuilderInit`.
- `initWave`/`initBuilder` initialize legacy models and stores under `frontend/app/store` and call store-level bootstrap routines.
- The current network path for legacy data access is not in `wave.ts`; it is in store/util modules called after store initialization.

## 2) Current runtime assumptions

- Base URL is currently built by `frontend/util/endpoints.ts`:
  - `WebServerEndpointVarName = "WAVE_SERVER_WEB_ENDPOINT"`
  - `WSServerEndpointVarName = "WAVE_SERVER_WS_ENDPOINT"`
  - `getWebServerEndpoint()` returns `http://${getEnv(WebServerEndpointVarName)}`
  - `getWSServerEndpoint()` returns `ws://${getEnv(WSServerEndpointVarName)}`
- `frontend/util/getenv.ts` resolves env values by:
  - `window.api.getEnv(...)` first when `window` exists
  - `process.env[...]` fallback when no browser API is available
- `frontend/util/fetchutil.ts` uses Electron `net.fetch(...)` when available, otherwise `globalThis.fetch`.
- Runtime assumptions are therefore environment-driven and not a single runtime-config object.
- Legacy env names still drive the current transport (`WAVE_SERVER_WEB_ENDPOINT`, `WAVE_SERVER_WS_ENDPOINT`).
- `frontend/util/isdev.ts` also keeps legacy booleans:
  - `TIDETERM_DEV`
  - `TIDETERM_DEV_VITE`
- Legacy stream assumptions:
  - Legacy websocket path uses `initGlobalWS(... "/ws?routeid=...")` from `app/store/wshrpcutil.ts`.
  - Legacy HTTP calls build URLs from `getWebServerEndpoint()` (for `/wave/*`, file stream, schema, AI endpoints, etc.).

## 3) Tauri boundary truth

- `apps/desktop/src-tauri/src/main.rs` starts the Go core process with a generated auth token and captures ready-state URL:
  - `RTERM_AUTH_TOKEN` is passed into the core process
  - the Go runtime is launched with `--ready-file`
  - on readiness, state stores `base_url` and `auth_token`
- `main.rs` exposes Tauri command `runtime_info`, returning:
  - `base_url`
  - `auth_token`
- `apps/desktop/src-tauri/tauri.conf.json` currently points to:
  - `build.devUrl = "http://127.0.0.1:5173"`
  - `build.frontendDist = "../../frontend/dist"`
- Tauri does not currently own legacy endpoint constants (`WAVE_SERVER_*`), which remain in frontend util code.
- Legacy frontend modules still call the old endpoint helpers and store networking directly.

## 4) Runtime adapter requirements

For this slice, the new adapter boundary must provide:

- A resolved runtime config with:
  - `baseUrl`
  - `authToken`
  - `isTauri`
  - `isDev`
  - stream auth representation for `/api/v1/terminal/{widgetID}/stream`
- Source-of-truth resolution order that matches current reality:
  - prefer Tauri `runtime_info` in shell mode
  - allow Vite/env fallback in non-Tauri flows
  - allow legacy `WAVE_SERVER_WEB_ENDPOINT` when legacy env is present
  - fallback to `window.location.origin` when no explicit values exist
- Terminal stream URL behavior that avoids false assumptions (query-token path only when token is available).
