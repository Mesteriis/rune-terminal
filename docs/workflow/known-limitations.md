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
  same-pane clone path for both explicit single-entry targets and
  template-driven multi-entry batch clones, plus backend `F4` save for
  UTF-8 text files
- commander still does not claim binary/non-text edit/save or any
  terminal env dump exposed to the frontend
- the frontend has no ESLint / Biome yet — `lint:active` and `lint:all`
  both delegate to `tsc --noEmit`

## Intentionally incomplete for now

- full TideTerm / Wave Terminal feature parity
- broad builder / proxy / preview-zoo surfaces
- broad settings universe
- `.ssh/config` import and advanced SSH auth / topology (proxy jump,
  richer auth negotiation)
- managed attachment storage / import and rich attachment preview UX
- fine-grained token streaming for CLI-backed chat
  (the backend conversation stream currently emits the completed CLI
  response as one SSE text delta)
- plugin marketplace / discovery UX
- Windows-first support

## Partial / rough today

- remote SSH remains a focused daily-driver path (ADR 0019), not a full
  remote controller
- connection lifecycle is explicit but narrow (`saved profile` vs
  `last check` vs `last launch`)
- terminal parity is practical but advanced surfaces (multi-session
  sidebar, persisted font/theme/scrollback settings,
  deeper search/find flows) are not there yet
- AI command flow supports explicit command grammar only (`/run` and
  `run:`), not broad natural-language execution
- backend AI routing is intentionally narrow, not broad: the active provider kinds are local Codex CLI, local Claude Code CLI, and one explicit OpenAI-compatible HTTP source kind; `ollama`, proxy routing, and broader API-key/provider universes are not active runtime paths
- backend AI conversations are now persisted as explicit DB-backed threads with per-conversation CLI session continuity and persisted per-conversation request-context selection (`widget_context_enabled` plus explicit `widget_ids`), and the shell navigator now supports local filtering over the loaded thread list plus active-thread rename/archive/restore/delete, but conversation management is still intentionally narrow: there is no broader conversation search, archive-management view, or multi-panel conversation UX yet
- CLI provider execution is chat-focused and does not yet integrate provider-native tool calls with `core/toolruntime` approval/audit; the OpenAI-compatible HTTP source path is also completion-only and does not stream token deltas yet
- the shell-wide settings modal now exposes a structured `General / AI / Terminal / Commander` navigation; `General` includes the real desktop `watcher_mode` lifecycle control plus runtime bootstrap context, the AI section now includes CLI + OpenAI-compatible provider management and provider-backed model discovery, and the composer toolbar exposes live provider/model selection plus widget-context selection, but persisted terminal font/theme/scrollback preferences are still not backed by a dedicated runtime settings contract
- the AI composer keyboard-submit preference is now configurable in settings, but it remains a frontend-local preference persisted in browser/UI storage rather than a backend-synced operator profile
- desktop startup via `npm run tauri:dev` now clears the earlier ready-file bootstrap crash, but forced desktop shutdown is still rough: killing `rterm-desktop` can leave the spawned backend and watcher alive until they are cleaned up explicitly
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
