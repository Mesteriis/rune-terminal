# Workspace Validation

## Last verified state

- Date: `2026-04-18`
- State: `VERIFIED`
- Scope:
  - top bar order is `AI`, then the tab strip
  - `40px` top bar above the workspace
  - Dockview fills the remaining viewport and boots three panels from `onReady`
  - AI panel opens on the left, occupies `50%` of the window width, and pushes Dockview to the right instead of overlapping it
  - Dockview drag and sash resize work on the live Vite app

## Commands/tests used

- `npm run validate`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint:active`
- `npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort`
- `curl -sf http://127.0.0.1:5173`
- `node --input-type=module -e "<headless Playwright localhost validation for panel presence, overlay bounds, sash resize, and tab drag>"`

## Known limitations

- This validation covers only the initial layout skeleton. It does not claim backend wiring, workspace persistence, or TideTerm parity breadth.
- The AI surface is intentionally a plain left-side layout panel. It does not yet provide chat behavior or Dockview-integrated panels.
- Browser validation was run headlessly against the Vite dev server, not through full `npm run tauri:dev`.

## Evidence

- Initial panel set rendered as `terminal-header`, `terminal`, and `tool`.
- Top bar rendered in the requested order: `AI`, then `TAB-1`, then `TAB-2`.
- Dockview occupied the full viewport below the `40px` top bar with no zero-height panels.
- Opening `AI SIDEBAR` on a `1440px` wide viewport produced a left panel at `x=0`, `y=40`, `width=720`, `height=920`, while the first Dockview group started at `x=720` with `overlap=false`.
- Dragging the vertical sash changed the bottom panel widths from `720/720` to `598/842`.
- Dragging the `tool` tab into the top group merged the layout into two groups: `terminal-header + tool` on top and `terminal` below.
