# Remaining Clone Implementation Plan

Date: `2026-04-26`

This plan covers the remaining `Partially transferred`, `Planned`, and
decision-driven residual slices from
[../parity/clone-status-matrix.md](../parity/clone-status-matrix.md).
Its purpose is to remove ad-hoc "blocked forever" tracking and replace it
with an ordered implementation program.

Phase status:

- `Phase 0` is now recorded through ADR 0028, ADR 0029, ADR 0030, and
  [tideterm-residual-decisions.md](./tideterm-residual-decisions.md).
- `Phase 1` is complete: the active shell/settings/terminal compact pass,
  linked browser coverage, and validation-doc closure are landed on the
  active `frontend/src` path.
- `Phase 2` is complete: backend-owned stream cancellation plus shared
  CLI/HTTP streaming semantics are now landed on the active conversation
  route.
- `Phase 3` is complete: attachment references now persist in `runtime.db`
  and are reusable from both transcript history and the composer shelf.
- `Phase 4` is the next implementation phase.
- Later phases remain implementation work.

## Success condition

At the end of this program, every remaining TideTerm-derived slice must be
in one of these states:

- implemented on the active `rterm` path and tracked as `Transferred`
- implemented with stronger semantics and tracked as `Exceeds original`
- explicitly retired as `Not carried forward` through a repository-local
  product/ADR decision

No slice should stay in a vague `Blocked` state.

## Sequencing rules

1. Finish active-path partials before opening brand-new domains.
2. Convert every current `Blocked` item into an explicit decision slice
   before writing runtime code.
3. Land each phase with the full vertical slice:
   backend contract, frontend surface, docs, validation notes, and e2e
   where the behavior is operator-visible.
4. Do not reintroduce TideTerm legacy stacks directly; when a feature
   needs to return, it must return through the current `core/` and
   `frontend/src/` architecture.

## Phase queue

### Phase 0. Resolve blocked items into real work

Purpose:
turn the current `Blocked` rows into explicit product decisions and
implementation charters.

Deliverables:

- ADR for `remote breadth v2`:
  tmux resume, WSL, richer auth/topology, and the replacement for the old
  `wsh` helper semantics
- ADR for `remote files domain`:
  remote browsing, preview, edit, and connection-scoped file widgets
- ADR for `plugin distribution`:
  local catalog only vs installable registry/marketplace
- product note for Tide-specific residuals:
  language switch, window title rules, and WaveProxy replacement or
  retirement

Exit criteria:

- every currently blocked matrix row is mapped either to a later phase in
  this plan or to an explicit `Not carried forward` decision
- [clone-status-matrix.md](../parity/clone-status-matrix.md) no longer
  uses `Blocked` for ambiguous reasons

Validation:

- doc-only review

### Phase 1. Finish active-path UX parity

Status:
completed on `2026-04-26`

Purpose:
close the current active-shell partials that do not require new domains.

Covers:

- shell chrome density and status/header polish
- settings/help/trust/secret-shield visual completion
- terminal search/find breadth within the current single-session widget
- remote settings-shell ergonomics
- MCP settings-shell ergonomics

Exit criteria:

- shell/settings/terminal surfaces no longer depend on "visual mismatch"
  notes for their remaining parity gap
- browser e2e covers the main settings navigation and terminal search
  flows on the active shell

Validation:

- frontend unit tests
- `npm run test:ui`
- `npm run build:frontend`
- `npm run lint:frontend`
- desktop smoke where shell chrome changed materially

### Phase 2. Complete AI streaming and cancellation semantics

Status:
completed on `2026-04-26`

Purpose:
finish the active AI transport so the remaining AI gaps are transport
gaps no longer.

Covers:

- token streaming for CLI-backed providers
- reasoning/tool-call stream event model
- durable backend cancellation identity instead of frontend-fetch-only
  abort semantics
- consistent stream/error/resume handling across provider kinds

Exit criteria:

- `Streaming AI responses` can move to `Transferred`
- provider stream events share one backend contract across Codex CLI,
  Claude Code CLI, and OpenAI-compatible HTTP
- cancellation is visible in audit/stream state rather than only in local
  frontend fetch state

Validation:

- targeted Go streaming tests
- frontend stream reducer/widget tests
- Playwright AI e2e with at least one CLI provider and one HTTP provider

### Phase 3. Add attachment storage and reuse

Status:
completed on `2026-04-26`

Purpose:
finish the attachment story on top of the already working Files -> AI
handoff.

Covers:

- backend attachment store and metadata lifecycle
- explicit import/reuse/remove APIs
- composer-side attachment shelf/history
- transcript attachment reopen/reuse affordances

Exit criteria:

- `File attachments into AI` can move to `Transferred`
- attachments survive beyond the one-shot queue-before-submit path
- storage, deletion, and missing-file behavior are explicit and tested

Validation:

- targeted Go tests for storage lifecycle
- frontend attachment widget tests
- Playwright e2e for attach, remove, resubmit, and historical reuse

### Phase 4. Broaden the SSH daily-driver path

Purpose:
finish the remaining narrow SSH gaps before adding new remote kinds.

Covers:

- broader `.ssh/config` parsing:
  `Include`, `Match`, wildcard expansion, and richer field normalization
- auth material handling:
  passphrase/keychain-aware error semantics and clearer preflight output
- stable remote session/default-target state transitions across check,
  launch, failure, and reconnect

Exit criteria:

- `.ssh/config` import can move to `Transferred`
- `Remote SSH profile lifecycle` loses the remaining "narrow daily-driver"
  caveats
- remote validation covers both happy-path and auth/topology failure modes

Validation:

- targeted Go tests for import/parser/state transitions
- frontend remote settings tests
- browser e2e for import, check, default, and launch
- isolated real-SSH smoke against a controlled local target

### Phase 5. Add terminal session groups and remote breadth v2

Purpose:
extend the terminal/remote model so TideTerm-style advanced remote use
cases have a current-architecture home.

Covers:

- multi-session terminal groups inside one terminal surface
- tmux resume/session management on the new remote contract
- WSL as an explicit connection kind if Phase 0 keeps it in scope
- `wsh` replacement semantics implemented as `rterm` runtime behavior,
  not as a direct legacy import

Exit criteria:

- `Shell chrome and terminal advanced affordances` can move to
  `Transferred`
- `Advanced remote breadth` is no longer blocked by missing domain model
- terminal/remote docs define session identity, resume semantics, and
  multi-session focus rules clearly

Validation:

- targeted Go runtime tests for session grouping and remote resume
- frontend terminal widget tests
- Playwright e2e for multi-session switching/search
- desktop smoke for session restore behavior

### Phase 6. Introduce the remote files domain

Purpose:
bring remote file workflows back through the current workspace/files
architecture instead of through TideTerm residue.

Covers:

- remote list/read/stat/write transport contract
- connection-scoped files widgets
- remote preview/edit flows
- terminal -> files/widget handoff with remote path identity

Exit criteria:

- `Remote fileshare surfaces` can move to `Transferred`
- remote files no longer rely on local-only compatibility shortcuts
- files/preview/editor widgets share one connection-aware path model

Validation:

- targeted Go tests for remote file service
- frontend files/preview/editor tests
- Playwright e2e for browse, preview, edit, and handoff from terminal

### Phase 7. Expand MCP onboarding breadth

Purpose:
finish the last MCP gap without changing the explicit-invoke philosophy.

Covers:

- provider templates/catalog/import flows
- richer registration helpers for auth headers/secrets
- clearer health/test UX before enable/start
- bounded discovery that still preserves explicit operator control

Exit criteria:

- `External MCP onboarding breadth` can move to `Transferred`
- onboarding a real external MCP provider no longer depends on manual
  low-level field entry alone

Validation:

- targeted Go tests for any new registration contracts
- frontend settings tests
- browser e2e for template-based MCP onboarding

### Phase 8. Add plugin catalog and install/discovery UX

Purpose:
finish the plugin story on top of the already validated runtime boundary.

Covers:

- plugin catalog storage and metadata model
- enable/disable/remove/update UX
- install/import flow according to the Phase 0 distribution decision
- runtime-safe validation before activation

Exit criteria:

- `Plugin discovery and marketplace UX` is no longer blocked
- operators can manage more than hard-coded local reference plugins
- install/update/remove flows preserve policy/audit invariants

Validation:

- targeted Go tests for catalog lifecycle
- frontend settings/catalog tests
- browser e2e for install/enable/disable/remove

### Phase 9. Resolve residual Tide-specific surfaces

Purpose:
close the remaining misc rows cleanly instead of leaving them as legacy
shadows.

Covers:

- runtime-backed window title rules if kept
- localization entrypoint if kept
- explicit retirement or replacement note for WaveProxy

Exit criteria:

- the old Tide-specific misc row is split into explicit `implemented` or
  `not carried forward` outcomes
- no residual feature remains tracked only because a legacy directory
  still exists

Validation:

- targeted frontend tests for any retained surface
- docs update for any retired feature

## Dependency map

| Remaining slice | Planned phases | Target end state |
| --- | --- | --- |
| Streaming AI responses and cancellation | `2` | `Transferred` |
| File attachments into AI | `3` | `Transferred` |
| Remote SSH profile lifecycle | `4` | `Transferred` |
| `.ssh/config` import | `4` | `Transferred` |
| Advanced remote breadth | `5` | `Transferred` with WSL still optional unless platform scope changes |
| Remote fileshare surfaces | `6` | `Transferred` |
| External MCP onboarding breadth | `7` | `Transferred` |
| Plugin catalog and install UX | `8` | `Transferred` |
| Online plugin marketplace | `0` | `Not carried forward` by ADR 0030 |
| Shell chrome and terminal advanced affordances | `5` | `Transferred` |
| Window title rules | `9` | `Implemented` as a narrow runtime-backed surface or explicitly retired |
| Language switch surface | `0` | `Not carried forward` unless localization becomes a first-class product requirement |
| WaveProxy | `0` | `Not carried forward` unless a new transport/infrastructure ADR reopens it |

## Recommended implementation order

1. `Phase 2`
2. `Phase 3`
3. `Phase 4`
4. `Phase 5`
5. `Phase 6`
6. `Phase 7`
7. `Phase 8`
8. `Phase 9`

This order keeps the program coherent:

- AI transport/storage first among the remaining implementation phases
- SSH foundation before broader remote breadth
- remote breadth before remote files
- MCP/plugin onboarding after the core shell and remote model stabilize
