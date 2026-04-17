# Shell Stretch Baseline

Date: `2026-04-17`
Phase: `1.0.0-rc1` hardening

This document records the real shell stretch/fill regression that remained visible after the navigation parity batch.

## Exact reproduction state

- Desktop runtime:
  - `npm run tauri:dev`
  - observed launch:
    - `{"base_url":"http://127.0.0.1:60917","pid":39052}`
- Visible desktop state:
  - default compat shell startup with the left AI panel visible and the main terminal region active
  - desktop screen capture taken from the live Tauri window during that state
- DOM trace state:
  - fresh compat runtime launched against a live core/frontend pair
  - inspected the active compat widget pane and walked its parent chain back to `#main`

## Screenshot-visible symptom summary

- The live desktop window still showed the active shell content compressed into a smaller centered band instead of filling the main content region.
- A large dead area remained above and below the active terminal/content surface inside the main shell body.
- The visible mismatch was not limited to overlays; it affected the primary content region of the active layout itself.

## Exact component/container chain inspected

Active leaf upward chain:

1. `frontend/app/view/term/compat-terminal.tsx`
   - `.view-term.term-mode-term`
2. `frontend/app/tab/compat-split-layout.tsx`
   - `[data-testid="compat-widget-pane-term-main"]`
   - `[data-testid="compat-window-layout"]`
3. `frontend/app/tab/tabcontent.tsx`
   - compat wrapper: `div.flex.flex-row.flex-grow.min-h-0.w-full.items-center.justify-center.overflow-hidden.relative.pt-[3px].pr-[3px]`
4. `frontend/app/workspace/workspace.tsx`
   - main content row: `div.flex.flex-row.h-full.min-h-0.min-w-0`
   - main panel wrapper from `react-resizable-panels`
   - panel container: `div.flex.flex-row.flex-grow.min-h-0.min-w-0.overflow-hidden`
   - workspace root: `div.flex.flex-col.w-full.flex-grow.min-h-0.overflow-hidden`
5. `frontend/app/app.tsx`
   - compat app root: `div.flex.flex-col.w-full.h-full`
6. `frontend/app/app.scss`
   - `#main`, `body`, `html`

Relevant Tide comparison files:

- `tideterm/frontend/app/workspace/workspace.tsx`
- `tideterm/frontend/app/tab/tabcontent.tsx`
- `tideterm/frontend/layout/lib/TileLayout.tsx`
- `tideterm/frontend/layout/lib/tilelayout.scss`

## Measured failure

The live compat DOM trace showed:

- tab content region height: `867px`
- compat main content row height: `867px`
- `compat-window-layout` height: `348px`
- active widget pane height: `348px`

That proved the upstream workspace shell was already receiving the full height, but the compat split layout was not propagating that height into the active content leaf.

## Root cause classification

- Classification: `missing flex propagation`
- Exact failure:
  - the compat tab-content wrapper in [`frontend/app/tab/tabcontent.tsx`](/Users/avm/projects/Personal/tideterm/runa-terminal/frontend/app/tab/tabcontent.tsx:34) preserves Tide's centered wrapper semantics (`items-center justify-center`)
  - Tide's legacy content child is `TileLayout`, which explicitly declares `width: 100%` and `height: 100%` in [`tideterm/frontend/layout/lib/tilelayout.scss`](/Users/avm/projects/Personal/tideterm/runa-terminal/tideterm/frontend/layout/lib/tilelayout.scss:1)
  - the compat replacement child in [`frontend/app/tab/compat-split-layout.tsx`](/Users/avm/projects/Personal/tideterm/runa-terminal/frontend/app/tab/compat-split-layout.tsx:393) only declared flex growth/min-size guards and did not declare the equivalent full-size/self-stretch contract
  - because the parent wrapper aligns children to the center on the cross axis, the compat split layout collapsed to its intrinsic content height instead of stretching to the full available panel height

## Root cause note

This was not a backend/layout-state bug and not a general shell-tree collapse from `html`/`body`/`#main`. The broken contract was local to the compat active-content root inside the already-correct workspace shell region.
