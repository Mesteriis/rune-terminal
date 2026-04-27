# Terminal Validation

## Last verified state

- Date: `2026-04-27`
- State: `VERIFIED`
- Scope:
  - the active `frontend/src` terminal surface now uses the backend terminal runtime as its source of truth for the seeded shell panels
  - seeded Dockview terminal panels now map to backend widget IDs instead of renderer-only demo metadata:
    - `terminal-header -> term-main`
    - `terminal -> term-side`
  - the frontend terminal read path now hydrates from `GET /api/v1/terminal/{widgetID}` and follows live output through `GET /api/v1/terminal/{widgetID}/stream`
  - the frontend terminal API client now validates runtime snapshot,
    diagnostics, latest-command, session-catalog, interrupt/restart, and
    stream-chunk payloads before handing them to the widget layer, so malformed
    backend JSON fails fast as an explicit client error instead of becoming
    a later `undefined` access inside the UI
  - the visible xterm input path now sends raw terminal input through `POST /api/v1/terminal/{widgetID}/input`
  - utility-menu `Create terminal widget` and terminal-header `+` actions now allocate a fresh backend terminal session first and then mount the new Dockview panel against the returned runtime `widget_id`, instead of reusing the frontend panel id as a fake terminal id
  - closing those extra terminal panels now also releases the backend-created workspace tab through its runtime `tab_id`, so panel close no longer leaks backend terminal sessions
  - a freshly created backend terminal session now returns `chunks: []` instead of `chunks: null` on `GET /api/v1/terminal/{widgetID}`, and the frontend terminal client/session path defensively normalizes `null` chunk payloads so the first live stream append cannot crash the UI
  - the AI sidebar `/run ...` path now targets the active terminal widget instead of sending `/run` as plain chat text:
    - target terminal selection comes from the live Dockview terminal-panel registry
    - if no visible terminal widget is available, the shell now creates or re-reveals a workspace terminal panel in the active workspace first, so the operator can watch the AI-issued command land in a real terminal surface
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
    - the terminal body chrome itself is now tighter: header and toolbar rows use reduced vertical padding, restart/interrupt controls are denser, and the status/meta pills read as lighter shell metadata instead of heavier standalone badges
    - Dockview-level terminal actions now use the same denser control language as the in-panel toolbar instead of the older elevated button treatment:
      - terminal group header `add/close` actions are wrapped in a compact grouped shell
      - terminal tab close uses the same reduced 24px icon-control density
      - single-tab Dockview right-actions spacing is reduced so the tab/header chrome reads as one compact system
      - the Dockview overflow trigger and overflow dropdown now follow the same compact terminal chrome instead of the generic Dockview defaults
    - the terminal header action slot now exposes a visible restart control backed by `POST /api/v1/terminal/{widgetID}/restart`
    - the same header action slot now also exposes a visible `Explain & fix` AI handoff control:
      it opens the AI sidebar,
      binds the request context to that terminal widget,
      fetches backend-owned terminal diagnostics for that widget,
      preloads a terminal-aware prompt with the normalized issue/output summary,
      and auto-submits it so the operator can immediately review the plan/approval flow
    - the terminal surface now also exposes a backend-owned latest-command strip:
      raw terminal input is tracked into the active backend session as a latest submitted command,
      `GET /api/v1/terminal/{widgetID}/commands/latest` resolves that command back into output/explain metadata,
      the widget shows the latest command plus observed output/explain summary,
      and the operator can explicitly `Explain command` or `Re-run` that exact command from the terminal itself
    - the same header action slot now also exposes explicit recovery actions for broken terminal state:
      local failed/disconnected shells surface `Restart shell`,
      SSH failed/disconnected shells surface `Reconnect shell`,
      tmux-backed SSH failed/disconnected shells surface `Resume session`,
      and live stream disconnects surface `Reconnect stream` while the widget reattaches against backend snapshot truth
    - terminal restart rehydrates the widget-local session state and re-subscribes the SSE output stream instead of leaving the body bound to the pre-restart snapshot
    - Ctrl/Cmd+F inside the terminal still opens search through the xterm key handler, but the same search row is now also reachable through visible toolbar controls
    - the terminal search row supports keyboard navigation: `Enter`, `F3`, and `Ctrl/Cmd+G` find next; `Shift+Enter`, `Shift+F3`, and `Shift+Ctrl/Cmd+G` find previous; `Escape` closes search
    - the search row now subscribes to xterm search-result events and renders visible match status (`N/M`, `No matches`, or empty-query guidance) while clearing xterm search decorations when the query is emptied or the row closes
    - directional search controls stay disabled until a non-empty query exists, which keeps the visible search row honest about when navigation is actionable
    - one runtime-backed terminal widget can now host multiple backend-owned sessions:
      `GET /api/v1/terminal/{widgetID}` returns `active_session_id` plus grouped `sessions[]`,
      `POST /api/v1/terminal/{widgetID}/sessions` creates a sibling session and makes it active,
      `PUT /api/v1/terminal/{widgetID}/sessions/active` switches the active session explicitly,
      `DELETE /api/v1/terminal/{widgetID}/sessions/{sessionID}` closes an individual grouped session while preserving the widget,
      and the widget now renders both a compact session rail and a richer filterable session browser once more than one session exists
    - grouped-session switching rehydrates the widget snapshot and reconnects the SSE stream against the newly active backend session instead of leaving the UI attached to stale output
    - grouped-session browser actions can now focus or close individual sibling sessions without collapsing the whole terminal widget/panel
    - the shell utility panel now also exposes a backend-owned terminal session navigator over `GET /api/v1/terminal/sessions`:
      it lists visible terminal sessions across the active shell state,
      can filter by workspace/host/cwd/status,
      can focus a chosen grouped session back into its widget,
      and can surface the same recovery affordance labels (`Restart shell`, `Reconnect shell`, `Resume session`) from the shell-wide entry point instead of only inside the terminal widget
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
    - the same live shell path now also verifies the terminal search row affordance:
      toolbar search can open and close on the active runtime-backed widget,
      next/previous controls stay disabled without a query, and those controls
      become enabled when a query is typed into the live search field
    - the same terminal Playwright suite now also verifies grouped-session behavior:
      `New session` creates a sibling backend session under the same widget id,
      the compact session rail appears once more than one session exists,
      and focusing a rail entry switches `active_session_id` back on the backend contract
    - the terminal `Explain & fix` control can hand off a real shell failure into the AI sidebar, auto-apply that terminal as the conversation context, and land the operator directly in the local `Plan / Approve` flow
    - that same handoff now reads `issue_summary`, `status_detail`, and `output_excerpt` from the backend diagnostics route instead of assembling the prompt from raw frontend chunk state
    - when no terminal panel is open, the AI `/run ...` path creates a fresh visible workspace terminal and routes the command there instead of failing with a hidden/no-target execution

## Backend contracts used

- `GET /api/v1/terminal/{widgetID}`
- `POST /api/v1/terminal/{widgetID}/sessions`
  - creates another runtime-backed session inside the same terminal widget group
- `PUT /api/v1/terminal/{widgetID}/sessions/active`
  - explicitly switches the active runtime session inside the same widget group
- `DELETE /api/v1/terminal/{widgetID}/sessions/{sessionID}`
  - explicitly closes one grouped runtime session while keeping the terminal widget alive as long as another grouped session remains
- `GET /api/v1/terminal/sessions`
  - returns the shell-wide terminal session catalog, including grouped sessions, workspace/tab metadata, and active/focus flags
- `GET /api/v1/terminal/{widgetID}/diagnostics`
  - used by the visible `Explain & fix` action to fetch backend-owned issue/output summaries for AI handoff
- `GET /api/v1/terminal/{widgetID}/commands/latest`
  - resolves the active session's latest submitted command plus output/explain metadata for explicit `Explain command` / `Re-run` affordances
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
- `frontend/src/widgets/terminal/terminal-session-navigator-widget.tsx`
- `frontend/src/widgets/settings/terminal-settings-section.tsx`
- `frontend/src/widgets/settings/terminal-settings-section.test.tsx`
- `frontend/src/widgets/terminal/terminal-dockview-tab-widget.tsx`
- `frontend/src/widgets/terminal/terminal-dockview-tab-widget.test.tsx`
- `frontend/src/widgets/terminal/terminal-dockview-header-actions-widget.tsx`
- `frontend/src/widgets/terminal/terminal-dockview-header-actions-widget.test.tsx`
- `frontend/src/widgets/terminal/terminal-dockview-actions.styles.ts`
- `frontend/src/widgets/panel/dockview-panel-widget.tsx`
- `frontend/src/widgets/shell/right-action-rail-widget.tsx`
- `frontend/src/widgets/shell/right-action-rail-widget.test.tsx`
- `frontend/src/shared/ui/components/terminal-surface.tsx`
- `frontend/src/shared/ui/components/terminal-toolbar.tsx`
- `frontend/src/shared/ui/components/terminal-status-header.tsx`
- `frontend/src/app/dockview-workspace.bootstrap.ts`
- `core/db/migrations/0008_terminal_settings.sql`
- `core/db/migrations/0009_terminal_line_height.sql`
- `core/terminal/preferences.go`
- `core/terminal/preferences_test.go`
- `core/app/terminal_session_catalog.go`
- `core/app/terminal_latest_command.go`
- `core/app/terminal_session_actions.go`
- `core/app/terminal_settings.go`
- `core/transport/httpapi/handlers_terminal_settings.go`
- `core/transport/httpapi/handlers_terminal_test.go`
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
- `frontend/node_modules/.bin/vitest run src/widgets/terminal/terminal-widget.test.tsx src/app/app-ai-sidebar.test.tsx --reporter=verbose`
- `npm --prefix frontend run test -- src/features/terminal/api/client.test.ts src/widgets/terminal/terminal-widget.test.tsx src/app/app-ai-sidebar.test.tsx --reporter=verbose`
- `npm --prefix frontend run test -- src/features/terminal/api/client.test.ts src/features/workspace/model/widget-catalog.test.ts src/widgets/preview/preview-panel-widget.test.tsx src/widgets/files/files-panel-widget.test.tsx --reporter=verbose`
- `npm --prefix frontend run test -- src/features/terminal/api/client.test.ts src/features/terminal/model/use-terminal-session.test.tsx src/widgets/terminal/terminal-widget.test.tsx --reporter=verbose`
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
- `npm run test:ui -- --reporter=line e2e/shell-workspace.spec.ts e2e/terminal.spec.ts`
- `npm run test:ui -- --reporter=line --grep "reset all runtime-owned defaults" e2e/terminal.spec.ts`
- `npm run test:ui -- --reporter=line e2e/ai.spec.ts --grep "creates a visible terminal in the active workspace when none is open"`
- `npm run test:ui -- --reporter=line e2e/ai.spec.ts --grep "terminal explain and fix button opens the AI sidebar with terminal context"`
- `./scripts/go.sh test ./core/app ./core/transport/httpapi -run 'TestTerminalDiagnostics|TestTerminalSnapshot|TestBootstrapSessionsKeepsRemoteWidgetAsDisconnectedWhenConnectionMissing' -count=1`
- `./scripts/go.sh test ./core/terminal ./core/app ./core/transport/httpapi -run 'TestTerminalServiceCreatesAndSwitchesGroupedSessionsPerWidget|TestCreateAndFocusTerminalSiblingSessionKeepsOneWidgetIdentity|TestTerminalSessionEndpointsCreateAndFocusGroupedSessions|TestRestartTerminalSessionReplacesExistingProcess' -count=1`
- `./scripts/go.sh test ./core/terminal -run 'TestSnapshotAndSubscribeCoversBufferedAndLiveOutput|TestSubscriberStaysOpenAfterProcessExit|TestStartSessionCoalescesConcurrentLaunches' -count=1`
- `npm --prefix frontend run test -- src/features/terminal/api/client.test.ts src/features/terminal/model/use-terminal-session.test.tsx src/widgets/terminal/terminal-widget.test.tsx --reporter=verbose`
- `npm --prefix frontend run test -- src/features/terminal/model/use-terminal-session.test.tsx src/widgets/terminal/terminal-widget.test.tsx src/shared/ui/components/terminal-status-header.test.tsx --reporter=verbose`
- `npm run test:ui -- --reporter=line e2e/terminal.spec.ts --grep "grouped backend sessions through the session rail"`
- `npm run test:ui -- --reporter=line e2e/terminal.spec.ts --grep "terminal widget browser filters and closes grouped backend sessions"`
- `npm run test:ui -- --reporter=line e2e/terminal.spec.ts --grep "shell-wide terminal session navigator focuses grouped sessions from the utility panel"`
- `npm run tauri:dev`

## Browser evidence added for this slice

- the terminal Playwright suite now also validates the real Dockview overflow path:
  - additional terminal tabs are created through the visible group `+` action
  - the compact overflow trigger becomes visible under a narrower viewport
  - opening the overflow trigger shows the Dockview overflow container with the hidden tabs list
- the terminal Playwright suite now also validates grouped-session runtime behavior:
  - `New session` creates a sibling backend session under the same widget id
  - the compact session rail becomes visible once more than one session exists
  - selecting a rail entry switches `active_session_id` back on the backend snapshot contract
  - opening `Browse sessions` exposes the richer grouped-session browser
  - filtering that browser leaves the matching grouped sessions visible
  - closing an inactive grouped session removes it from backend session state without destroying the widget
- the same terminal Playwright suite now also validates the shell-wide utility-panel navigator:
  - after creating a grouped sibling session, the operator can open `Terminal sessions`
  - filtering by session id narrows the shell-wide catalog
  - `Open` from that catalog switches the backend `active_session_id` back to the selected grouped session

## Known limitations

- Visible restart and interrupt controls now exist in the terminal header chrome, and terminal font size, line height, theme mode, scrollback, plus cursor behavior are now configurable through a backend-owned runtime settings contract.
- Recovery-specific terminal states are validated on the model/widget path in this slice, including stream auto-reattach and honest recovery labels, but this entry does not yet claim a dedicated browser scenario for visibly failed/disconnected recovery states.
- `Explain & fix` now depends on the backend diagnostics route. Direct ad hoc `frontend/node_modules/.bin/vitest ...` invocation from this repo root can resolve the parent `vitest.config.ts` outside the workspace and fail with an `EPERM` temp-dir write; the supported validation path for this slice was `npm --prefix frontend run test ...`.
- Terminal toolbar `clear` and `jump-to-latest` actions are intentionally local xterm viewport controls. They do not mutate backend snapshot history and were validated as non-breaking live affordances rather than as persisted runtime state.
- Browser validation for terminal input now runs through Playwright on the split local dev path. The suite is intentionally serialized (`workers: 1`) because terminal/runtime state is shared across the same backend instance.
- Browser validation for the terminal search row currently asserts the live shell affordance contract (`open`, `query`, enable/disable state, `close`) on the runtime-backed widget; lower-level hotkey/result-count semantics stay covered by widget/unit tests because browser-level delivery of function-key aliases is platform-sensitive.
- The command-aware latest-command strip is validated on the backend/client/widget path in this slice, but this entry does not claim a fresh browser e2e for that strip yet; the isolated Playwright attempt did not surface the strip deterministically on shell bootstrap, so only the deterministic Go/Vitest evidence is claimed here.
- Grouped sessions now have both a widget-local browser and a shell-wide utility-panel navigator, but there is still no dedicated persistent session sidebar or tmux-specific session manager on top of this runtime foundation yet.
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
- `core/app/terminal_session_catalog.go`
- `core/app/terminal_latest_command.go`
- `core/app/terminal_settings.go`
- `frontend/src/features/terminal/api/client.ts`
- `frontend/src/shared/api/terminal-settings.ts`
- `frontend/src/features/terminal/model/use-terminal-session.ts`
- `frontend/src/features/terminal/model/use-terminal-preferences.ts`
- `frontend/src/shared/ui/components/terminal-toolbar.tsx`
- `frontend/src/widgets/terminal/terminal-widget.tsx`
- `frontend/src/widgets/terminal/terminal-session-navigator-widget.tsx`
- `frontend/src/shared/ui/components/terminal-surface.tsx`
- `frontend/src/widgets/shell/right-action-rail-widget.tsx`
- `e2e/terminal.spec.ts`
