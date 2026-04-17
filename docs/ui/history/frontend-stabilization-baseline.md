# Frontend Stabilization Baseline (Slice 1)

Date: 2026-04-15

## Commands Executed

- `npm --prefix frontend run build`
- `npx tsc -p frontend/tsconfig.json --noEmit`
- `npm --prefix frontend run lint`
- `npm run tauri:dev` (non-interactive smoke check)
- `timeout 20 npm run tauri:dev` (non-interactive smoke check with forced stop)
- `go run ./cmd/rterm-core`
- `go run ./cmd/rterm-core serve -listen 127.0.0.1:0 -state-dir /tmp/runa-stab/state -workspace-root . -ready-file /tmp/runa-backend-ready.json`
- `npm --prefix frontend run dev -- --host 127.0.0.1 --port 5175 --strictPort`
- `VITE_RTERM_API_BASE=http://127.0.0.1:57723 npm --prefix frontend run dev -- --host 127.0.0.1 --port 5175 --strictPort` (runtime config verification)

## Command Outcomes

- `npm --prefix frontend run build` failed (`EXIT=1`). Log captured at `/tmp/runa_frontend_build.log` (2,427 lines). Failures are type/build blockers in app/panel/block/layout surfaces and are pre-existing beyond bootstrap.
- `npx tsc -p frontend/tsconfig.json --noEmit` failed (`EXIT=2`). Log captured at `/tmp/runa_frontend_tsc.log` (2,423 lines). Remaining failures are strict typing and nullability blockers in legacy seams.
- `npm --prefix frontend run lint` failed (`EXIT=1`). Log captured at `/tmp/runa_frontend_lint.log` (3,142 lines). Remaining failures are high-volume lint issues outside the startup seam set (aipanel, block, layout, util, global typing files).
- `npm run tauri:dev` compiled and launched backend successfully (`target/debug/rterm-desktop`), then exited with normal runtime handoff behavior.
- `timeout 20 npm run tauri:dev` emitted successful compile/start messages and terminated with `EXIT=124` after timeout, confirming launchability for non-interactive verification.
- `go run ./cmd/rterm-core` prints usage and exits with `2` when `serve` is omitted; this is expected behavior.
- `go run ./cmd/rterm-core serve ...` started successfully, wrote readiness JSON, and responded to `/healthz`, `/api/v1/bootstrap`, `/api/v1/workspace`, `/api/v1/terminal/term-main`, and `/api/v1/terminal/term-main/stream`.
- `npm --prefix frontend run dev -- --host 127.0.0.1 --port 5175 --strictPort` failed with alias-resolution blockers before patch (`@/store/*` resolving to `/frontend/store/*`), then passed module resolution for `/wave.ts` after patching `vite.config.ts`.
- `VITE_RTERM_API_BASE=... npm --prefix frontend run dev -- --host 127.0.0.1 --port 5175 --strictPort` serves frontend successfully and confirms `runtime/config.ts` inlines `VITE_RTERM_API_BASE` from import.meta.env; backend endpoints remain reachable at that injected base URL.

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
- Runtime/toolchain blockers seen during R2/R3 checks
  - Vite runtime currently reports missing `sass-embedded` and `tailwindcss` preprocessor dependencies when importing SCSS/Tailwind assets.
  - `onboarding-command.tsx` references `/logos/tideterm-logo-256.png`, and terminal viewer imports from `@xterm/xterm/src/browser/renderer/shared/Types`; these path issues were deferred because they are non-startup-critical after alias fix.
  - Front-end/API handshake checks at the network layer are limited without browser/MCP session capture; only server reachability and config inlining were validated here.

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
- Styling/tooling dependency install gaps (`sass-embedded`, `tailwindcss`) and non-bootstrap asset/runtime import edge cases not blocking process startup.
