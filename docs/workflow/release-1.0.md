# Release `1.0.0` Truth

Date: `2026-04-16`

This document defines validation truth for the current stability phase.

## Stability-critical checks

- `npm run validate` must pass.
- `npm run tauri:dev` startup smoke must reach desktop runtime startup.

Current status:

- `npm run validate`: `PASS`
- `npm run tauri:dev` smoke: `PASS` (startup reached `target/debug/rterm-desktop` with runtime ready JSON)

## Non-blocking (tracked) validation debt

- `npm run lint:frontend:all` remains red on legacy/frontend-import debt:
  - `630 errors`
  - `151 warnings`
- This is intentionally tracked but not part of the required validation gate because the current validation policy focuses on active runtime/frontend paths and backend/runtime checks.

## Current validation stance

- The documented validation gate is truthful and executable in CI/local (`npm run validate` is green).
- Full frontend lint debt remains visible and explicit through `npm run lint:frontend:all`.

## Next step after this batch

- Continue reducing `lint:frontend:all` debt in narrow slices.
- Re-evaluate when full-frontend lint should join the required validation gate.
