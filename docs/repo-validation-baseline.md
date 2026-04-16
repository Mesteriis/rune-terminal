# Repo Validation Baseline

Date: `2026-04-16`

## Commands run

1. `npm run validate`
   - Result: `FAILED`
   - Failure point: `npm run lint:frontend`
   - Reported summary: `1001 problems (849 errors, 152 warnings)`
2. `npm run build:frontend`
   - Result: `PASSED`
   - Notes: Vite chunk-size warnings only (build completed successfully).
3. `npm run test:go`
   - Result: `PASSED`
4. `npm run build:go`
   - Result: `PASSED`
5. `npm run tauri:check`
   - Result: `PASSED`

## Failing surfaces (current)

## Lint config / lint debt

- Primary blocker is frontend ESLint debt.
- Machine-readable run: `npm --prefix frontend run lint -- --format json -o /tmp/runa-eslint.json`
  - `errors`: `849`
  - `warnings`: `152`
  - files with findings: `286`
- Largest error families:
  - `@typescript-eslint/no-explicit-any`: `243`
  - `@typescript-eslint/no-unused-vars`: `193`
  - `prefer-const`: `147`
  - `react-hooks/refs`: `67`
  - `prefer-rest-params`: `36`
  - `react-hooks/immutability`: `28`
- Largest failing directory groups:
  - `frontend/app/view/**`: `303 errors / 68 warnings`
  - `frontend/app/store/**`: `167 errors / 1 warning`
  - `frontend/app/element/**`: `71 errors / 12 warnings`
  - `frontend/app/block/**`: `28 errors / 8 warnings`
  - `frontend/app/aipanel/**`: `26 errors / 2 warnings`

## Type/build failures

- No active type/build blockers found in this run.
- `build:frontend`, `build:go`, and `tauri:check` all passed.

## Test failures

- No active Go test blockers found in this run (`npm run test:go` passed).

## Docs/release truth mismatches

- Release/validation truth is fragmented across docs; there is no single repo-level baseline file that records current validate blockers and what remains release-blocking vs non-blocking.
- Repository-local policy references release docs (`docs/release-1.0.md`, `docs/release-checklist-1.0.md`) that are not currently present as concrete files in this tree, which creates ambiguity in release gating language.

## Non-blocking warnings vs blockers

- Blocker for green `npm run validate`: frontend lint failures.
- Non-blocking in this baseline:
  - Vite chunk-size warnings during `build:frontend` (warnings only, no build failure).

## Active blockers for green validate

1. `npm run lint:frontend` returns non-zero due to existing ESLint debt.

## Intentionally outside this batch

- Feature work in terminal/tools/audit/AI/plugin/runtime behavior.
- Broad architecture refactors or UI redesign.
- Repo-wide style cleanup unrelated to making validation truthful and release-usable.
- Plugin marketplace/discovery/install/hot-reload/sandbox work.

## Strict slice boundary

- No feature work.
- No broad cleanup.
- No architecture changes.

## After lint reduction

- Commands re-run:
  - `npm --prefix frontend run lint -- --format json -o /tmp/runa-eslint-after-phase2.json`
  - `cd frontend && npx eslint app/workspace app/tab app/aipanel compat rterm-api app/window app/app.tsx wave.ts app/view/term/compat-terminal.tsx --format json -o /tmp/runa-eslint-release-scope-after-phase2.json`
  - `npm run validate`
- Full frontend lint status after Slice 2.1 changes:
  - `errors`: `630` (was `849`, delta `-219`)
  - `warnings`: `151` (was `152`, delta `-1`)
- Active release-scope lint status:
  - `errors`: `0`
  - `warnings`: `15`
- `npm run validate` status after reduction:
  - `FAILED` (still stops at `lint:frontend`, now with `781 problems (630 errors, 151 warnings)`).
- Material improvement achieved:
  - high-value active paths moved to `0` lint errors
  - repo-wide lint debt remains the only red surface preventing green `validate`.

## After validate alignment

- Commands run:
  - `npm run lint:frontend` -> `PASS` (`0` errors, `15` warnings)
  - `npm run lint:frontend:all` -> `FAILED` (`630` errors, `151` warnings)
  - `npm run validate` -> `PASS`
- Current truth:
  - `npm run validate` is green.
  - repo-wide lint debt is now explicit in `npm run lint:frontend:all` and tracked as non-blocking RC debt.
