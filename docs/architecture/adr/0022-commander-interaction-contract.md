# 0022 — Commander Interaction Contract

## Status

Accepted

## Context

The commander widget is moving from a frontend-local fake client toward a
real backend-owned filesystem path.

Without an explicit interaction contract, that migration would drift into
feature-by-feature ad hoc behavior:

- frontend-local shortcuts that no longer match the dense dual-pane shell
- backend mutations added without a stable operator grammar
- hidden failure states where async transport errors disappear behind an
  otherwise "working" pane shell

rune-terminal does not need broad Total Commander parity. It does need a
clear Total Commander-style operator contract while the backend path is
being wired slice by slice.

## Decision

The commander widget keeps a narrow, explicit Total Commander-derived
interaction model:

- the backend remains the source of truth for canonical paths and real
  filesystem mutations
- the frontend keeps only widget-local view state, history, pending
  confirmation UI, and path formatting/parsing
- the operator grammar stays command-centric and pane-centric:
  - `F2` for rename in the active pane
  - `F3` for file view
  - `F4` for text edit/save
  - `F5` for copy into the opposite pane or same-pane clone
    (`single` via an explicit target name, `batch` via a name template
    with preview)
  - `F6` for move into the opposite pane
  - `F7` for create-directory in the active pane
  - `F8` for delete in the active pane
  - `Ctrl+L` for inline path edit
  - `Ctrl+F` for pane filter
  - `Ctrl+S` for pane search
- backend mutations are introduced one operation at a time instead of
  re-enabling the old fake-client mutation set wholesale
- the current backend-owned commander write slice is:
  - `mkdir`
  - `copy`
  - `move`
  - `delete`
  - `rename`
  - text file read/write for `F4`
- copy/move overwrite prompts remain widget-local pending-bar UI, but the
  actual overwrite semantics are enforced by typed backend endpoints
- same-pane clone naming remains frontend-local operator tooling
  (single-name suggestion plus batch-template preview), while the actual
  copy target paths are enforced by typed backend endpoints
- rename preview and batch-template expansion remain frontend-local
  operator tooling, while the final rename mutation is backend-owned
- async transport failure must remain visible in the pane surface; it is
  not acceptable to hide backend errors behind stale rows or silent
  no-ops

## Consequences

Positive:

- commander behavior stays stable while backend wiring expands
- the frontend does not reclaim backend semantics during migration
- Total Commander muscle-memory flows remain intentional instead of
  incidental
- read/write credibility improves incrementally without pretending that
  broader parity is already done

Negative:

- `F4` edit/save is intentionally limited to UTF-8 text files on the
  backend path; binary/non-text edit flows remain out of scope even
  though `F3` now has a bounded backend-owned hex preview path
- backend mutation slices now need explicit error UX and focused tests
  before they can be exposed

## Alternatives considered

### Keep commander behavior implicit inside widget code

Rejected.
The backend migration is already large enough that an undocumented
shortcut grammar would drift and fragment quickly.

### Re-enable the whole fake-client mutation set until full backend parity exists

Rejected.
That would make the shell look more capable than the underlying product
behavior and would blur which operations are truly backend-owned.

### Delay all commander mutations until a larger backend rewrite is finished

Rejected.
We need narrow, honest daily-driver slices now, and the current
`mkdir/copy/move/delete/rename` contract is the smallest backend-owned
commander mutation set that still feels coherent.
