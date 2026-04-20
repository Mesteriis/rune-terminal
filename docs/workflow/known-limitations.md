# Known limitations

rune-terminal is **pre-release**. This document is intentionally blunt
about what is incomplete or rough today, so that we do not overclaim
capability.

## Frontend is being rewritten

- `frontend/src/` is the active frontend tree; earlier drafts (e.g.
  anything under `frontend/app/*` or `frontend/rterm-api/*`) are gone
  and must not be reintroduced without an ADR
- the commander, terminal and AI-panel widgets currently run against
  mocks / fake clients (see `frontend/src/features/commander/model/`);
  real wiring to the Go core over HTTP/SSE is open work
- the frontend has no ESLint / Biome yet — `lint:active` and `lint:all`
  both delegate to `tsc --noEmit`

## Intentionally incomplete for now

- full TideTerm / Wave Terminal feature parity
- broad builder / proxy / preview-zoo surfaces
- broad settings universe
- `.ssh/config` import and advanced SSH auth / topology (proxy jump,
  richer auth negotiation)
- managed attachment storage / import and rich attachment preview UX
- streaming AI responses
- broad model orchestration beyond the current Ollama-compatible HTTP
  path
- plugin marketplace / discovery UX
- Windows-first support

## Partial / rough today

- remote SSH remains a focused daily-driver path (ADR 0019), not a full
  remote controller
- connection lifecycle is explicit but narrow (`saved profile` vs
  `last check` vs `last launch`)
- terminal parity is practical but advanced surfaces (multi-session
  sidebar, deep search/find) are not there yet
- AI command flow supports explicit command grammar only (`/run` and
  `run:`), not broad natural-language execution
- native-window automation coverage is limited; validation leans on
  build + runtime/API smoke plus manual notes

## Infrastructure gaps

- no `.github/` — CI is not yet running
- Tauri shell ships with `csp: null`; this must be tightened before any
  public release
- SSE terminal stream accepts the auth token via query parameter
  (ADR 0018 MVP tradeoff); migration to header-based auth is planned

## Current stance

These limitations are acceptable in the current pre-release phase when:

- core daily-driver flows (launch, local terminal, policy/approval)
  stay stable and honest
- failure modes are surfaced, not hidden
- docs and validation accurately describe the limits

They are **not** acceptable if used to hide regressions in launch,
shell, policy enforcement, approvals or audit.
