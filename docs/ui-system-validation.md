# UI System Alignment Validation

Date: `2026-04-17`
Validation mode: `real desktop runtime`

This validation used the repo-root Tide sources as the primary reference for UI-system alignment and checked the active compat shell in the real desktop app against a live TideTerm desktop window.

## Tide source files checked against visible behavior

- `tideterm/index.html`
- `tideterm/frontend/wave.ts`
- `tideterm/frontend/util/fontutil.ts`
- `tideterm/frontend/app/app.tsx`
- `tideterm/frontend/app/app.scss`
- `tideterm/frontend/app/theme.scss`
- `tideterm/frontend/tailwindsetup.css`
- `tideterm/frontend/app/element/modal.tsx`
- `tideterm/frontend/app/element/modal.scss`
- `tideterm/frontend/app/element/popover.tsx`
- `tideterm/frontend/app/element/popover.scss`
- `tideterm/frontend/app/view/waveconfig/waveconfig.tsx`
- `tideterm/public/fonts/*`
- `tideterm/public/fontawesome/css/*`
- `tideterm/public/fontawesome/webfonts/*`
- `tideterm/public/logos/*`

## Exact desktop validation flow

1. Started the real desktop app with:
   - `npm run tauri:dev`
2. Confirmed the live Tauri launch output:
   - `{"base_url":"http://127.0.0.1:61174","pid":25354}`
3. Identified the visible Runa desktop window through `System Events`:
   - title: `RunaTerminal`
   - bounds: `283, 137, 1688, 900`
4. Brought the bundled Tide reference app to the foreground:
   - `open -a TideTerm`
5. Captured the live TideTerm desktop state:
   - `/tmp/tideterm-desktop.png`
6. Returned to the live Runa desktop window and opened the settings surface from the right utility rail with real desktop input events.
7. Captured the aligned Runa desktop state with the settings overlay visible:
   - `/tmp/rterm-rail-attempt-1.png`
8. Captured an additional baseline Runa desktop state before the overlay proof:
   - `/tmp/ui-system-side-by-side.png`
9. Ran the release sweep on the same final code state:
   - `npm run validate`
   - result: passed with the existing frontend hook warnings only

## What was visibly verified

- Static asset entry path:
  - the real desktop shell rendered with the Tide logo/favicon family and the Tide-style Font Awesome icon set served from the new `frontend/public/` static layer
  - the old app-scoped Font Awesome wrapper and duplicate asset copies were no longer part of the live path
- Font alignment:
  - the Runa desktop shell used the same `Inter` body/header feel and `Hack` terminal text feel as the live TideTerm comparison window
  - no mixed fallback font styling or mismatched icon font rendering was visible after startup
- Overlay model:
  - the settings surface is now a true modal overlay above all shell content
  - the overlay is centered in the window, not anchored to the split layout tree
  - a semi-transparent backdrop dims the shell underneath while leaving the shell state intact
  - split terminals, the AI panel, and the right utility rail remain underneath the modal instead of clipping or constraining it
- Style-system alignment:
  - utility surface borders, modal background, shadow, and close-button hover now match the Tide modal reference more closely
  - settings navigation, cards, and action buttons no longer use the previous accent-heavy drift styles
- No layout regression:
  - the active shell continued to fill correctly under the overlay
  - terminal panes, AI panel, and right utility rail remained stable before and after opening the settings surface

## Comparison note

- A literal simultaneous split-screen capture of TideTerm and RunaTerminal was not stable under macOS accessibility on this machine because TideTerm would not remain scriptable when backgrounded.
- The desktop comparison was therefore completed as sequential live captures on the same desktop session:
  - TideTerm visible reference capture
  - RunaTerminal visible capture
  - RunaTerminal settings-overlay capture

## Remaining mismatch

- none

## Validation note

This batch was validated against the real visible desktop app window, not only against browser rendering.
