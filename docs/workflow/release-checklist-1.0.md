# Release Checklist `1.0.0`

Date: `2026-04-16`

## Validation gate

- [x] `npm run validate` passes end-to-end (`lint:frontend` active scope, `build:frontend`, `test:go`, `build:go`, `tauri:check`)
- [x] `npm run tauri:dev` startup smoke reaches desktop startup + runtime ready state
- [ ] `npm run lint:frontend:all` is green
  - current truth: `630 errors`, `151 warnings`
  - classification: tracked non-blocking debt under the current validation policy

## Truth checks

- [x] current docs explicitly separate required checks from tracked non-blocking debt
- [x] `docs/validation/validation.md` records concrete command evidence for this state
- [x] known limitations explicitly mention remaining repo-wide lint debt
