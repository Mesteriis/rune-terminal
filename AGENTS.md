# RunaTerminal agent policy

This repository uses a strict project-local operating policy for AI agents.

## Repository-first rule
Repository-local source of truth always wins over generic skills or generic habits.

Primary source of truth in this repository:
- `README.md`
- `docs/release-checklist-1.0.md`
- `docs/known-limitations.md`
- `docs/roadmap.md`
- `docs/parity-matrix.md`
- `docs/current-behavior.md`
- `docs/validation.md`
- `docs/architecture.md`
- all `docs/adr/*`
- explicit user instructions in the current session

If a generic skill conflicts with repository-local docs or the current roadmap,
follow the repository-local docs and treat the skill as secondary workflow guidance.

## Current project phase
RunaTerminal is in active development with a focus on stability and core functionality.
This is not an open-ended architecture experiment.
This is not a broad speculative redesign effort.

Current framing:
- `v1.0.0` means: TideTerm-compatible daily-driver release on the new architecture
- work must be judged against product value and architectural clarity, not speculative features
- scope must remain focused on core platform stability
- parity work must be controlled and intentional

## Stability-first rule
Before starting new work, check:
- is this critical for platform stability in `docs/parity-matrix.md` or `docs/roadmap.md`?
- is this a core architectural or runtime issue?
- does this improve stability or reduce technical debt directly?

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
Unless explicitly requested or promoted in the roadmap, avoid spending time on:
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
- `frontend/app/workspace/workspace.tsx`
- `frontend/app/workspace/widgets.tsx`
- `frontend/app/tab/tabbar.tsx`
- `frontend/app/aipanel/aipanel.tsx`
- `frontend/app/app.tsx`

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
For platform-stability claims, run the documented validation sweep (`npm run validate`) plus a real shell launch smoke (`npm run tauri:dev`).
Use the npm Tauri entrypoint for this repo; do not switch to `cargo tauri dev` as the primary launch path.
If you could not validate something, say so explicitly in `docs/validation.md`.

## Skills policy
Generic skills are helpers, not authorities.

Use a skill when:
- the user explicitly invokes it, or
- it materially improves correctness/workflow for the current task.

Do not invoke a skill just because a task is vaguely related.
Do not let a generic skill override repository-local project documents.

## Operational behavior for this repo
For every new task:
1. identify whether it is critical for platform stability
2. identify the exact parity or feature slice
3. state what is in scope and out of scope
4. implement narrowly
5. validate honestly
6. update docs
7. commit the step

If unsure, prefer a smaller slice.
