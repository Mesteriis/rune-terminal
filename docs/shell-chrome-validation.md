# Shell Chrome Validation

Date: `2026-04-17`
Validation mode: `real desktop runtime + headed / visible browser`

This validation used the repo-root Tide sources as the primary reference for shell chrome parity and checked the active compat shell in both the live desktop app and a visible browser session.

## Tide source files checked against visible behavior

- `tideterm/frontend/app/tab/tabbar.tsx`
- `tideterm/frontend/app/tab/tabbar.scss`
- `tideterm/frontend/app/tab/tab.tsx`
- `tideterm/frontend/app/tab/tab.scss`
- `tideterm/frontend/app/tab/workspaceswitcher.tsx`
- `tideterm/frontend/app/tab/workspaceswitcher.scss`
- `tideterm/frontend/app/workspace/workspace.tsx`
- `tideterm/frontend/app/workspace/widgets.tsx`
- `tideterm/frontend/app/app.tsx`
- `tideterm/frontend/app/app.scss`
- `tideterm/frontend/app/element/iconbutton.tsx`
- `tideterm/frontend/app/element/iconbutton.scss`
- `tideterm/frontend/app/element/popover.tsx`
- `tideterm/frontend/app/element/popover.scss`
- `tideterm/frontend/app/window/windowtitle.tsx`
- `tideterm/frontend/layout/lib/TileLayout.tsx`
- `tideterm/frontend/layout/lib/tilelayout.scss`

## Exact desktop validation flow

1. Started the real desktop app with:
   - `npm run tauri:dev`
2. Confirmed the live Tauri launch output:
   - `{"base_url":"http://127.0.0.1:50062","pid":69709}`
3. Queried the visible desktop window through `System Events`:
   - bounds: `560, 124, 1440, 960`
   - title: `RunaTerminal`
4. Captured the visible app window region directly:
   - `screencapture -x -R560,124,1440,960 /tmp/shell-chrome-validation-desktop.png`

## Exact headed browser flow

1. Reused the live compat runtime already started for this shell-chrome slice:
   - `RTERM_AUTH_TOKEN=shell-chrome-gap-token ./scripts/go.sh run ./cmd/rterm-core serve --listen 127.0.0.1:61284 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir <tmp>`
   - `VITE_RTERM_API_BASE=http://127.0.0.1:61284 VITE_RTERM_AUTH_TOKEN=shell-chrome-gap-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4316 --strictPort`
2. Opened a visible Playwright Chromium window against `http://127.0.0.1:4316/`.
3. Verified the shell header metrics and control order.
4. Opened the workspace switcher, launcher, and settings surfaces from the live shell.
5. Replayed the reported AI regression path:
   - open settings
   - uncheck `AI` in `Visible surfaces`
   - switch layout mode to `Focus`
   - close settings
   - click the top-shell `AI` control
6. Captured the visible browser state:
   - `/tmp/shell-chrome-validation-headed.png`
7. Ran the release gate sweep on the same code state:
   - `npm run validate`
   - result: passed with existing frontend hook warnings only

## What was visibly verified

- Shell top chrome density:
  - tab bar wrapper height remained `33px`
  - AI button measured `42x26`
  - workspace switcher button measured `41x26`
  - tab strip remained immediately after the switcher and kept the dominant header lane
- Header / tab hierarchy:
  - control order matched the Tide-derived compact header: AI, workspace switcher, tab strip, add-tab, right status area
  - compat mode rendered no extra top-bar remote buttons:
    - `.add-remote-tab` count: `0`
    - `.add-remote-profiles` count: `0`
- Launcher / switcher visual integration:
  - workspace switcher popover opened directly below the top-left switcher button:
    - switcher surface box: `x=120`, `y=36`, `width=256`, `height=76`
  - launcher remained on the slim right utility rail, not as competing top chrome:
    - launcher button box: `x=1392`, `y=702.9`, `width=48`, `height=57.5`
    - launcher surface box: `x=882`, `y=270`, `width=512`, `height=618`
- Panel integration into shell chrome:
  - settings flyout stayed bounded and aligned to the utility rail:
    - settings surface box: `x=977`, `y=215`, `width=416`, `height=672`
  - the AI panel remained a real shell column, not an overlay takeover:
    - AI panel box after reopen: `x=0`, `y=37`, `width=300`, `height=863`
- AI-open regression fix:
  - after hiding `AI` from settings, the panel was truly gone:
    - `aiVisibleAfterHide: false`
  - clicking the top-shell `AI` control in focus mode reopened it correctly:
    - `aiVisibleAfterFocusReopen: true`
- Desktop shell framing:
  - the real Tauri window showed the same compact top bar, left AI column, centered tab/content framing, and slim right utility rail as the headed browser
  - no extra title band, broad padding, clipping, or oversized action cluster appeared in the real desktop shell
- No-break regressions on the same code state:
  - `npm run validate` passed
  - prior headed parity sweeps on this code state continued to pass for terminal, panels, navigation, quick actions, structured execution, and window behavior

## Remaining mismatch

- none

## Validation note

The browser validation above was run headed and visible, not hidden/headless, and the desktop validation above was run against the real visible Tauri app window.
