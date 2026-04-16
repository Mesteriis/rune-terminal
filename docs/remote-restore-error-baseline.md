# Remote Restore Missing-Profile Error Baseline

Date: `2026-04-17`

## Exact failing path

1. `POST /api/v1/terminal/{widgetID}/restart`
2. `core/transport/httpapi/handlers_terminal.go` -> `handleTerminalRestart`
3. `core/app/terminal_session_actions.go` -> `RestartTerminalSession`
4. `core/app/runtime.go` -> `connectionForWidget(widget.ConnectionID)`
5. `core/connections/service.go` -> `Resolve(id)` returns `connections.ErrConnectionNotFound` for missing remote profile id
6. error bubbles back to `writeTerminalError`

## Current returned status/code

- HTTP status: `500`
- transport code: `internal_failure`
- message: explicit missing profile detail (for example `connection not found: conn-missing`)

## Desired status/code

- HTTP status: `404`
- transport code: domain not-found code (`connection_not_found`) for missing remote profile linkage
- message: keep explicit missing profile detail

## Why `500` is incorrect

- missing restore profile is a known domain state (stale widget linkage), not an unexpected server failure.
- backend already classifies `connections.ErrConnectionNotFound` as a public not-found error in other surfaces.
- returning `500` makes operator remediation less clear and mislabels a user-actionable not-found condition as infrastructure failure.

## Validation after fix

- Date: `2026-04-17`
- Runtime check:
  - restored stale remote widget (`connection_id: conn-missing`) snapshot still reports explicit disconnected state
  - `POST /api/v1/terminal/term-remote-stale/restart` now returns:
    - HTTP status: `404`
    - transport code: `connection_not_found`
    - explicit message: `connection not found: conn-missing`
  - local restart path remains unaffected: `POST /api/v1/terminal/term-main/restart` returns `200` and local session stays running
- Corrective result:
  - missing-profile restore now maps to explicit not-found semantics instead of generic `500 internal_failure`.
