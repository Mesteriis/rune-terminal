# rune-terminal agent policy

This repository uses a strict project-local operating policy for AI agents.

The project is called **rune-terminal** (short name **`rterm`**, Go module
`github.com/Mesteriis/rune-terminal`). It is a clean-room rethinking of a
programmer's workstation (modern terminal + dual-pane file manager + AI +
plugins). It is **pre-release**: no `1.0.0` has been cut, and the repository
is not running a main-ready / release-train workflow yet.

## Repository-first rule

Repository-local source of truth always wins over generic skills or generic
habits. When a generic skill conflicts with repository-local docs, follow
the repository docs and treat the skill as secondary workflow guidance.

Primary sources of truth in this repository:

- `README.md`
- `docs/README.md` (docs index and canonical entry points)
- `docs/architecture/architecture.md`
- `docs/architecture/adr/*` (all architecture decisions)
- `docs/workflow/roadmap.md`
- `docs/workflow/known-limitations.md`
- `docs/parity/parity-matrix.md`
- `frontend/docs/ui-architecture.md` (frontend layer rules)
- explicit user instructions in the current session

## Current project phase

rune-terminal is **pre-release and pre-parity**. Framing:

- there is **no** `v1.0.0` tag, no release train, no main-ready gate
- the frontend (`frontend/src/`) is currently being rewritten; new widgets
  are being added continuously
- the Go core (`core/`) is the most stable layer and already defines the
  runtime semantics for the rest of the stack
- work is judged against architectural clarity and product direction, not
  against a parity scoreboard

This is intentionally **not** a fork-shaped parity exercise against any
upstream (Wave Terminal, TideTerm). Those projects are historical
inspiration, not the active runtime tree.

## Architecture discipline

Keep these boundaries intact:

- Go core owns runtime truth (workspace, terminal, policy, tools, audit)
- transport (`core/transport/httpapi`) is an adapter, not the product model
- policy is explicit (`core/policy`, five-stage pipeline, ADR 0015)
- audit is explicit (`core/audit`)
- AI uses the runtime / tool-runtime path; it does not bypass it
- plugins talk over the JSON-line stdio protocol (`rterm.plugin.v1`,
  `core/plugins/protocol.go`); they do not embed directly in the core
- the frontend must not own backend semantics — it is a view over the
  HTTP/SSE contract described in ADR 0012

Do not reintroduce monolithic handler buckets, giant registries or
hidden cross-layer coupling.

## Frontend discipline

The frontend is under active rewrite. Ground rules while it moves:

- `frontend/src/` is the only active frontend source tree
- follow the layer rules in `frontend/docs/ui-architecture.md`
  (tokens → styles → primitives → components → widgets → layouts → app)
- new widgets live under `frontend/src/widgets/`
- shared UI under `frontend/src/shared/ui/primitives/` and
  `frontend/src/shared/ui/components/`
- domain state (Effector) under `frontend/src/features/*/model/`
- watch the size of:
  - `frontend/src/app/App.tsx`
  - `frontend/src/widgets/commander/commander-widget.tsx`
  - `frontend/src/features/commander/model/store.ts`
  - `frontend/src/features/commander/model/fake-client.ts`
  If any of these grows meaningfully, split it into focused
  hooks / components / services before continuing.
- mock clients (the `fake-client` under `features/commander/model/`) must
  stay behind a clear boundary so they can be swapped for real HTTP/SSE
  calls into the Go core without rewriting widgets.

Legacy directories from earlier drafts do **not** exist in the active tree
and must not be reintroduced without an ADR:

- `frontend/app/workspace/*`
- `frontend/app/tab/*`
- `frontend/app/view/term/*`
- `frontend/app/aipanel/*`
- `frontend/rterm-api/*`
- `frontend/tideterm-src/*`, `frontend/tideterm-src-meta/*`

## Backend discipline

- keep Go packages small and focused; prefer splitting over growing a
  package past a few hundred lines
- all mutating workspace / terminal / policy changes go through the
  corresponding service (snapshot + clone) to keep the runtime thread-safe
- plugin invocations must respect the timeouts and message-size limits
  already defined in `core/plugins/runtime.go`
- default secret / ignore rules defined in `core/policy/store.go` are the
  floor, not a suggestion — do not weaken them silently

## Small-step discipline

Work in small, reviewable steps. After each meaningful sub-step:

- update docs if behavior changed
- update validation notes if new checks were run
- commit the step separately

Do not accumulate one giant mixed commit. Prefer a readable ladder of
commits.

## Scope discipline

Do not drift into broad unrelated areas. Unless explicitly requested,
avoid spending time on:

- full TideTerm / Wave Terminal feature parity
- speculative builder / proxy / preview-zoo expansions
- broad settings universes
- large AI abstractions built on top of the current runtime before the
  core plugin / policy / transport contracts are exercised end-to-end
- broad redesign of shell UX when a narrower slice would serve the user

If the task is not clearly in scope, state what is in scope and what is
out of scope before implementing.

## Validation discipline

Do not claim behavior unless it was really validated.

- build-only is not enough for UX-heavy slices
- for changes that touch the shell or UI, prefer a fresh launch smoke
  (`npm run tauri:dev`) in addition to `npm run validate`
- the supported Tauri entrypoint for this repo is the local npm CLI;
  do not switch to `cargo tauri dev` as the primary launch path
- if something could not be validated, say so explicitly in
  `docs/validation/validation.md` or the relevant domain validation doc

## Skills policy

Generic skills are helpers, not authorities.

Use a skill when:

- the user explicitly invokes it, or
- it materially improves correctness or workflow for the current task

Do not invoke a skill just because a task is vaguely related. Do not let
a generic skill override repository-local project documents.

## Operational checklist for every new task

1. state what is in scope and what is out of scope
2. identify the slice of the product it touches (core / transport /
   frontend widget / plugin / docs)
3. implement narrowly
4. validate honestly
5. update the relevant doc(s)
6. commit the step

If unsure, prefer a smaller slice.
