# Structured Execution Browser Validation

Date: `2026-04-17`  
Mode: `Playwright headed (visible browser window, not headless)`

## Initial run (before corrective fix)

- Structured `/run` and block flow worked.
- Discrepancy: opening `Tools` or `Audit` triggered:
  - `The result of getSnapshot should be cached to avoid an infinite loop`
  - `Maximum update depth exceeded`
  - error boundary pointed to `ToolsFloatingWindow`.

## Corrective rerun (after fix)

### Browser flow used

1. Started live runtime stack:
   - Ollama-compatible stub: `http://127.0.0.1:11458`
   - Core API: `http://127.0.0.1:61123`
   - Frontend dev app: `http://127.0.0.1:4179`
2. Opened `http://127.0.0.1:4179` in headed Playwright browser.
3. Opened AI panel and submitted `/run echo regression-fix-flow-01`.
4. Observed structured execution block render and terminal output.
5. Clicked block `Explain`.
6. Opened right-rail `Tools` panel.
7. Opened right-rail `Audit` panel.
8. Sent terminal input `echo terminal-still-ok` to verify base shell path.

### What was visibly verified

- `/run` executes and terminal output appears.
- structured block renders with command/state/output.
- block `Explain` action works and updates the same block identity.
- `Tools` panel opens and renders tool catalog/controls.
- `Audit` panel opens and renders recent events.
- terminal input path continues to work (`terminal-still-ok` observed).
- browser console after corrective rerun: `Errors: 0`.

### API truth vs visible UI

- Matched:
  - `GET /api/v1/execution/blocks?limit=10` returned one block for this run with:
    - `provenance.command_audit_event_id = audit_edc2354d856bedc0`
    - `provenance.explain_audit_event_id = audit_b559b7ff0a779b31`
  - UI block summary/provenance remained coherent with the same command + explain chain.
- No tools/audit crash discrepancy remained in the corrective rerun.

## Headed/visible note

- Both the initial run and corrective rerun were executed in a visible headed browser session.
- No headless-only run was used for this validation.
