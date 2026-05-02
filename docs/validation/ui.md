# UI Validation

## Last verified state

- Date: `2026-05-02`
- State: `VERIFIED`
- Scope:
  - focused frontend style/theme architecture cleanup for audited terminal, busy-overlay, and settings surfaces
  - xterm adaptive/contrast palettes now resolve through token-owned `--runa-terminal-ansi-*` and `--runa-terminal-contrast-*` CSS variables instead of component-local raw color literals
  - busy overlay particle colors resolve through token-owned `--runa-busy-particle-*` CSS variables, while marker/overlay chrome is centralized in `widget-busy-overlay-widget.styles.ts`
  - settings error text and remote inline label styles now use shared settings-shell style objects instead of per-section raw fallback colors
  - a focused source contract guards the audited files from reintroducing raw `hex` / `rgb` / `hsl` color literals above the token/style boundary

## Commands/tests used

- `npm --prefix frontend run test -- src/shared/ui/style-theme-contracts.test.ts src/widgets/panel/panel-dom-mount.test.tsx src/widgets/settings/runtime-settings-section.test.tsx src/shared/ui/components/terminal-status-header.test.tsx --run`
- `npm --prefix frontend run test -- src/shared/ui/style-theme-contracts.test.ts --run`
- `npm --prefix frontend run test -- src/widgets/panel/panel-dom-mount.test.tsx src/widgets/settings/runtime-settings-section.test.tsx src/shared/ui/components/terminal-status-header.test.tsx --run`
- `npm --prefix frontend run lint:active`
- `scripts/check-active-path-api-imports.sh`
- `git diff --check`

## Known limitations

- The test run emits jsdom `HTMLCanvasElement.getContext()` warnings from canvas-backed UI dependencies; the focused suites still exit successfully.
- This pass is intentionally scoped to the audited terminal, busy-overlay, and settings style surfaces. It does not claim every historical inline layout style in the active frontend has been moved into a style module.

## Evidence

- Vitest result: `4 passed`, `13 passed`.
- Final focused contract result: `1 passed`, `2 passed`.
- Final related UI result: `3 passed`, `11 passed`.
- TypeScript active lint exited `0`.
- Active UI layer import guard exited `0`.
- Whitespace check exited `0`.
