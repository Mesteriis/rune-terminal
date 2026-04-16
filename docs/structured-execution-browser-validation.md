# Structured Execution Browser Validation

Date: `2026-04-17`  
Mode: `Playwright headed (visible browser window, not headless)`

## Browser flow used

1. Started live runtime stack:
   - Ollama-compatible stub: `http://127.0.0.1:11458`
   - Core API: `http://127.0.0.1:61123`
   - Frontend dev app: `http://127.0.0.1:4179`
2. Opened `http://127.0.0.1:4179` in headed Playwright browser.
3. Opened AI panel and submitted `/run echo structured-browser-flow-01`.
4. Observed terminal output and structured execution block render.
5. Clicked block `Explain`.
6. Expanded `Reveal Provenance` on the block.
7. Exercised shell basics by opening right-rail `Tools` and `Audit`.

## What was visibly verified

- `/run` executed through the live app:
  - terminal surface showed `echo structured-browser-flow-01` and output `structured-browser-flow-01`
  - AI transcript rendered execution + explain chain
- Structured block appeared with:
  - command intent: `echo structured-browser-flow-01`
  - result state: `executed`
  - output excerpt: `structured-browser-flow-01`
- Block explain action executed and preserved block identity:
  - UI remained at `1 recent` block (no duplicate append from explain action)
  - block explain summary updated to the latest explain response
- Provenance cues rendered in UI:
  - command audit ID and explain audit ID were both visible after `Reveal Provenance`

## API truth vs visible UI

- Matched:
  - `GET /api/v1/execution/blocks?limit=10` returned one block with:
    - `provenance.command_audit_event_id = audit_df4cebafd07b22ce`
    - `provenance.explain_audit_event_id = audit_b6a6571a35aa100c`
  - UI `Reveal Provenance` displayed the same command/explain audit IDs.
- Discrepancy found:
  - opening `Tools` or `Audit` utility panels triggered frontend runtime error:
    - `Maximum update depth exceeded`
    - error boundary text references `ToolsFloatingWindow`
  - This run therefore does **not** validate tools/audit panels as healthy; terminal and AI/structured-block flow remained functional before the crash.

## Headed/visible note

- Validation was run in a headed Playwright browser session with a visible UI window.  
- No headless-only run was used for this validation.
