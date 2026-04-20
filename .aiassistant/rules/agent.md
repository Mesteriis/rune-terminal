---
apply: always
---

You are working on the project:

rune-terminal (short name `rterm`)

This is NOT a generic coding session.
This is a structured engineering process with strict rules.

-------------------------------------
WORKFLOW MODEL
-------------------------------------

Work is performed in SMALL, CONTROLLED SLICES.

Each slice must:

1. Have a clear goal
2. Be limited in scope
3. Be broken into phases
4. Create a commit AFTER EACH PHASE
5. Produce a structured report

The project is pre-release and does NOT run a main-ready / release-train
workflow. Do not treat `main` as a deployment target; treat it as a
rolling development branch. Follow the current roadmap and the user's
explicit instructions for the slice you are working on.

There is NO continuous free-form development.

-------------------------------------
SLICE RULES
-------------------------------------

Each slice:

- solves ONE problem
- does NOT expand scope
- does NOT "improve nearby code"
- does NOT introduce unrelated changes

If something is out of scope:
→ document it
→ DO NOT fix it

-------------------------------------
COMMIT DISCIPLINE
-------------------------------------

After EACH phase:

- commit with a precise message
- no "misc fixes"
- no batch commits
- no mixing concerns

Push cadence is decided per slice by the user — do not auto-push.

-------------------------------------
REPORT FORMAT (MANDATORY)
-------------------------------------

After each slice you MUST output:

### <Slice name> result
- status: done

### Commits
(list with hashes and messages)

### Changed files
(list)

### Verified
(list actual checks)

### Remaining gaps
(only relevant to this slice)

-------------------------------------
ABSOLUTE PROHIBITIONS
-------------------------------------

You MUST NOT:

- redesign UI
- change styles (CSS, SCSS, Tailwind)
- refactor large parts of the codebase
- introduce new architecture layers
- implement unrelated features
- clean up legacy broadly
- guess behavior
- fake validation
- use "any" as a blanket fix
- introduce hidden global state
- couple logic implicitly

-------------------------------------
ARCHITECTURE CONSTRAINTS
-------------------------------------

The system is built with:

- Go core (source of truth) — `core/`, `cmd/rterm-core/`
- Tauri shell — `apps/desktop/src-tauri/`
- React + TypeScript frontend — `frontend/src/` (currently being rewritten)
- Plugin runtime — JSON-line stdio protocol `rterm.plugin.v1`, see
  `core/plugins/`

Earlier frontend drafts (`frontend/app/*`, `frontend/rterm-api/*`,
`frontend/runtime/*`, `frontend/compat/*`, `frontend/tideterm-src/*`)
no longer exist in the active tree and must not be reintroduced without
an ADR.

RULE:

Backend defines truth.
Frontend consumes it.

-------------------------------------
FUTURE CONSTRAINT (VERY IMPORTANT)
-------------------------------------

This project MUST support:

PLUGIN SYSTEM (SIDE-PROCESS MODEL)

Meaning:

- each plugin runs as a separate process
- communication is explicit (no shared memory assumptions)
- strict request/response contracts
- no hidden coupling
- no implicit global state dependencies

You MUST NOT introduce shortcuts that break this model.

-------------------------------------
DEVELOPMENT PRIORITY ORDER
-------------------------------------

Always follow:

1. Make system WORK
2. Make system STABLE
3. Make system COMPLETE
4. Only then → CLEAN

NEVER jump directly to cleanup or redesign.

-------------------------------------
VALIDATION RULES
-------------------------------------

Validation must be REAL.

You MUST:

- run backend separately
- run frontend separately
- test actual behavior (not only build/tsc)
- use browser (via MCP if available)
- verify API calls
- verify UI behavior

You MUST NOT:

- rely only on TypeScript or lint
- assume functionality
- mark features DONE without proof

-------------------------------------
ROADMAP RULES
-------------------------------------

All work must align with:

docs/workflow/roadmap.md
docs/workflow/known-limitations.md
docs/validation/validation.md

Each feature:

- has status
- has acceptance criteria
- must be validated

-------------------------------------
DECISION RULE
-------------------------------------

If unsure between:

- fixing something
- documenting something

→ DOCUMENT FIRST

-------------------------------------
STOP RULE
-------------------------------------

If you feel like:

- "while I am here I can improve..."
- "this would be cleaner if..."
- "let me refactor this..."

STOP.

Return to the defined slice.

-------------------------------------
TONE
-------------------------------------

Be precise.
Be minimal.
Be factual.

No over-engineering.
No creative expansion.

This is controlled engineering work, not exploration.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
