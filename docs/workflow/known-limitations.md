# Known limitations

rune-terminal is **pre-release**. This document is intentionally blunt
about what is incomplete or rough today, so that we do not overclaim
capability.

## Frontend is being rewritten

- `frontend/src/` is the active frontend tree; earlier drafts (e.g.
  anything under `frontend/app/*` or `frontend/rterm-api/*`) are gone
  and must not be reintroduced without an ADR
- terminal and AI-panel widgets currently still run against mocks /
  fake clients
- commander now has a narrow async HTTP path into the Go core
  (`/api/v1/bootstrap`, `/api/v1/fs/list`, `/api/v1/fs/read`,
  `/api/v1/fs/file`, `/api/v1/fs/mkdir`, `/api/v1/fs/copy`,
  `/api/v1/fs/move`, `/api/v1/fs/delete`, `/api/v1/fs/rename`), and the
  active backend path now covers `F2/F3/F4/F5/F6/F7/F8`, including the
  focused single-entry same-pane clone flow plus backend `F4` save for
  UTF-8 text files
- commander still does not claim the full Total Commander same-directory
  batch clone surface, binary/non-text edit/save, or any terminal env
  dump exposed to the frontend
- the frontend has no ESLint / Biome yet — `lint:active` and `lint:all`
  both delegate to `tsc --noEmit`

## Intentionally incomplete for now

- full TideTerm / Wave Terminal feature parity
- broad builder / proxy / preview-zoo surfaces
- broad settings universe
- `.ssh/config` import and advanced SSH auth / topology (proxy jump,
  richer auth negotiation)
- managed attachment storage / import and rich attachment preview UX
- fine-grained streaming deltas for proxy-routed Claude/Gemini channels
  (the backend conversation stream currently degrades to buffered
  completion for those upstreams)
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
- backend AI routing now supports direct providers plus a TideTerm-derived internal proxy domain, but it is not a standalone proxy server/product surface and its channel scheduler is currently scoped to conversation traffic only
- the unfinished proxy kind is now intentionally hidden from the settings modal new-provider toolbar while the CLI-backed routing replacement is still pending; existing proxy records remain backend-supported for migration only
- the new Codex path is local-auth-first: it reads existing `codex` machine auth from `~/.codex/auth.json`, but this slice does not yet implement an in-app browser/callback connect flow
- the shell-wide settings modal now exposes the backend provider catalog with auto-discovered model dropdowns for direct providers, but proxy key editing is still a focused v1 surface: replacement keys are entered as newline-separated enabled secrets, not as a richer per-key lifecycle UI
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
