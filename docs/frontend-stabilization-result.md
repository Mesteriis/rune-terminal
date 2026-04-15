# Frontend Stabilization Result (Slice 1)

Date: 2026-04-15

## Command Status

- `npm --prefix frontend run build`: **fails** (`EXIT=1`).
- `npx tsc -p frontend/tsconfig.json --noEmit`: **fails** (`EXIT=2`).
- `npm --prefix frontend run lint`: **fails** (`EXIT=1`).
- `npm run tauri:dev`: **launches** core runtime paths and `rterm-desktop` successfully for non-interactive startup verification.
- `timeout 20 npm run tauri:dev`: starts successfully and exits with timeout (`EXIT=124`), confirming runtime launch remains reachable.

## Fixed Categories

- Tooling/bootstrap blockers
  - ESLint config parser/plugin wiring and related build/lint invocation errors were fixed in phase 2.
- Startup/path blockers in migrated seams
  - Removed immediate startup-path type failures introduced/left in app bootstrap and runtime utility boundary files:
    - `frontend/app/app.tsx`
    - `frontend/app/app-bg.tsx`
    - `frontend/wave.ts`
    - `frontend/runtime/environment.ts`
    - `frontend/util/waveutil.ts`
    - `frontend/util/getenv.ts`
    - `frontend/util/focusutil.ts`
    - `frontend/util/wsutil.ts`
- Removed false-positive/lint-blocking issues in the edited hotspot set (`npx eslint` passes on touched files).

## Deferred Categories

- Pre-existing strict typing debt in:
  - `frontend/app/aipanel/*`
  - `frontend/app/block/*`
  - `frontend/layout/*`
  - `frontend/util/*` legacy utility sets outside touched startup paths
- Cross-cutting `@ai-sdk` / `ai` stream typing incompatibilities in AI model integration.
- Broad `no-explicit-any`, `no-unused-vars`, and hook-lifecycle lint remediation outside startup-critical files.
- Visual/style/UX redesigns or plugin-system implementation.

## Architecture Integrity Note

No migration seam assumptions were reversed: `runtime/api/compat` boundaries and the multi-process runtime direction remain intact. The changes are strictly typing/defensive-shape fixes at seam edges and did not introduce implicit in-process state coupling or tighten architecture around a shared singleton runtime.
