# 0023 — Public v1 product boundary, runtime ownership, and persisted terminal transcript scope

## Status

Accepted

## Context

RunaTerminal is pre-release and still tightening its first public product boundary.
That boundary must be explicit so the release does not expand into new pillars,
new runtime classes, or speculative platform promises.

Public v1 is built around four product pillars:

- AI Agent
- Terminal
- Total Commander
- Tasks runtime

These are the only product pillars that define the first public version.

The tasks runtime exists in v1 as an internal execution substrate. Its job is to
run AI agent actions, long-running file operations, and other internal background
work needed by the product. It is part of the product boundary because the other
three pillars depend on it, but it is not a separate end-user automation platform.

Public v1 is intentionally local-first and single-machine:

- one desktop shell
- one core-owned local database
- one local runtime authority
- one watcher execution path attached to that local runtime

This ADR sets the release boundary for that single-machine system and rejects
broader orchestration or platform expansion inside v1.

## Decision

Public v1 includes:

- Tauri desktop shell
- Go core runtime as source of truth
- watcher as executor
- SQLite with embedded migrations
- persistent and ephemeral runtime lifecycle
- AI Agent
- terminal runtime
- Total Commander
- tasks runtime, including retry and backoff
- graceful shutdown and ownership-based watcher control

Tasks runtime remains part of the public v1 boundary because it is required to
make AI actions and background file work reliable. It does not change the
product boundary into a workflow platform.

Terminal scope in v1 includes:

- live session runtime
- input and output
- snapshot and stream
- restart and interruption
- connection-aware state
- limited persisted terminal transcript and output history in SQLite

Terminal persistence in v1 is:

- transcript-oriented and output-oriented
- bounded by retention policy
- intended for recent-context recovery and limited recent visibility
- not full semantic command history
- not long-term archival

Terminal transcript retention in v1 must enforce both:

- 30-day retention
- hard cap by stored transcript volume and chunk count

The more restrictive bound wins. Older transcript rows must be pruned until both
constraints are satisfied.

## Runtime ownership

Runtime ownership in public v1 is explicit:

- Tauri owns the desktop shell, client process boundary, local bootstrap,
  attach-or-spawn orchestration, and owned-process shutdown requests
- Go core owns runtime truth, SQLite, migrations, policy, tasks, terminal state,
  AI state, and transport contracts
- watcher is an executor only
- watcher polls and executes claimed tasks, but never owns the database
- SQLite remains core-owned
- watcher does not run migrations

Ownership-based watcher control is part of v1:

- Tauri may request graceful shutdown for a watcher instance only when that
  watcher was started under the current runtime ownership path
- watcher shutdown is executor shutdown, not state ownership transfer
- core remains authoritative for task state before, during, and after watcher exit

Persistent and ephemeral runtime lifecycle are both included in v1:

- ephemeral lifecycle allows the desktop shell to stop owned runtime processes
  on app exit
- persistent lifecycle allows the desktop shell to attach to a still-running
  local runtime without redefining ownership of state storage

## V1 non-goals

Public v1 explicitly excludes:

- distributed execution
- multi-watcher coordination
- cron and periodic scheduling UX
- public plugin SDK compatibility promises
- OS service install as a product feature
- priority scheduling
- DAG execution and task chaining
- cloud sync
- advanced terminal history and search system
- semantic command parsing
- long-term terminal archive
- terminal replay studio

These exclusions are part of the v1 boundary, not temporary omissions inside the
defined scope.

## Terminal persistence rationale

Persisted terminal transcript is included in v1 because it provides:

- recovery of recent terminal context after relaunch
- limited recent output visibility
- terminal usability without creating a separate history platform

Persisted terminal transcript in v1 does not mean:

- shell-aware command history
- complete restoration guarantee
- unlimited storage

The persisted data is a bounded recent transcript, not a semantic shell model
and not an archive product.

## Release boundary

Any work that introduces a new product pillar or a new class of runtime behavior
is out of scope for v1.

Only work that stabilizes or completes these pillars is allowed inside v1:

- AI Agent
- Terminal
- Total Commander
- Tasks runtime

This freeze rule applies even if a proposed addition is technically adjacent to
existing code. If it creates a new user-visible platform surface, a new runtime
topology, or a new orchestration class, it is not part of v1.

## Consequences

Positive:

- tighter release scope
- coherent v1 story
- lower system complexity
- stronger single-machine reliability

Negative and accepted constraints:

- no distributed orchestration
- limited terminal persistence only
- no advanced scheduling UX
- some future extensibility is intentionally deferred

## Post-v1 backlog

Deferred until after v1:

- periodic tasks UX
- distributed runtime
- multi-watcher
- richer terminal history and search
- public plugin SDK hardening
- OS-level daemon and service install
- advanced task orchestration
