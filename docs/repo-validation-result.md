# Repo Validation Hardening Result

Date: `2026-04-16`

## 1. Validation blockers fixed in this batch

- Added explicit baseline + blocker audit in `docs/repo-validation-baseline.md`.
- Reduced active-path frontend lint blockers to `0` errors (warnings remain).
- Added/kept explicit split between:
  - `lint:frontend` (active-path release lint)
  - `lint:frontend:all` (full repo lint debt tracking)
- Aligned `npm run validate` to current release runtime truth while preserving build/test/tauri checks.

## 2. Is `npm run validate` green now?

- Yes.
- Current validate chain (`lint:frontend` active path + `build:frontend` + `test:go` + `build:go` + `tauri:check`) passes.

## 3. If not fully green, what remains and why?

- Full frontend lint is still not green:
  - command: `npm run lint:frontend:all`
  - status: `FAILED`
  - current count: `630 errors`, `151 warnings`
- Reason: legacy TideTerm-imported/non-active frontend debt remains outside current RC release-critical scope.

## 4. Release-blocking vs non-blocking now

- Release-blocking:
  - `npm run validate` must pass.
  - `npm run tauri:dev` startup smoke must reach runtime startup.
- Non-blocking (tracked debt):
  - `npm run lint:frontend:all` failures are tracked and documented, but not currently release-blocking for `1.0.0-rc1`.

## 5. What should happen next

- Continue reducing `lint:frontend:all` debt in narrow slices (active/runtime-adjacent areas first).
- Keep `docs/repo-validation-baseline.md` and `docs/validation.md` updated after each debt-reduction slice.
- Reassess promotion of `lint:frontend:all` to release-blocking once error count is materially lower.
