# Known limitations

rune-terminal is **pre-release**. This document is intentionally blunt
about what is incomplete or rough today, so that we do not overclaim
capability.

## Frontend is being rewritten

- `frontend/src/` is the active frontend tree; earlier drafts (e.g.
  anything under `frontend/app/*` or `frontend/rterm-api/*`) are gone
  and must not be reintroduced without an ADR
- the active terminal and AI shell paths now run against the backend
  runtime over the documented HTTP/SSE contracts; commander still keeps
  some frontend-local orchestration and persistence seams even though the
  active file read/write flows already use backend HTTP routes and the
  backend-backed commander runtime no longer inherits its default shell
  state from the old mock seed, the old fake-client transport layer is no
  longer part of the active frontend tree, and the widget-store confirm path now
  only owns local pending flows (`select/unselect/search`) rather than
  carrying dead fake-client mutation branches for backend-owned
  `copy/move/delete/mkdir/rename`; the same store now also drops empty
  reducer listeners for backend-owned async actions (`view/edit/open/path/history/save`) so those flows are owned only by hooks/API code, and commander widget persistence now writes only runtime pane/widget state while still accepting older `client.directories` snapshots as a read-only compatibility input
- commander now has a narrow async HTTP path into the Go core
  (`/api/v1/bootstrap`, `/api/v1/fs/list`, `/api/v1/fs/read`,
  `/api/v1/fs/file`, `/api/v1/fs/mkdir`, `/api/v1/fs/copy`,
  `/api/v1/fs/move`, `/api/v1/fs/delete`, `/api/v1/fs/rename`,
  `/api/v1/fs/open`), and the
  active backend path now covers `F2/F3/F4/F5/F6/F7/F8`, including the
  same-pane clone path for both explicit single-entry targets and
  template-driven multi-entry batch clones, backend `F4` save for UTF-8
  text files, bounded hex `F3` preview for non-text/binary files, and an
  explicit blocked-dialog path when `F4` targets a non-text/binary file;
  commander quick filter now also reloads through backend
  `GET /api/v1/fs/list?query=...` instead of filtering only the
  frontend-projected pane rows;
  that blocked dialog can now hand either the selected file or its
  containing folder off to the host OS opener, but commander still does
  not claim a broader external-tool registry/chooser or a
  browser-verifiable opener side effect
- commander still does not claim in-place binary editing or a full binary
  inspector; the frontend now exposes only a bounded backend-owned shell
  summary (`default shell`, `TERM`, `COLORTERM`, `workspace root`) rather
  than a general terminal env dump, and the current backend-owned file
  dialog now surfaces bounded binary preview metadata (file size plus
  preview span) for the existing `F3` hex preview and blocked `F4` path,
  but it remains intentionally narrower than a dedicated binary inspection
  tool
- backend widget-kind discovery now drives Dockview initial seeding and the
  right-rail widget menu, but Dockview layout persistence is still
  frontend-local; `commander` is intentionally reported as `frontend-local`,
  `files` is now creatable from the right rail through a repo-root
  open-directory handoff with a narrow directory-list renderer, and
  path-handoff `preview` widgets are now backend-owned and rendered as bounded
  text/hex file previews with a small CSV/TSV table renderer. `editor` and
  `web` remain planned
- frontend linting now has an active ESLint gate for `frontend/src` and
  `frontend/vite.config.ts`, followed by `tsc --noEmit`; Biome is not part of
  the current toolchain

## Intentionally incomplete for now

- full TideTerm / Wave Terminal feature parity
- broad builder / proxy / preview-zoo surfaces
- broad settings universe
- advanced SSH auth / topology (proxy jump, richer auth negotiation)
- managed attachment browser/history closure is still narrower than the rest
  of the AI flow; the active path has backend-stored recent references plus
  transcript reuse, but not a broader gallery-style surface yet
- broad online plugin marketplace / discovery UX; ADR 0030 keeps only the
  narrower backend-owned local catalog/import direction in scope, and the
  current active shell now intentionally limits install sources to explicit
  `git` URLs and `zip` archives
- Windows-first support

## Partial / rough today

- remote SSH remains a focused daily-driver path (ADR 0019), not a full
  remote controller
- connection lifecycle is explicit but narrow (`saved profile` vs
  `last check` vs `last launch`)
- remote files and preview widgets now preserve SSH connection scope over
  the backend fs contract, but there is still no dedicated editor widget
  or broader remote file-management shell surface beyond the backend-owned
  write contract
- terminal parity is practical and one widget can now host grouped backend
  sessions with visible create/switch/filter/focus/close controls,
  explicit recovery actions, stream auto-reattach, a shell utility-panel
  navigator for cross-widget session focus, and a backend-owned latest-command
  strip with explicit explain/rerun affordances, but there is still no
  dedicated persistent session sidebar or richer tmux/session-manager shell
  beyond those active runtime paths
- AI command flow now supports explicit `/run` grammar plus approved
  terminal-context command planning for narrow natural-language terminal
  requests, but it is still not broad provider-native tool execution
- backend AI routing is intentionally narrow, not broad: the active provider kinds are local Codex CLI, local Claude Code CLI, and one explicit OpenAI-compatible HTTP source kind; the provider-gateway surface now owns both recent run telemetry and runtime route readiness/probe state, but `ollama`, broad proxy routing, and wider API-key/provider universes are still not active runtime paths
- TideTerm-style WaveProxy is not part of the active product direction;
  see `docs/workflow/tideterm-residual-decisions.md`
- backend AI conversations are now persisted as explicit DB-backed threads with per-conversation CLI session continuity and persisted per-conversation request-context selection (`widget_context_enabled` plus explicit `widget_ids`), and the shell navigator now supports server-backed scope/query filtering plus active-thread rename/archive/restore/delete while preserving the current archive-management filter state across row actions; conversation management is still intentionally narrow in one important way: there is still no multi-panel conversation UX
- CLI provider execution is chat-focused and does not yet integrate provider-native tool calls with `core/toolruntime` approval/audit; the shared conversation SSE route now streams CLI text/reasoning/tool-call parts plus HTTP text deltas, but OpenAI-compatible provider-native reasoning/tool-call detail remains intentionally narrower
- the AI composer now exposes a request-scoped `Cancel response` control for active chat streams, but there is still no separate durable backend job cancellation queue for already-detached provider work
- the shell-wide settings modal now exposes a structured `General / AI / Terminal / Remote / MCP / Commander` navigation; `General` includes the real desktop `watcher_mode` lifecycle control plus runtime bootstrap context, the AI section now includes CLI + OpenAI-compatible provider management and provider-backed model discovery, `Remote` lists saved SSH profiles and triggers the narrow `.ssh/config` import route, `MCP` now also exposes a bounded onboarding catalog plus draft probe before explicit register/start over `/api/v1/mcp/*`, the composer toolbar exposes live provider/model, profile/role/mode, and widget-context selection, and terminal font size, line height, theme mode, scrollback, plus cursor behavior are now backed by the runtime DB through `GET/PUT /api/v1/settings/terminal`
- the active shell now also has a runtime-backed language switch over
  `GET/PUT /api/v1/settings/locale` with `ru`, `en`, `zh-CN`, and `es`,
  but this is still a narrow localization slice: the settings shell frame
  and `General` runtime copy are translated while deeper subsections and
  broader widget surfaces are not yet fully localized
- the AI composer keyboard-submit preference is now configurable through the runtime-backed `GET/PUT /api/v1/settings/agent` contract and persists in `runtime.db`, but broader operator-profile sync/roaming beyond the local runtime is still intentionally incomplete
- plugin access-policy metadata is now persisted in the local catalog
  (`owner_username`, `visibility`, `allowed_users`) together with
  current-user actor provenance, but those fields are not enforced yet;
  this phase only reserves the model/runtime shape for later rights work
- desktop runtime startup, shutdown, and single-instance attach path are now hardened: `npm run tauri:dev` recovers stale watcher attachments, can now also reuse a still-running watcher on `127.0.0.1:7788` when runtime metadata lost either the watcher record or the core record but the live watcher still targets the same core, refuses startup with an explicit conflict error when that fixed watcher port is already serving a different backend or is simply occupied by a non-`rterm` service, startup failures no longer leak a freshly spawned backend or a freshly spawned watcher that later fails identity/state validation, sending `SIGTERM` to `rterm-desktop` now tears down the desktop-owned backend and watcher before exit, and a second desktop launch now reuses the existing window instead of spawning a second desktop-owned core/watcher pair; broader desktop runtime hardening (richer crash recovery, port-policy cleanup) is still intentionally incomplete
- desktop runtime metadata writes are now also durable against torn-file startup races: the desktop shell writes both `~/.rterm/runtime.json` and `~/.rterm/settings.json` through an atomic temp-file rename path, and startup now also quarantines malformed runtime/settings payloads beside the live files instead of silently reusing defaults while discarding the broken bytes; broader crash-recovery policy is still intentionally incomplete
- desktop startup now also clears malformed or dead attachment metadata out of `~/.rterm/runtime.json` instead of only ignoring it in memory, so repeated launches no longer keep retrying against the same broken persisted desktop attachment records
- native-window automation coverage is still limited; validation now
  includes an isolated desktop runtime smoke (`npm run validate:desktop-runtime`)
  plus build/runtime/API checks, but it does not yet claim full native UI
  automation across the desktop shell

## Infrastructure gaps

- `.github/workflows/ci.yml` now defines frontend, Go, desktop-check and
  secret-scan jobs, but the hosted GitHub Actions run is not verified until
  the branch is pushed
- Tauri shell now has an explicit local-runtime CSP instead of `csp: null`,
  but this slice only validates config/build checks and does not claim a fresh
  interactive desktop launch smoke
- the active terminal SSE frontend path uses bearer-header auth; query-token
  auth remains available only as the constrained ADR 0018 fallback for
  consumers that cannot send headers

## Current stance

These limitations are acceptable in the current pre-release phase when:

- core daily-driver flows (launch, local terminal, policy/approval)
  stay stable and honest
- failure modes are surfaced, not hidden
- docs and validation accurately describe the limits

They are **not** acceptable if used to hide regressions in launch,
shell, policy enforcement, approvals or audit.
