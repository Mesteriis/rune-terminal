# Release `1.0.0-rc1` Truth

Date: `2026-04-16`

This document defines release-validation truth for the current RC phase.

## Release-blocking checks

- `npm run validate` must pass.
- `npm run tauri:dev` startup smoke must reach desktop runtime startup.

Current status:

- `npm run validate`: `PASS`
- `npm run tauri:dev` smoke: `PASS` (startup reached `target/debug/rterm-desktop` with runtime ready JSON)

## Non-blocking (tracked) validation debt

- `npm run lint:frontend:all` remains red on legacy/frontend-import debt:
  - `630 errors`
  - `151 warnings`
- This is intentionally tracked but not a release blocker for `1.0.0-rc1` because current release gating focuses on active runtime/frontend paths and backend/runtime checks.

## Current release stance

- Release validation is now truthful and executable in CI/local (`npm run validate` is green).
- Full frontend lint debt remains visible and explicit through `npm run lint:frontend:all`.

## Next step after this batch

- Continue reducing `lint:frontend:all` debt in narrow slices.
- Re-evaluate when full-frontend lint should be promoted back to release-blocking status.
