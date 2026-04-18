# Workspace Validation

## Last verified state

- Date: `2026-04-18`
- State: `VERIFIED`
- Scope:
  - the app shell now applies `body` padding `6px`, and the root shell respects that outer frame on all four sides
  - top shell header is `40px` tall, lives only in the left main shell column, and currently renders icon-based window controls, the `AI` toggle, and the tab strip
  - a right-side action rail is present as a separate full-height column, is `40px` wide, and its lower action now uses a settings icon
  - the widget area now keeps explicit shell-chrome spacing: `12px` below the top header and `12px` before the right action rail
  - Dockview widget groups now keep explicit internal spacing: `12px` between rows and `12px` between columns
  - Dockview group header and body now render as a single glass surface instead of a separate boxed body layer
  - Dockview now uses a custom `theme` override to neutralize vendor color backgrounds instead of relying on the library's built-in color themes
  - the shared UI layer now exposes a tokenized dark-glass surface system with dark emerald and cold-tea accents, semantic spacing/padding scales, and blur/shadow tokens
  - Dockview fills the remaining main viewport beside the full-height right rail and boots three base panels from `onReady`
  - single-tab widget headers render as narrow title headers instead of tab-strip selectors
  - single-tab widget drag can start from the full header area, not only the title text
  - the top `AI` button creates and removes a left Dockview AI group instead of a shell overlay
  - the AI group exposes a header `+` action that adds another AI tab into the same group
  - non-AI tabs do not merge into the locked AI group during drag/drop attempts
  - a Dockview sash is present between the AI group and the workspace, but headless drag did not confirm width movement in this environment

## Commands/tests used

- `npm --prefix frontend run build`
- `npm --prefix frontend run lint:active`
- `curl -sf http://127.0.0.1:4193`
- `node --input-type=module -e "<headless Playwright localhost computed-style smoke for tokenized shell surfaces>"`
- `node --input-type=module -e "<headless Playwright localhost geometry smoke for widget gap below header and before right rail>"`
- `node --input-type=module -e "<headless Playwright localhost geometry smoke for Dockview row/column gaps and unified group surface>"`
- `node --input-type=module -e "<headless Playwright localhost smoke for body padding, transparent dv-dockview root, and vendor-theme override>"`
- `curl -sf http://127.0.0.1:5173`
- `node --input-type=module -e "<headless Playwright localhost validation for AI Dockview create/remove, AI add-tab, blocked drop into AI group, Dockview sash probe, and right-rail geometry>"`

## Known limitations

- This validation covers only the initial layout skeleton. It does not claim backend wiring, workspace persistence, or TideTerm parity breadth.
- The AI surface is now a special Dockview group, but it still does not provide chat behavior or persistence semantics.
- The token system currently covers shared UI layers and shell scaffolding. It does not yet claim a full Dockview vendor-theme rewrite beyond the existing shell overrides.
- The Dockview sash between the AI group and the workspace is visible, but scripted headless drag kept the AI width at `432px -> 432px`, so resize movement is not claimed as verified from this environment.
- Browser validation was run headlessly against the Vite dev server, not through full `npm run tauri:dev`.
- The shell icon swap was validated by type-check, build, and source inspection. A separate visual localhost smoke for the icon glyphs was attempted but is not claimed from this environment.

## Evidence

- Initial panel set rendered as `terminal-header`, `terminal`, and `tool`.
- Top shell header rendered at `40px` height with `1400px` width on a `1440px` viewport, and the right action rail started at `x=1400` with `40px` width, `960px` height, and `2` buttons.
- A live geometry smoke on `http://127.0.0.1:4193` confirmed `gapBelowHeader=12px` and `gapBeforeRail=12px`; the top group started at `y=52`, and the right-most group edge ended at `x=1388` before the rail at `x=1400`.
- A live geometry smoke on `http://127.0.0.1:4193` confirmed `betweenRows=12px` and `betweenCols=12px` for Dockview groups, while keeping `gapBelowHeader=12px` and `gapBeforeRail=12px`.
- The same smoke confirmed a unified group surface: group backgrounds rendered on `.dv-groupview`, while header, content container, and panel-content child all resolved to `rgba(0, 0, 0, 0)` backgrounds, so header and body no longer render as separate boxed layers.
- A live vendor-theme smoke on `http://127.0.0.1:4193` confirmed `bodyPadding=6px`, `.dv-dockview` root background `rgba(0, 0, 0, 0)`, and the Dockview root class stack no longer contributed a library color fill into the shell canvas.
- A follow-up live geometry smoke on `http://127.0.0.1:4193` confirmed the shell root is now constrained by `#root` instead of `100vh`: `#root` measured `y=6`, `height=846`, `bottom=852`, while the app root matched it at `y=6`, `height=846`, `bottom=852`.
- Static validation confirmed `lucide-react@^1.8.0` is installed and wired into the shell widgets: top header actions use `X`, `Minus`, `Maximize2`, and `Sparkles`; the AI-group header action uses `Plus`; and the lower-right rail action uses `Settings2`.
- Dockview occupied the main viewport beside the full-height right rail with no zero-height panels.
- Single-tab Dockview headers rendered at `24px` height with visible titles and `void/actions` areas hidden.
- Single-tab `.dv-tab` width expanded to the full header body (`1424/1440` and `704/720` after padding), and dragging from the empty right side of the top header moved `terminal-header` into the next group.
- Toggling the top `AI` button created a left Dockview AI group at `x=0`, `y=40`, `width=432`, `height=920`, while the right action rail stayed at `40px` width.
- The AI group header exposed the `Add AI tab` button, and clicking it produced `AI` and `AI 2` tabs inside the same locked AI group.
- Dragging the `tool` tab toward the AI tab header left the group inventory unchanged: AI group titles stayed `AI`, `AI 2`, and `tool` remained in its own non-AI group.
- Toggling the top `AI` button off removed all AI panels (`remainingAiPanels=0`).
- The Dockview sash between AI and workspace was visible at approximately `x=430`, `width=4`, `height=920`, but the scripted drag probe did not change the AI width from `432`.
- A live localhost computed-style smoke on `http://127.0.0.1:4193` confirmed the tokenized shell theme: `bodyBackground=rgb(6, 17, 15)`, `rootBackground=rgb(6, 17, 15)`, `aiButtonBackground=rgba(13, 29, 27, 0.84)`, `aiButtonBorder=rgba(130, 188, 170, 0.32)`, `aiButtonShadow=rgba(1, 7, 6, 0.32) 0px 10px 24px 0px`, `aiButtonBackdrop=blur(10px)`, `railWidth=40px`, `railBackground=rgba(11, 24, 22, 0.72)`, and `topbarHeight=40px`.
