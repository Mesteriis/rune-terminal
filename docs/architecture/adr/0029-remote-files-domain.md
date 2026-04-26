# 0029. Remote Files Domain

- Status: Accepted

## Context

The current shell can preserve path and connection context when opening a
files block from terminal state, but the active files/preview/edit path is
still effectively local-first. TideTerm historically bundled broader
remote fileshare behavior, but that stack was tied to legacy renderer and
transport assumptions that do not fit the current rewrite.

If remote file workflows return, they need a dedicated domain model. A
thin UI patch on top of today's local-first files widgets would hide the
hard parts:

- connection-aware path identity
- remote stat/list/read/write semantics
- remote preview/edit safety and failure behavior
- terminal-to-files handoff that preserves connection truth

## Decision

`rterm` accepts a dedicated remote files domain as future work.

That domain must be implemented as a backend-owned extension of the
current files/workspace model:

- remote file identity is explicit and includes connection scope
- list/read/stat/write behavior is exposed through typed backend
  contracts, not ad hoc frontend branching
- files, preview, and editor widgets must consume one connection-aware
  path model
- terminal handoff into files/preview/editor widgets must preserve remote
  connection identity

The old TideTerm fileshare stack is not carried forward directly.

This domain is intentionally separate from remote breadth v2:

- remote breadth v2 owns remote session and connection semantics
- the remote files domain owns connection-scoped file interaction

The remote files domain may depend on remote breadth v2 foundations, but
it is not allowed to reintroduce TideTerm's legacy non-core file
transport/controller model.

## Consequences

Positive:

- remote file work is no longer mixed into generic shell parity debt
- the future implementation has a clear backend/frontend ownership split
- local and remote file widgets can converge on one explicit path model

Negative:

- the current shell still lacks full TideTerm-style remote files breadth
  until this domain lands
- implementing remote browse/preview/edit now clearly requires new core
  services and validation, not just frontend glue

## Alternatives considered

### Keep using local-first files widgets with special-case remote flags

Rejected. That would hide connection identity and produce fragile widget
semantics.

### Revive TideTerm fileshare/controller code directly

Rejected. That would violate the rewrite boundary and skip the current
backend model.

### Fold remote file behavior into the generic remote breadth ADR

Rejected. Session/controller concerns and file-domain concerns need
separate ownership boundaries even if one depends on the other.
