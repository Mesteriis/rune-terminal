# Terminal Validation

## Last verified state

- Date: `2026-04-26`
- State: `VERIFIED`
- Scope:
  - the active `frontend/src` terminal surface now uses the backend terminal runtime as its source of truth for the seeded shell panels
  - seeded Dockview terminal panels now map to backend widget IDs instead of renderer-only demo metadata:
    - `terminal-header -> term-main`
    - `terminal -> term-side`
  - the frontend terminal read path now hydrates from `GET /api/v1/terminal/{widgetID}` and follows live output through `GET /api/v1/terminal/{widgetID}/stream`
  - the visible xterm input path now sends raw terminal input through `POST /api/v1/terminal/{widgetID}/input`
  - utility-menu `Create terminal widget` and terminal-header `+` actions now allocate a fresh backend terminal session first and then mount the new Dockview panel against the returned runtime `widget_id`, instead of reusing the frontend panel id as a fake terminal id
  - closing those extra terminal panels now also releases the backend-created workspace tab through its runtime `tab_id`, so panel close no longer leaks backend terminal sessions
  - a freshly created backend terminal session now returns `chunks: []` instead of `chunks: null` on `GET /api/v1/terminal/{widgetID}`, and the frontend terminal client/session path defensively normalizes `null` chunk payloads so the first live stream append cannot crash the UI
  - the AI sidebar `/run ...` path now targets the active terminal widget instead of sending `/run` as plain chat text:
    - target terminal selection comes from the live Dockview terminal-panel registry
    - command execution goes through `POST /api/v1/tools/execute` with `term.send_input`
    - assistant-side execution summaries are appended through `POST /api/v1/agent/terminal-commands/explain`
  - backend restart support is available in the terminal API client through `POST /api/v1/terminal/{widgetID}/restart`, but it is not wired to the UI because no visible restart control exists on the current terminal surface
  - the terminal header/tab chrome now reads backend-owned session metadata for:
    - `working_dir`
    - `shell`
    - `connection_kind`
    - `status`
    - disconnected / failed states
  - the terminal body now exposes a reference-like chrome layer on top of the same runtime contract:
    - `TerminalStatusHeader` is rendered inside the panel body and uses live `cwd`, `connection_kind`, `status`, and `shell`
    - the body header now renders that identity as an expanded stacked view (`cwd` primary, terminal title secondary), while the Dockview tab header stays compact; both surfaces therefore read from the same session metadata but at different density levels
    - `TerminalToolbar` is now wired to the mounted xterm surface for copy, paste, in-terminal search, and live renderer badge updates
    - the toolbar itself now uses denser grouped control sections (`copy/paste` and `search/clear/jump`) plus a right-aligned utility cluster; when search opens, that search flow takes priority and temporarily replaces the renderer badge instead of competing for the same horizontal space
    - Dockview-level terminal actions now use the same denser control language as the in-panel toolbar instead of the older elevated button treatment:
      - terminal group header `add/close` actions are wrapped in a compact grouped shell
      - terminal tab close uses the same reduced 24px icon-control density
      - single-tab Dockview right-actions spacing is reduced so the tab/header chrome reads as one compact system
      - the Dockview overflow trigger and overflow dropdown now follow the same compact terminal chrome instead of the generic Dockview defaults
    - the terminal header action slot now exposes a visible restart control backed by `POST /api/v1/terminal/{widgetID}/restart`
    - terminal restart rehydrates the widget-local session state and re-subscribes the SSE output stream instead of leaving the body bound to the pre-restart snapshot
    - Ctrl/Cmd+F inside the terminal still opens search through the xterm key handler, but the same search row is now also reachable through visible toolbar controls
    - the terminal search row supports keyboard navigation: `Enter`, `F3`, and `Ctrl/Cmd+G` find next; `Shift+Enter`, `Shift+F3`, and `Shift+Ctrl/Cmd+G` find previous; `Escape` closes search
    - the search row now subscribes to xterm search-result events and renders visible match status (`N/M`, `No matches`, or empty-query guidance) while clearing xterm search decorations when the query is emptied or the row closes
    - directional search controls stay disabled until a non-empty query exists, which keeps the visible search row honest about when navigation is actionable
  - the shell settings modal now exposes a backend-owned `Terminal` settings slice instead of a placeholder:
    - current terminal font size is visible in `Settings -> Terminal`
    - current terminal line height is visible in `Settings -> Terminal`
    - the operator can decrease, increase, and reset terminal font size inside the existing settings shell
    - the operator can decrease, increase, and reset terminal line height inside the same shell section
    - the operator can also restore all runtime-owned terminal defaults in one action, using the same `PUT /api/v1/settings/terminal` contract instead of a separate reset endpoint
    - font size and line height are loaded and persisted through the runtime contract (`GET/PUT /api/v1/settings/terminal`)
    - the mounted xterm surface still applies those values live in the frontend, but the source of truth is now the runtime DB rather than local UI storage
  - the renderer-only terminal demo path is removed from the seeded main path:
    - no hardcoded intro lines
    - no local prompt generator
    - no local `help` / `pwd` / `ls` / `clear` / `status` command interpreter
  - formatting, spacing, layout, typography, and control placement were intentionally preserved
  - browser-level Playwright coverage now confirms the live shell input path for the seeded workspace terminal:
    - focus enters the xterm textarea exposed as `Terminal input`
    - typed input is forwarded to `POST /api/v1/terminal/{widgetID}/input`
    - echoed output is observable again through backend terminal snapshots

## Backend contracts used

- `GET /api/v1/terminal/{widgetID}`
- `GET /api/v1/terminal/{widgetID}/stream`
- `POST /api/v1/terminal/{widgetID}/input`
- `POST /api/v1/terminal/{widgetID}/restart`
  - implemented in the frontend runtime client
  - wired to the visible terminal header restart control
- `GET /api/v1/settings/terminal`
- `PUT /api/v1/settings/terminal`
- `POST /api/v1/workspace/tabs`
  - used by the visible shell actions that create additional terminal panels
- `DELETE /api/v1/workspace/tabs/{tabID}`
  - used when closing extra terminal panels created from those shell actions
- `POST /api/v1/tools/execute`
  - used by the AI sidebar `/run ...` path with `term.send_input`
- `POST /api/v1/agent/terminal-commands/explain`
  - used immediately after `/run ...` to persist backend-owned execution transcript/explanation messages

## Frontend files integrated

- `frontend/src/features/terminal/api/client.ts`
- `frontend/src/features/terminal/api/client.test.ts`
- `frontend/src/features/terminal/model/types.ts`
- `frontend/src/features/terminal/model/use-terminal-session.ts`
- `frontend/src/features/terminal/model/use-terminal-preferences.ts`
- `frontend/src/features/terminal/model/use-terminal-preferences.test.tsx`
- `frontend/src/shared/api/terminal-settings.ts`
- `frontend/src/shared/api/terminal-settings.test.ts`
- `frontend/src/features/terminal/model/panel-registry.ts`
- `frontend/src/features/terminal/model/use-terminal-session.test.tsx`
- `frontend/src/widgets/terminal/terminal-panel.ts`
- `frontend/src/widgets/terminal/terminal-widget.tsx`
- `frontend/src/widgets/terminal/terminal-widget.styles.ts`
- `frontend/src/widgets/terminal/terminal-widget.test.tsx`
- `frontend/src/widgets/settings/terminal-settings-section.tsx`
- `frontend/src/widgets/settings/terminal-settings-section.test.tsx`
- `frontend/src/widgets/terminal/terminal-dockview-tab-widget.tsx`
- `frontend/src/widgets/terminal/terminal-dockview-tab-widget.test.tsx`
- `frontend/src/widgets/terminal/terminal-dockview-header-actions-widget.tsx`
- `frontend/src/widgets/terminal/terminal-dockview-header-actions-widget.test.tsx`
- `frontend/src/widgets/terminal/terminal-dockview-actions.styles.ts`
- `frontend/src/widgets/panel/dockview-panel-widget.tsx`
- `frontend/src/widgets/shell/right-action-rail-widget.tsx`
- `frontend/src/shared/ui/components/terminal-surface.tsx`
- `frontend/src/shared/ui/components/terminal-toolbar.tsx`
- `frontend/src/shared/ui/components/terminal-status-header.tsx`
- `frontend/src/app/dockview-workspace.bootstrap.ts`
- `core/db/migrations/0008_terminal_settings.sql`
- `core/db/migrations/0009_terminal_line_height.sql`
- `core/terminal/preferences.go`
- `core/terminal/preferences_test.go`
- `core/app/terminal_settings.go`
- `core/transport/httpapi/handlers_terminal_settings.go`
- `core/transport/httpapi/handlers_terminal_settings_test.go`

## Demo/static paths removed from the main path

- `frontend/src/widgets/terminal/terminal-panel.ts`
  - hardcoded `cwd`, `shellLabel`, `connectionKind`, `sessionState`, and `introLines` are no longer the main runtime source
- `frontend/src/shared/ui/components/terminal-surface.tsx`
  - renderer-only boot text and local fake command handling are removed from the seeded terminal execution path

## Commands/tests used

- `npm --prefix frontend run lint:active`
- `npm --prefix frontend run test -- --reporter verbose src/features/terminal/api/client.test.ts src/features/terminal/model/use-terminal-session.test.tsx`
- `npm --prefix frontend run test -- src/features/terminal/model/use-terminal-session.test.tsx src/widgets/terminal/terminal-widget.test.tsx`
- `npm --prefix frontend run test -- src/shared/ui/components/terminal-status-header.test.tsx src/widgets/terminal/terminal-widget.test.tsx`
- `npm --prefix frontend run test -- src/features/terminal/model/use-terminal-preferences.test.tsx src/widgets/settings/terminal-settings-section.test.tsx src/widgets/terminal/terminal-widget.test.tsx`
- `npm --prefix frontend run test -- src/features/terminal/model/use-terminal-preferences.test.tsx src/widgets/settings/terminal-settings-section.test.tsx`
- `npm --prefix frontend run test -- src/shared/ui/components/terminal-toolbar.test.tsx src/shared/ui/components/accessibility-contracts.test.tsx src/widgets/terminal/terminal-widget.test.tsx`
- `npm --prefix frontend run test -- src/shared/ui/components/terminal-toolbar.test.tsx src/widgets/terminal/terminal-widget.test.tsx src/shared/ui/components/accessibility-contracts.test.tsx`
- `npm --prefix frontend run test -- src/shared/ui/components/terminal-toolbar.test.tsx src/widgets/terminal/terminal-widget.test.tsx`
- `frontend/node_modules/.bin/vitest run src/shared/ui/components/terminal-toolbar.test.tsx --reporter=verbose`
- `frontend/node_modules/.bin/vitest run src/widgets/terminal/terminal-widget.test.tsx --reporter=verbose`
- `npm run lint:frontend`
- `npm --prefix frontend run test -- src/shared/api/terminal-settings.test.ts src/features/terminal/model/use-terminal-preferences.test.tsx src/widgets/settings/terminal-settings-section.test.tsx src/widgets/terminal/terminal-widget.test.tsx`
- `npm --prefix frontend run test -- src/widgets/terminal/terminal-dockview-tab-widget.test.tsx src/widgets/terminal/terminal-dockview-header-actions-widget.test.tsx`
- `npm --prefix frontend run test -- src/features/agent/api/client.test.ts src/widgets/ai/ai-panel-widget.test.tsx`
- `./scripts/go.sh test ./core/terminal ./core/transport/httpapi ./core/app`
- `npm --prefix frontend run build`
- `npm run test:ui -- --reporter=line`
- `npm run test:ui -- --reporter=line e2e/ai.spec.ts`
- `npm run test:ui -- --reporter=line e2e/shell-workspace.spec.ts`
- `npm run test:ui -- --reporter=line e2e/terminal.spec.ts`
- `npm run test:ui -- --reporter=line --grep "reset all runtime-owned defaults" e2e/terminal.spec.ts`
- `npm run tauri:dev`

## Browser evidence added for this slice

- the terminal Playwright suite now also validates the real Dockview overflow path:
  - additional terminal tabs are created through the visible group `+` action
  - the compact overflow trigger becomes visible under a narrower viewport
  - opening the overflow trigger shows the Dockview overflow container with the hidden tabs list

## Known limitations

- Visible restart and interrupt controls now exist in the terminal header chrome, and terminal font size, line height, theme mode, scrollback, plus cursor behavior are now configurable through a backend-owned runtime settings contract.
- Terminal toolbar `clear` and `jump-to-latest` actions are intentionally local xterm viewport controls. They do not mutate backend snapshot history and were validated as non-breaking live affordances rather than as persisted runtime state.
- Browser validation for terminal input now runs through Playwright on the split local dev path. The suite is intentionally serialized (`workers: 1`) because terminal/runtime state is shared across the same backend instance.
- A fresh `npm run tauri:dev` desktop smoke was run for this slice and the spawned `rterm-desktop` / core listener processes were cleaned up after verification.
- Browser validation now also covers runtime-owned terminal theme mode, scrollback, plus cursor behavior persistence through the `Settings -> Terminal` shell path and confirms that `theme_mode`, `scrollback`, `cursor_style`, and `cursor_blink` survive reload through the backend contract.
- Browser validation now also covers the one-shot reset path for the runtime-owned terminal settings shell and confirms that font size, line height, theme mode, scrollback, and cursor behavior all return to the backend defaults through the shared settings contract.

## Evidence

- `core/transport/httpapi/handlers_terminal.go`
- `core/transport/httpapi/handlers_terminal_settings.go`
- `core/terminal/service.go`
- `core/terminal/preferences.go`
- `core/terminal/types.go`
- `core/app/terminal_restore_state.go`
- `core/app/terminal_settings.go`
- `frontend/src/features/terminal/api/client.ts`
- `frontend/src/shared/api/terminal-settings.ts`
- `frontend/src/features/terminal/model/use-terminal-session.ts`
- `frontend/src/features/terminal/model/use-terminal-preferences.ts`
- `frontend/src/shared/ui/components/terminal-toolbar.tsx`
- `frontend/src/widgets/terminal/terminal-widget.tsx`
- `frontend/src/shared/ui/components/terminal-surface.tsx`
- `e2e/terminal.spec.ts`
