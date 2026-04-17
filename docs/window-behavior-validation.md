# Window Behavior Validation

Date: `2026-04-17`  
Phase: `1.0.0-rc1` release hardening

## Headed browser run (explicit)

- Browser mode: **headed / visible** (not headless)
- Command used:
  - `npx playwright test -c e2e/playwright.config.ts e2e/window-behavior.spec.ts --headed`
- Result:
  - `1 passed (13.7s)`

## Exact flow used

1. Launch real core runtime + frontend dev server from Playwright fixture.
2. Open workspace and confirm terminal window pane is visible.
3. Create a remote profile through API (`/api/v1/remote/profiles`) for explicit remote-context checks.
4. Add new widget from active pane via `Split Right` button.
5. Verify API truth after split:
   - new widget added in active tab
   - `active_widget_id` moved to new widget
   - `window_layout` became a horizontal split with expected order.
6. Click original pane to verify focus update (`POST /api/v1/workspace/focus-widget`) and `active_widget_id` truth.
7. Drag source pane over target pane with drop zones:
   - `left`
   - `right`
   - `top`
   - `bottom`
8. After each drop, verify API truth:
   - `POST /api/v1/workspace/widgets/move-split` succeeded
   - `window_layout` axis/order matched the drop side
   - moved widget remained active.
9. Reload page and verify restore correctness from backend snapshot:
   - `active_tab_id` preserved
   - `active_widget_id` preserved
   - `window_layout` preserved.
10. Verify existing shell surfaces still work:
   - terminal pane remains interactive/visible
   - AI panel action works (`ui.open_ai_panel`)
   - Audit panel opens (`ui.open_audit_panel`)
   - MCP controls open through Tools (`mcp.open_controls`)
   - remote context is explicit (`remote.start_profile_session` enabled only when profile exists/selected).

## Visible verification summary

- Add-widget split behavior works and follows reference side semantics.
- Drop-target split behavior works for all four required directions.
- Focus/active widget state updates deterministically after click and drag/drop move.
- Layout tree and active identity survive page reload.
- Terminal, AI, Tools/Audit/MCP, and remote profile context surfaces remained operational in the same run.

## Metadata/API/UI truth alignment

- `window_layout` metadata from backend snapshot matched rendered split orientation/order after each action.
- UI actions route through explicit backend paths for execution-bearing changes:
  - `POST /api/v1/workspace/widgets/split`
  - `POST /api/v1/workspace/widgets/move-split`
  - `POST /api/v1/workspace/focus-widget`
- No hidden automation was observed in this flow.

## Remaining mismatch vs full reference behavior

- This batch implements required `left/right/top/bottom` drop-side behavior.
- Reference-only extended zones (`outerTop/outerRight/outerBottom/outerLeft`) and center swap semantics are still not implemented in the compat surface.
