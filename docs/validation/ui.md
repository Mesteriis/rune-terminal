# UI Validation

## Last verified state

- Date: `2026-05-02`
- State: `VERIFIED`
- Scope:
  - settings modal ergonomics pass for section navigation, AI provider setup, and visible Russian copy cleanup
  - settings modal chrome follow-up removes the visible shared dialog title, description, footer close action, sidebar heading, extra content wrapper frame, and settings-shell outer border while keeping the icon close action
  - settings sidebar now scrolls inside its own column
  - AI provider diagnostics now stay hidden until a saved run is selected, reducing first-load visual noise in the settings modal
  - embedded provider settings no longer repeat the active-section title already owned by `SettingsShellWidget`
  - visible Russian settings copy removes mixed system jargon such as `settings sections`, `runtime DB`, `backend snapshot`, `AI composer`, and raw MCP `server/template/headers` phrasing where it was shown to operators
  - focused frontend style/theme architecture cleanup for audited terminal, busy-overlay, and settings surfaces
  - xterm adaptive/contrast palettes now resolve through token-owned `--runa-terminal-ansi-*` and `--runa-terminal-contrast-*` CSS variables instead of component-local raw color literals
  - busy overlay particle colors resolve through token-owned `--runa-busy-particle-*` CSS variables, while marker/overlay chrome is centralized in `widget-busy-overlay-widget.styles.ts`
  - settings error text and remote inline label styles now use shared settings-shell style objects instead of per-section raw fallback colors
  - a focused source contract guards the audited files from reintroducing raw `hex` / `rgb` / `hsl` color literals above the token/style boundary

## Commands/tests used

- `npm --prefix frontend run test -- src/shared/ui/style-theme-contracts.test.ts src/widgets/panel/panel-dom-mount.test.tsx src/widgets/settings/runtime-settings-section.test.tsx src/shared/ui/components/terminal-status-header.test.tsx --run`
- `npm --prefix frontend run test -- src/shared/ui/components/dialog-popup.test.tsx src/widgets/settings/settings-shell-widget.test.tsx --run`
- `npm --prefix frontend run test -- src/shared/ui/components/dialog-popup.test.tsx src/widgets/settings/settings-shell-widget.test.tsx src/widgets/settings/agent-provider-settings-widget.test.tsx src/widgets/settings/runtime-settings-section.test.tsx src/widgets/settings/terminal-settings-section.test.tsx src/widgets/settings/plugins-settings-section.test.tsx src/widgets/settings/mcp-settings-section.test.tsx src/widgets/settings/remote-profiles-settings-section.test.tsx src/widgets/shell/right-action-rail-widget.test.tsx --run`
- `npm --prefix frontend run test -- src/widgets/settings/settings-shell-widget.test.tsx src/widgets/settings/agent-provider-settings-widget.test.tsx src/widgets/settings/runtime-settings-section.test.tsx src/widgets/settings/terminal-settings-section.test.tsx src/widgets/settings/plugins-settings-section.test.tsx src/widgets/settings/mcp-settings-section.test.tsx src/widgets/settings/remote-profiles-settings-section.test.tsx src/widgets/shell/right-action-rail-widget.test.tsx --run`
- `npm --prefix frontend run test -- src/shared/ui/style-theme-contracts.test.ts --run`
- `npm --prefix frontend run test -- src/widgets/panel/panel-dom-mount.test.tsx src/widgets/settings/runtime-settings-section.test.tsx src/shared/ui/components/terminal-status-header.test.tsx --run`
- `npm --prefix frontend run lint:active`
- `scripts/check-active-path-api-imports.sh`
- `git diff --check`
- In-app browser DOM smoke at `http://127.0.0.1:5173/`: settings modal opens, keeps only `Close Настройки` icon close, removes footer `Close`, visible modal `Настройки`, modal description, sidebar `Разделы`, and settings-shell outer border/background; sidebar style resolves to scrollable overflow; AI provider section still uses `Провайдеры AI`, run diagnostics stay hidden before selecting a saved run, and old visible strings `AI / Провайдеры`, `Prepare route`, `Source is reachable`, `Route prepared via`, and English ` first ` are absent.

## Known limitations

- The test run emits jsdom `HTMLCanvasElement.getContext()` warnings from canvas-backed UI dependencies; the focused suites still exit successfully.
- The Cloudflare web performance skill was invoked for this pass, but the Chrome DevTools MCP trace tools were not available in this Codex session, so no Core Web Vitals trace is claimed here.
- In-app browser screenshot capture timed out through CDP during this pass; DOM smoke checks completed successfully, but no screenshot artifact is claimed.
- This pass is intentionally scoped to the audited terminal, busy-overlay, and settings style surfaces. It does not claim every historical inline layout style in the active frontend has been moved into a style module.

## Evidence

- Vitest result: `4 passed`, `13 passed`.
- Settings chrome follow-up result: `2 passed`, `4 passed`; expanded settings/dialog result: `9 passed`, `48 passed`.
- Settings ergonomics result: `8 passed`, `45 passed`.
- In-app browser DOM smoke result: settings chrome, scroll, copy, and diagnostics checks passed.
- Final focused contract result: `1 passed`, `2 passed`.
- Final related UI result: `3 passed`, `11 passed`.
- TypeScript active lint exited `0`.
- Active UI layer import guard exited `0`.
- Whitespace check exited `0`.
