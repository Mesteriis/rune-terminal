# Compatibility Facade Usage Boundary

## What /frontend/compat owns now

- Runtime resolution wrapper over `/frontend/runtime`:
  - resolve runtime config
  - expose a runtime + context bootstrap shape
- Typed API composition over `/frontend/rterm-api`:
  - build `HttpClient` from resolved runtime config
  - expose clients (`terminal`, `workspace`, `bootstrap`, `connections`, etc.) through one facade entrypoint
- Thin terminal/workspace helper façades:
  - terminal stream URL/build behavior tied to runtime stream rules
  - workspace method shims for future migration wiring

## What it does not own

- Legacy stores (`frontend/app/store/**`), websocket RPC wiring, or legacy bootstrap behavior.
- `frontend/util/endpoints.ts` and `frontend/util/fetchutil.ts` as runtime sources yet.
- Any terminal/workspace UI behavior.
- Visuals, styles, and global state migration.

## How future slices must use it

- Terminal migration:
  - call `resolveCompatRuntimeConfig` (or `bootstrapCompatRuntime`) for runtime inputs,
  - then obtain terminal helper methods via `createTerminalFacade`.
  - never call legacy endpoint helpers directly for this seam.
- Workspace migration:
  - obtain `workspace` typed client via API facade (`createCompatApiFacade`),
  - and optionally use `createWorkspaceFacade` for future callsite migration.
- Later feature migration:
  - add new feature code against `createCompatApiFacade` and helper facades before introducing direct module-level legacy calls.

## What remains legacy after this slice

- Most active UI and store behavior remains on legacy Wave-based paths.
- `getWebServerEndpoint`, `getWSServerEndpoint`, and `frontend/util/fetchutil.ts` remain in place.
- No migration wiring was done in existing `frontend/app/**` code.

## Facade rules for future slices

- do not bypass the compatibility facade in new migration work.
- do not add product logic or state orchestration here.
- do not grow `frontend/compat` into a global monolith; keep it as a tiny seam.
