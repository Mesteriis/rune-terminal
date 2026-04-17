# Compatibility Facade Baseline for Legacy Frontend Calls

## 1) Legacy access surface inventory

Current callsites that should be crossed by a compatibility seam:

- Runtime and transport bootstrap entrypoint
  - `frontend/wave.ts` drives shell bootstrap and calls into legacy store initialization.
  - `frontend/wave.ts` reads shell API via `getApi()` and does not expose a typed runtime value object.
- Runtime endpoint constants
  - `frontend/util/endpoints.ts` owns `WAVE_SERVER_WEB_ENDPOINT` and `WAVE_SERVER_WS_ENDPOINT`.
  - `frontend/util/endpoints.ts` exports `getWebServerEndpoint()` and `getWSServerEndpoint()` as the shared URL sources.
- Environment lookup
  - `frontend/util/getenv.ts` reads process or `window.api.getEnv(...)`.
- HTTP wrapper
  - `frontend/util/fetchutil.ts` selects Electron `net.fetch(...)` or global `fetch(...)`.
- Store transport entrypoints
  - `frontend/app/store/wos.ts` and `frontend/app/store/global.ts` call `fetch(getWebServerEndpoint() + "/wave/...")`.
  - `frontend/app/store/wos.ts`/`wshrpcutil-base.ts`/`wshrpcutil.ts` call websocket base URL from `getWSServerEndpoint()`.
- Legacy HTTP consumers outside stores (direct usage of endpoint helper)
  - `frontend/app/element/markdown-util.ts`
  - `frontend/app/view/preview/preview-streaming.tsx`
  - `frontend/app/view/vdom/vdom-model.tsx`
  - `frontend/app/aipanel/waveai-model.tsx`
  - `frontend/app/view/term/termsticker.tsx`
  - `frontend/app/view/codeeditor/schemaendpoints.ts`

## 2) Minimum migration seams by concern

- Runtime/bootstrap access seam
  - `frontend/util/endpoints.ts` + `frontend/util/getenv.ts`
  - `frontend/wave.ts` (for shell/runtime integration points)
- Generic API access seam
  - `frontend/app/store/global.ts` and `frontend/app/store/wos.ts` request endpoints from legacy helpers.
- Terminal seam
  - stream/file-like access in `frontend/app/element/markdown-util.ts`, `frontend/app/view/preview/preview-streaming.tsx`, `frontend/app/view/term/termsticker.tsx`.
  - typed terminal API contract exists in `frontend/rterm-api/terminal/*` for the next migration step.
- Workspace seam
  - no dedicated direct `/api/v1/workspace` callsites in legacy app code paths yet; workspace runtime is currently Wave RPC/Store based.
  - typed workspace contract exists in `frontend/rterm-api/workspace/*` for the next migration step.
- Policy/tools/access seam
  - legacy policy/tool calls are currently in Wave RPC flows.
- Compatibility seam point
  - new `frontend/compat/**` layer should present a small API that future terminal/workspace migrations can use without reading `frontend/util/endpoints.ts` and before touching store internals.

## 3) Explicit exclusions for this slice

- no terminal UI migration.
- no workspace UI migration.
- no full replacement of `frontend/app/store/**`.
- no broad helper rewrites.
- no `old_front` edits.
- no visual/style changes.

## 4) Facade rules

- thin adapter only (no behavior-heavy orchestration).
- no business logic or reducer-style branching.
- no new global store.
- no React or MobX imports.
- no visual dependency.
- do not replace legacy callsites in this slice; only provide the seam and documents.
