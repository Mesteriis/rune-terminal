# Terminal Validation

## Last verified state

- Date: `2026-04-21`
- State: `AUDITED`
- Scope:
  - backend terminal HTTP transport is already present at:
    - `GET /api/v1/terminal/{widgetID}`
    - `POST /api/v1/terminal/{widgetID}/input`
    - `POST /api/v1/terminal/{widgetID}/restart`
    - `GET /api/v1/terminal/{widgetID}/stream`
  - backend snapshot truth is `terminal.Snapshot { state, chunks, next_seq }`
  - backend input truth is `terminal.InputResult { widget_id, bytes_sent, append_newline }`
  - backend restart truth is `{"state": terminal.State}`
  - backend stream truth is `text/event-stream` with `event: output` blocks carrying `terminal.OutputChunk`
  - backend terminal state already includes:
    - `widget_id`
    - `session_id`
    - `shell`
    - `status`
    - `pid`
    - `started_at`
    - `last_output_at`
    - `exit_code`
    - `can_send_input`
    - `can_interrupt`
    - `working_dir`
    - `connection_id`
    - `connection_name`
    - `connection_kind`
    - `status_detail`
  - `core/app/terminal_restore_state.go` confirms snapshot fallback for known workspace widgets without a live session:
    - disconnected terminals are still returned through the same snapshot route
    - disconnected fallback disables input/interrupt and preserves connection identity
  - the active frontend terminal surface is still renderer-only and demo-backed

## Frontend mapping

- Active terminal entry points:
  - `frontend/src/app/dockview-workspace.bootstrap.ts`
  - `frontend/src/widgets/panel/dockview-panel-widget.tsx`
  - `frontend/src/widgets/terminal/terminal-panel.ts`
  - `frontend/src/widgets/terminal/terminal-widget.tsx`
  - `frontend/src/widgets/terminal/terminal-dockview-tab-widget.tsx`
  - `frontend/src/widgets/terminal/terminal-dockview-header-actions-widget.tsx`
  - `frontend/src/shared/ui/components/terminal-surface.tsx`
  - `frontend/src/shared/ui/components/terminal-status-header.tsx`
- Current conversation/state source equivalent for terminal:
  - terminal panel params come from `resolveTerminalPanelParams(...)`
  - the main path is `TerminalPanelParams -> TerminalWidget -> TerminalSurface`
  - there is no dedicated terminal feature model or runtime API client in `frontend/src/features/` yet
- Demo/static sources that currently back the main path:
  - `frontend/src/widgets/terminal/terminal-panel.ts`
    - hardcoded `cwd`
    - hardcoded `shellLabel`
    - hardcoded `connectionKind`
    - hardcoded `sessionState`
    - hardcoded `introLines`
  - `frontend/src/shared/ui/components/terminal-surface.tsx`
    - renderer-only boot text
    - renderer-only prompt generation
    - local demo command handling for `help`, `pwd`, `ls`, `clear`, `status`
    - local echo/input loop instead of backend `POST /input`
- Existing visible controls already present in the current terminal UI:
  - terminal text input through the mounted xterm textarea
  - terminal tab close button
  - terminal group `+` add-tab action
  - right utility rail `Create terminal widget`
- Visible controls not present on the current terminal UI:
  - no visible restart button
  - no visible interrupt button
  - no visible explicit reconnect control
  - no visible terminal attachment or AI handoff control in this active `frontend/src` terminal slice

## Integration points to replace

- Replace `terminal-panel.ts` as the main runtime source of terminal session metadata.
- Introduce a frontend terminal runtime client under `frontend/src/features/terminal/` using `frontend/src/shared/api/runtime.ts`.
- Introduce a terminal feature hook/model that:
  - loads `GET /api/v1/terminal/{widgetID}` on mount
  - follows `GET /api/v1/terminal/{widgetID}/stream`
  - sends xterm input through `POST /api/v1/terminal/{widgetID}/input`
  - exposes restart only if a current visible control already exists
- Keep `TerminalWidget`, `TerminalStatusHeader`, Dockview tab chrome, and panel layout structure intact.

## Commands/tests used

- `sed -n '1,260p' core/transport/httpapi/api.go`
- `sed -n '1,240p' core/transport/httpapi/handlers_terminal.go`
- `sed -n '1,240p' core/terminal/types.go`
- `sed -n '1,240p' core/terminal/service.go`
- `sed -n '1,220p' core/app/terminal_restore_state.go`
- `sed -n '1,220p' core/app/terminal_session_actions.go`
- `sed -n '1,260p' core/transport/httpapi/handlers_terminal_test.go`
- `sed -n '1,220p' core/workspace/service.go`
- `sed -n '1,260p' frontend/src/widgets/terminal/terminal-panel.ts`
- `sed -n '1,260p' frontend/src/widgets/terminal/terminal-widget.tsx`
- `sed -n '1,220p' frontend/src/widgets/panel/dockview-panel-widget.tsx`
- `sed -n '1,260p' frontend/src/widgets/terminal/terminal-dockview-tab-widget.tsx`
- `sed -n '1,260p' frontend/src/widgets/terminal/terminal-dockview-header-actions-widget.tsx`
- `sed -n '1,520p' frontend/src/shared/ui/components/terminal-surface.tsx`
- `sed -n '1,260p' frontend/src/shared/ui/components/terminal-status-header.tsx`
- `sed -n '1,220p' frontend/src/app/dockview-workspace.bootstrap.ts`

## Known limitations

- This audit confirms the active terminal frontend path is still demo-backed; it does not yet claim runtime snapshot/stream/input integration.
- No restart or interrupt UI wiring is claimed in this audit because no dedicated visible control is present on the current terminal surface.

## Evidence

- `docs/architecture/current-behavior.md` already states the runtime contract:
  - snapshot hydration precedes stream attach
  - stream attach is fetch-based rather than native `EventSource`
- `docs/validation/workspace.md` still records the active terminal widget slice as renderer-only before this integration slice.
