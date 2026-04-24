# Terminal Validation

## Last verified state

- Date: `2026-04-24`
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
    - `TerminalToolbar` is now wired to the mounted xterm surface for copy, paste, in-terminal search, and live renderer badge updates
    - the terminal header action slot now exposes a visible restart control backed by `POST /api/v1/terminal/{widgetID}/restart`
    - terminal restart rehydrates the widget-local session state and re-subscribes the SSE output stream instead of leaving the body bound to the pre-restart snapshot
    - Ctrl/Cmd+F inside the terminal still opens search through the xterm key handler, but the same search row is now also reachable through visible toolbar controls
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
  - not wired to a visible control because the current terminal UI does not expose one
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
- `frontend/src/features/terminal/model/panel-registry.ts`
- `frontend/src/features/terminal/model/use-terminal-session.test.tsx`
- `frontend/src/widgets/terminal/terminal-panel.ts`
- `frontend/src/widgets/terminal/terminal-widget.tsx`
- `frontend/src/widgets/terminal/terminal-widget.styles.ts`
- `frontend/src/widgets/terminal/terminal-widget.test.tsx`
- `frontend/src/widgets/terminal/terminal-dockview-tab-widget.tsx`
- `frontend/src/widgets/terminal/terminal-dockview-header-actions-widget.tsx`
- `frontend/src/widgets/panel/dockview-panel-widget.tsx`
- `frontend/src/widgets/shell/right-action-rail-widget.tsx`
- `frontend/src/shared/ui/components/terminal-surface.tsx`
- `frontend/src/shared/ui/components/terminal-status-header.tsx`
- `frontend/src/app/dockview-workspace.bootstrap.ts`

## Demo/static paths removed from the main path

- `frontend/src/widgets/terminal/terminal-panel.ts`
  - hardcoded `cwd`, `shellLabel`, `connectionKind`, `sessionState`, and `introLines` are no longer the main runtime source
- `frontend/src/shared/ui/components/terminal-surface.tsx`
  - renderer-only boot text and local fake command handling are removed from the seeded terminal execution path

## Commands/tests used

- `npm --prefix frontend run lint:active`
- `npm --prefix frontend run test -- --reporter verbose src/features/terminal/api/client.test.ts src/features/terminal/model/use-terminal-session.test.tsx`
- `npm --prefix frontend run test -- src/features/terminal/model/use-terminal-session.test.tsx src/widgets/terminal/terminal-widget.test.tsx`
- `npm --prefix frontend run test -- src/features/agent/api/client.test.ts src/widgets/ai/ai-panel-widget.test.tsx`
- `./scripts/go.sh test ./core/terminal ./core/transport/httpapi ./core/app`
- `npm --prefix frontend run build`
- `npm run test:ui -- --reporter=line`
- `npm run test:ui -- --reporter=line e2e/ai.spec.ts`
- `npm run test:ui -- --reporter=line e2e/shell-workspace.spec.ts`
- `npm run test:ui -- --reporter=line e2e/terminal.spec.ts`
- `npm run tauri:dev`

## Known limitations

- Visible restart and interrupt controls now exist in the terminal header chrome, but terminal preferences remain runtime-local defaults; no backend-owned terminal settings contract exists yet for persisted font/theme/scrollback toggles.
- Browser validation for terminal input now runs through Playwright on the split local dev path. The suite is intentionally serialized (`workers: 1`) because terminal/runtime state is shared across the same backend instance.
- A fresh `npm run tauri:dev` desktop smoke was run for this slice and the spawned `rterm-desktop` / core listener processes were cleaned up after verification.

## Evidence

- `core/transport/httpapi/handlers_terminal.go`
- `core/terminal/service.go`
- `core/terminal/types.go`
- `core/app/terminal_restore_state.go`
- `frontend/src/features/terminal/api/client.ts`
- `frontend/src/features/terminal/model/use-terminal-session.ts`
- `frontend/src/widgets/terminal/terminal-widget.tsx`
- `frontend/src/shared/ui/components/terminal-surface.tsx`
- `e2e/terminal.spec.ts`
