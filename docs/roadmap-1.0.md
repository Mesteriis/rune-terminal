# RunaTerminal 1.0.0 Roadmap

This roadmap is a release-control ladder, not a broad product wishlist.
Each milestone should be closed with small commits, explicit validation, and truthful docs updates.

## Milestone 1 — Release planning lock

- Goal:
  Lock `1.0.0` scope, blockers, non-goals, and release-control docs.
- Release relevance:
  `P0 release-blocker`
- Dependencies:
  existing parity matrix, validation report, current shell/remote/AI slices
- Validation:
  docs truthfulness review
- Status:
  `in_progress`

## Milestone 2 — Stable terminal daily-driver slice

- Goal:
  Close the remaining release-critical terminal and shell rough edges without reopening parity expansion.
- Release relevance:
  `P0 release-blocker`
- Dependencies:
  current terminal parity baseline
- Validation:
  launch path, terminal smoke, regression checks
- Status:
  `partial`

## Milestone 3 — AI command execution slice

- Goal:
  Add one real user-facing AI flow that executes a terminal command under policy and explains the result.
- Release relevance:
  `P0 release-blocker`
- Dependencies:
  AI conversation backend foundation, tool runtime, approval flow, terminal snapshot/state
- Validation:
  Go tests, frontend build, launch path, real AI panel smoke with approval and result explanation
- Status:
  `missing`

## Milestone 4 — Remote SSH daily-driver slice

- Goal:
  Strengthen remote shell launch UX into a release-worthy path with visible recovery and failure semantics.
- Release relevance:
  `P0 release-blocker`
- Dependencies:
  current connection catalog, active target semantics, one honest SSH happy path
- Validation:
  targeted remote tests, one real reachable-host smoke, clear shell-visible launch feedback
- Status:
  `partial`

## Milestone 5 — Shell/control closure

- Goal:
  Close remaining release-critical shell, launcher, settings, and control-surface rough edges without broadening scope.
- Release relevance:
  `P1 important`
- Dependencies:
  shell parity slices, launcher/control surfaces, release blocker triage
- Validation:
  launch smoke, shell/control manual checks, no new console/runtime regressions
- Status:
  `partial`

## Milestone 6 — Release hardening and polish

- Goal:
  Final bug fixing, docs cleanup, validation pass, and release checklist closure.
- Release relevance:
  `P0 release-blocker`
- Dependencies:
  all earlier release-blocking milestones materially complete
- Validation:
  full repository validation, fresh launch checks, truthful release checklist review
- Status:
  `missing`

## Deferred to post-1.0

These areas are intentionally not on the `1.0.0` critical path:

- builder parity
- proxy parity
- preview zoo
- code editor parity
- broad settings universe parity
- `.ssh/config` import
- advanced SSH auth strategies
- full remote workspace/controller parity
- file attachments
- full AI model orchestration matrix
- plugin ecosystem work
