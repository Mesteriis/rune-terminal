# Frontend Stabilization Baseline (Slice 1)

Date: 2026-04-15

## Commands Executed

- `npm --prefix frontend run build`
- `npx tsc -p frontend/tsconfig.json --noEmit`
- `npm --prefix frontend run lint`
- `npm run tauri:dev` (non-interactive smoke check)
- `timeout 20 npm run tauri:dev` (non-interactive smoke check with forced stop)

## Command Outcomes

- `npm --prefix frontend run build` failed (`EXIT=1`). Log captured at `/tmp/runa_frontend_build.log` (2,427 lines). Failures are type/build blockers in app/panel/block/layout surfaces and are pre-existing beyond bootstrap.
- `npx tsc -p frontend/tsconfig.json --noEmit` failed (`EXIT=2`). Log captured at `/tmp/runa_frontend_tsc.log` (2,423 lines). Remaining failures are strict typing and nullability blockers in legacy seams.
- `npm --prefix frontend run lint` failed (`EXIT=1`). Log captured at `/tmp/runa_frontend_lint.log` (3,142 lines). Remaining failures are high-volume lint issues outside the startup seam set (aipanel, block, layout, util, global typing files).
- `npm run tauri:dev` compiled and launched backend successfully (`target/debug/rterm-desktop`), then exited with normal runtime handoff behavior.
- `timeout 20 npm run tauri:dev` emitted successful compile/start messages and terminated with `EXIT=124` after timeout, confirming launchability for non-interactive verification.

## Failure Categories

- Tooling/config failures
  - Completed in earlier pass: ESLint flat-config shape and runtime bootstrap wiring.
  - Remaining failures are from source-level type/lint debt, not command bootstrap blocking.
- Missing/strict typing blockers
  - `verbatimModuleSyntax`, `erasableSyntaxOnly`, strict nullability, and `@-only` import separation errors across migrated and legacy surfaces.
  - AI panel and block/layout files now produce the majority of unresolved TS/Lint errors.
- Migration seam fallout
  - Significant legacy typing drift is present in AI panel and layout/block seams.
- Configuration dependency debt
  - Some type-contract conflicts remain in plugin/AI typing stacks (`@ai-sdk/react` / `ai` boundary), not yet fixed.

## In-Scope for Slice 1

- Make build/lint/typecheck command execution truthful and actionable.
- Fix configuration blockers required for command bootstrapping.
- Fix highest-value startup/path blockers in migrated seams:
  - `frontend/app/app.tsx`
  - `frontend/app/app-bg.tsx`
  - `frontend/wave.ts`
  - `frontend/runtime/environment.ts`
  - `frontend/util/waveutil.ts`
  - `frontend/util/getenv.ts`
  - `frontend/util/focusutil.ts`
  - `frontend/util/wsutil.ts`

## Deferred (Out of Scope)

- Full legacy cleanup for AI panel, block/layout, and other pre-existing strictness debt.
- Plugin runtime implementation and side-process execution model (deferred by this slice).
- Feature work and architectural refactors.
- Additional deep compatibility fixes not affecting startup bootstrap or active runtime paths.
