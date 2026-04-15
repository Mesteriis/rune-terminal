# Frontend Stabilization Slice 2 Result

Date: 2026-04-15

## Command Status

- `npx tsc -p frontend/tsconfig.json --noEmit`: **passes**
- `npm --prefix frontend run build`: **passes**
  - Warnings remain from Lightning CSS (`@theme`, `@tailwind`, `@source`), electron browser externalization (`fs`, `path`), and large output chunks.
- `npm --prefix frontend run lint`: **fails**
  - Current run: `975 problems (815 errors, 160 warnings)`.
  - Remaining concentration: `frontend/app/aipanel/**`, `frontend/app/block/**`, `frontend/layout/**`, `frontend/util/**`, `frontend/types/*.d.ts`.
- `npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort`: **starts**
  - Browser smoke now completes instead of crashing on preload-only bootstrap assumptions.
- `go run ./cmd/rterm-core serve -listen 127.0.0.1:52732 ...`: **starts**
  - Verified endpoints: `/healthz`, `/api/v1/bootstrap`, `/api/v1/workspace`, `/api/v1/terminal/term-main`, `/api/v1/terminal/term-main/input`.

## Fixed in Slice 2

- Critical TypeScript/build blockers in active paths:
  - workspace layout panel API drift
  - active view/import/type mismatches in `workspace`, `builder`, `webview`, `proxy`, `tsunami`, `vdom`, `tab`, and `streamdown`
  - missing DTO/meta declarations used by active renderer paths
- Build blockers:
  - frontend dependency/install gaps (`tailwindcss`, `sass-embedded`, repo-root `highlight.js`)
  - broken onboarding asset import
- Runtime/dev truthfulness:
  - browser-hosted Vite startup no longer dies on missing Electron preload
  - browser dev mode now validates the typed runtime/API seam with real `health`, `bootstrap`, `workspace`, and terminal snapshot requests
  - default typed HTTP client fetch binding now works correctly in browser runtime

## Deferred

- Broad lint backlog in legacy AI, block, layout, util, and ambient typing files.
- Full legacy Wave/Electron renderer migration away from the old WOS bootstrap path.
- Broad cleanup, plugin implementation, feature expansion, and visual refactor.

## Boundary Note

The stabilization work preserved the `runtime/**`, `rterm-api/**`, and `compat/**` seams. No new in-process shortcut assumptions or hidden plugin-hostile coupling were introduced; the browser-dev fallback uses explicit typed clients and the existing preload seam only.
