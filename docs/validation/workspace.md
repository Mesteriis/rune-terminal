# Workspace Validation

## Last verified state

- Date: `2026-04-18`
- State: `VERIFIED`
- Scope:
  - top shell header is `40px` tall and currently renders window controls, `AI`, and the tab strip
  - a right-side action rail is present, is `40px` wide, and contains two placeholder buttons
  - Dockview fills the remaining center viewport and boots three base panels from `onReady`
  - single-tab widget headers render as narrow title headers instead of tab-strip selectors
  - single-tab widget drag can start from the full header area, not only the title text
  - the top `AI` button creates and removes a left Dockview AI group instead of a shell overlay
  - the AI group exposes a header `+` action that adds another AI tab into the same group
  - non-AI tabs do not merge into the locked AI group during drag/drop attempts
  - a Dockview sash is present between the AI group and the workspace, but headless drag did not confirm width movement in this environment

## Commands/tests used

- `npm --prefix frontend run build`
- `npm --prefix frontend run lint:active`
- `curl -sf http://127.0.0.1:5173`
- `node --input-type=module -e "<headless Playwright localhost validation for AI Dockview create/remove, AI add-tab, blocked drop into AI group, Dockview sash probe, and right-rail geometry>"`

## Known limitations

- This validation covers only the initial layout skeleton. It does not claim backend wiring, workspace persistence, or TideTerm parity breadth.
- The AI surface is now a special Dockview group, but it still does not provide chat behavior or persistence semantics.
- The Dockview sash between the AI group and the workspace is visible, but scripted headless drag kept the AI width at `432px -> 432px`, so resize movement is not claimed as verified from this environment.
- Browser validation was run headlessly against the Vite dev server, not through full `npm run tauri:dev`.

## Evidence

- Initial panel set rendered as `terminal-header`, `terminal`, and `tool`.
- Top shell header rendered at `40px` height and the right action rail rendered at `40px` width with `2` buttons.
- Dockview occupied the center viewport beside the new right rail with no zero-height panels.
- Single-tab Dockview headers rendered at `24px` height with visible titles and `void/actions` areas hidden.
- Single-tab `.dv-tab` width expanded to the full header body (`1424/1440` and `704/720` after padding), and dragging from the empty right side of the top header moved `terminal-header` into the next group.
- Toggling the top `AI` button created a left Dockview AI group at `x=0`, `y=40`, `width=432`, `height=920`, while the right action rail stayed at `40px` width.
- The AI group header exposed the `Add AI tab` button, and clicking it produced `AI` and `AI 2` tabs inside the same locked AI group.
- Dragging the `tool` tab toward the AI tab header left the group inventory unchanged: AI group titles stayed `AI`, `AI 2`, and `tool` remained in its own non-AI group.
- Toggling the top `AI` button off removed all AI panels (`remainingAiPanels=0`).
- The Dockview sash between AI and workspace was visible at approximately `x=430`, `width=4`, `height=920`, but the scripted drag probe did not change the AI width from `432`.
