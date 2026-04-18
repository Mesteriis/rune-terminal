# Window Behavior Validation

Date: `2026-04-17`  
Phase: stability hardening

## Headed browser run (explicit)

- Browser mode: **headed / visible** (not headless)
- Command used:
  - `node --input-type=module` (Playwright script with `chromium.launch({ headless: false })`)
- Result:
  - `VALIDATION_OK`

## Exact flow used

1. Launch real core runtime + frontend dev server on ephemeral ports.
2. Launch Playwright Chromium in headed mode (`headless: false`) and open the workspace.
3. Create explicit remote profile (`POST /api/v1/remote/profiles`) for remote-surface checks.
4. Build a multi-widget split layout using explicit `Split Right` actions (4 widgets total).
5. Verify base split/add behavior from backend truth (`window_layout` is split tree, panes visible).
6. Verify outer-zone behavior in headed UI drag/drop:
   - `outer-left` drop over a horizontal target group (source wraps outside target group).
   - `outer-top` drop over a vertical target group (source wraps above the target group).
7. Verify center-swap in headed UI drag/drop:
   - center drop swaps source and target paths in the existing tree shape.
   - dragged widget remains active.
8. Verify focus truth by clicking a pane (`active_widget_id` updates to clicked pane).
9. Reload page and verify persisted restore:
   - `active_widget_id` unchanged after reload
   - `window_layout` unchanged after reload.
10. Verify existing shell surfaces still work in the same run:
   - quick-actions `ui.open_ai_panel`
   - quick-actions `ui.open_audit_panel`
   - quick-actions `mcp.open_controls`
   - quick-actions remote profile selection + `remote.start_profile_session` action visibility
   - terminal panes remained interactive throughout.

## Visible verification summary

- Add-widget split behavior remains operational and deterministic.
- Outer-zone semantics are active in headed UI interactions (`outer-left`, `outer-top`) and route through backend truth.
- Center drop uses swap semantics (path swap), not split insertion.
- Focus/active widget state updates deterministically after click and drag/drop.
- Layout tree and active identity survive reload.
- Terminal, AI, audit, MCP, and remote profile surfaces remained operational in the same run.

## Metadata/API/UI truth alignment

- `window_layout` backend metadata matched rendered split/swap results after each headed action.
- UI actions route through explicit backend paths for execution-bearing changes:
  - `POST /api/v1/workspace/widgets/split`
  - `POST /api/v1/workspace/widgets/move-split`
  - `POST /api/v1/workspace/focus-widget`
- No hidden automation was observed in this flow.

## Remaining mismatch vs reference behavior

- No metadata/API/UI mismatch was observed in this headed run for validated parity actions.
