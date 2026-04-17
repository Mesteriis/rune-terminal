# Full UI Parity Validation

Date: `2026-04-17`
Validation mode: `real desktop runtime + headed / visible browser`

This validation used the repo-root Tide sources as the primary reference for the remaining UI parity domain and checked the active compat shell in both the real Tauri desktop app and a visible browser session.

## Tide source files checked against visible behavior

- `tideterm/frontend/app/block/block.tsx`
- `tideterm/frontend/app/block/blockframe.tsx`
- `tideterm/frontend/app/block/block.scss`
- `tideterm/frontend/app/view/term/term-model.ts`
- `tideterm/frontend/app/view/term/term.tsx`
- `tideterm/frontend/app/view/term/term.scss`
- `tideterm/frontend/app/element/popover.tsx`
- `tideterm/frontend/app/element/popover.scss`
- `tideterm/frontend/app/view/waveconfig/waveconfig.tsx`
- `tideterm/frontend/app/view/waveconfig/settingscontent.tsx`
- `tideterm/frontend/app/view/waveconfig/secretscontent.tsx`
- `tideterm/frontend/app/view/helpview/helpview.tsx`
- `tideterm/frontend/app/tab/tabbar.tsx`
- `tideterm/frontend/app/tab/tabbar.scss`
- `tideterm/frontend/app/workspace/workspace.tsx`
- `tideterm/frontend/app/workspace/widgets.tsx`

## Exact desktop validation flow

1. Started the real desktop app with:
   - `npm run tauri:dev`
2. Confirmed the live Tauri launch output:
   - `{"base_url":"http://127.0.0.1:57010","pid":2268}`
3. Brought the visible Tauri process to the front:
   - `osascript -e 'tell application "System Events" to tell process "rterm-desktop" to set frontmost to true'`
4. Queried the visible desktop window through `System Events`:
   - title: `RunaTerminal`
   - bounds: `560, 124, 1440, 960`
5. Captured the visible desktop window region directly:
   - `screencapture -x -R560,124,1440,960 /tmp/rterm-ui-parity-desktop.png`
6. Inspected that capture against the Tide block/header/popover references.

## Exact headed browser flow

1. Ran the focused headed parity sweep:
   - `npx playwright test e2e/terminal-parity.spec.ts e2e/panels-parity.spec.ts e2e/shell-chrome-parity.spec.ts -c e2e/playwright.config.ts --headed`
   - result: `9 passed`
2. Ran the broader headed regression sweep for adjacent shell workflows:
   - `npx playwright test e2e/panels-parity.spec.ts e2e/shell-chrome-parity.spec.ts e2e/terminal-parity.spec.ts e2e/navigation-parity.spec.ts e2e/quick-actions.spec.ts e2e/structured-execution-block.spec.ts e2e/window-behavior.spec.ts -c e2e/playwright.config.ts --headed`
   - result: `13 passed`, `1 failed`, `1 skipped`
3. Failure details from the broader sweep:
   - failing test: `e2e/navigation-parity.spec.ts`
   - assertion: compat layout fill tolerance after the intentional shell-frame padding change
   - measured values: `layoutHeight=1041`, `wrapperHeight=1047`
   - previous assertion expected `layoutHeight >= wrapperHeight - 4`
4. Rechecked the failing assertion against the new UI state:
   - the mismatch is a `2px` automation tolerance miss, not a visible clipping or fill failure
   - the visible shell still filled correctly in both the headed browser and the desktop screenshot

## What was visibly verified

- Terminal header appearance and behavior:
  - compat terminal panes now render a compact header strip instead of floating body overlays
  - terminal headers visibly show the drag grip, terminal icon, pane title, local/remote badge, lifecycle badge, shell/AI status badge, and compact `Split`, `Restart`, `Explain` actions
  - terminal output remains unobscured by large overlay buttons
- Drag affordance presence:
  - terminal and files panes now expose a visible grip icon in the pane header
  - split actions moved into header chrome instead of floating over the working surface
- Settings / utility / popover behavior:
  - settings remained bounded and switched across `Overview`, `Trusted tools`, `Secret shield`, and `Help`
  - launcher, settings, and other utility surfaces stayed compact and anchored to the shell edges instead of clipping or stacking behind each other
- Spacing / density / hierarchy:
  - compat panes now read as Tide-like blocks inside the shell, with compact outer framing, tighter inter-pane gaps, and consistent header-to-content rhythm
  - the files pane content uses the same `5px` frame-to-content step as the terminal host instead of a looser dashboard-like padding
  - the active shell keeps compact chrome hierarchy: shell top bar, bounded AI panel, compact pane headers, slim right utility rail
- Shell framing around active surfaces:
  - the real desktop window showed the same compact top chrome, left AI panel, split terminal panes, and right utility rail as the headed browser
  - no broad empty bands, clipped overlays, or non-filling pane regions were visible in the captured desktop state
- No regression observed in adjacent flows during the headed run:
  - terminal parity behaviors
  - panel flows
  - quick actions
  - structured execution blocks
  - window split / drag / restore behavior

## Remaining mismatch

- One automated navigation assertion still reflects the old compat-layout fill tolerance:
  - after the intentional compact shell-frame padding change, the headed navigation test measured a valid `6px` wrapper-to-layout difference where the older assertion only allowed `4px`
  - no visible fill/clipping defect was observed; this is a coverage update item for the next slice, not a confirmed runtime UI mismatch

## Validation note

The browser validation above was run headed and visible, not hidden/headless, and the desktop validation above was run against the real visible Tauri app window.
