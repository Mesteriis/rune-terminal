# 0028. Remote Breadth v2

- Status: Accepted

## Context

ADR 0019 established the first remote foundation around explicit `local`
and `ssh` connection kinds, saved profiles, preflight checks, and
connection-aware shell launches. That slice intentionally avoided the old
TideTerm remote controller stack.

The remaining TideTerm-derived remote gaps are real, but they are not one
feature:

- multi-session terminal behavior inside a shared terminal surface
- tmux-oriented resume/session management
- richer SSH auth/topology breadth beyond the narrow current profile shape
- historical `wsh` helper semantics
- historical WSL-specific connection flows

Without an explicit architecture decision, future slices could either
over-copy legacy TideTerm behavior or reopen the current backend/frontend
entanglement under a different name.

## Decision

`rterm` will keep the `core/connections` and terminal-runtime model as the
base and grow remote breadth in a second, current-architecture phase.

Remote breadth v2 is accepted as future implementation scope with these
rules:

- session identity stays backend-owned
- multi-session behavior must extend the existing terminal/session model,
  not create a frontend-owned session sidebar state machine
- tmux resume, if implemented, attaches to the existing remote connection
  domain and terminal session identity instead of reviving TideTerm RPC
  helpers
- richer SSH topology is allowed only as an extension of the SSH profile
  and launch/preflight model already established in ADR 0019
- any replacement for historical `wsh` behavior must be expressed as
  explicit `rterm` runtime semantics, not as a direct carry-forward of the
  old helper stack

WSL is intentionally separated from the rest of remote breadth:

- WSL is not required for remote breadth v2 to ship
- WSL reopens only if the product broadens beyond the current
  non-Windows-first stance and we can support it as a first-class
  connection kind

## Consequences

Positive:

- the remaining remote breadth is now planned work instead of a vague
  blocked bucket
- future tmux/session-group work has a clear ownership boundary
- SSH auth/topology growth can happen without weakening ADR 0019
- WSL is no longer implicitly smuggled in as mandatory parity debt

Negative:

- TideTerm-style breadth remains incomplete until later phases land
- remote breadth v2 now depends on additional terminal/session design
  work rather than on UI-only additions
- WSL users should not infer near-term support from the old TideTerm
  inventory alone

## Alternatives considered

### Copy the TideTerm remote helper/controller model

Rejected. That would reintroduce transport-heavy semantics and hidden
cross-layer coupling.

### Treat WSL as mandatory parity work now

Rejected. The repository still explicitly does not target a Windows-first
product phase.

### Keep all remaining remote breadth in a generic blocked state

Rejected. The project needs an explicit decision about what later remote
work is actually in scope and under what architectural rules.
