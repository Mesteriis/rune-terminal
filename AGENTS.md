# RunaTerminal agent policy

This repository uses a strict project-local operating policy for AI agents.

## Repository-first rule
Repository-local source of truth always wins over generic skills or generic habits.

Primary source of truth in this repository:
- `README.md`
- `docs/release-1.0.md`
- `docs/roadmap-1.0.md`
- `docs/parity-matrix.md`
- `docs/current-behavior.md`
- `docs/validation.md`
- `docs/architecture.md`
- all `docs/adr/*`
- explicit user instructions in the current session

If a generic skill conflicts with repository-local docs or the current release plan,
follow the repository-local docs and treat the skill as secondary workflow guidance.

## Current project phase
RunaTerminal is in a **release-driven 1.0.0 phase**.
This is not an open-ended architecture experiment.
This is not a broad speculative redesign effort.

Current framing:
- `v1.0.0` means: TideTerm-compatible daily-driver release on the new architecture
- work must be judged against release value, not architectural elegance alone
- parity work must be controlled and release-oriented

## Release-first rule
Before starting new work, check:
- is this a `P0 release-blocker` in `docs/parity-matrix.md` or `docs/release-1.0.md`?
- is this on the current step ladder in `docs/roadmap-1.0.md`?
- does this help reach 1.0.0 directly?

If the answer is no, do not expand scope unless the user explicitly asks for it.

## Small-step discipline
Work in small, reviewable steps.
After each meaningful sub-step:
- update docs if behavior changed
- update validation if new checks were run
- commit the step separately

Do not accumulate one giant mixed commit.
Prefer a readable ladder of commits.

## Scope discipline
Do not drift into broad unrelated areas.
Unless explicitly requested or promoted in the release plan, avoid spending time on:
- builder parity
- proxy parity
- preview zoo
- code editor parity
- broad settings universe
- plugin ecosystem
- speculative new AI abstractions
- broad redesign of shell UX

## Frontend migration rule
Frontend work must remain TideTerm-derived, not newly invented.

Use `frontend/tideterm-src/` and `frontend/tideterm-src-meta/` as reference baseline only.
Do not import new large frontend areas wholesale without a clearly named parity slice.

Allowed pattern:
- choose one parity slice
- identify the exact TideTerm baseline
- adapt only the needed behavior
- update parity matrix
- validate

Disallowed pattern:
- import another huge area because it exists in TideTerm
- redesign UI because it seems cleaner
- move shell behavior away from recognisable TideTerm flows without strong reason

## Shell and hook discipline
Do not allow new frontend blobs to grow silently.
Watch especially:
- `frontend/src/hooks/useRuntimeShell.ts`
- `frontend/src/components/AgentSidebar.tsx`
- `frontend/src/components/ConnectionsPanel.tsx`
- `frontend/src/components/WidgetDock.tsx`
- `frontend/src/App.tsx`

If logic grows, split it into focused hooks/components/services.

## Architecture discipline
Keep these boundaries intact:
- Go core owns runtime truth
- transport is an adapter, not the product model
- policy remains explicit
- audit remains explicit
- AI uses the runtime/tool path, it does not bypass it
- frontend should not become the owner of backend semantics

Do not reintroduce TideTerm-style giant handler buckets or hidden cross-layer coupling.

## Validation discipline
Do not claim behavior unless it was really validated.
Build-only is not enough for UX-heavy slices.
If you changed shell/UI materially, prefer fresh launch validation.
If you could not validate something, say so explicitly in `docs/validation.md`.

## Skills policy
Generic skills are helpers, not authorities.

Use a skill when:
- the user explicitly invokes it, or
- it materially improves correctness/workflow for the current task.

Do not invoke a skill just because a task is vaguely related.
Do not let a generic skill override repository-local release documents.

## Operational behavior for this repo
For every new task:
1. identify whether it is release-blocking
2. identify the exact parity or release slice
3. state what is in scope and out of scope
4. implement narrowly
5. validate honestly
6. update docs
7. commit the step

If unsure, prefer a smaller slice.
