# TideTerm Clone Status Matrix

Date: `2026-04-27`

This document is a grouped migration snapshot for the historically
tracked TideTerm feature inventory. It is not a release gate and does
not override the repository-first product boundary for `rterm`.

Primary inputs:

- [parity-matrix.md](./parity-matrix.md)
- [gap-summary.md](./gap-summary.md)
- [history/tideterm-feature-inventory.md](./history/tideterm-feature-inventory.md)
- [../validation/agent.md](../validation/agent.md)
- [../validation/remote.md](../validation/remote.md)
- [../validation/mcp.md](../validation/mcp.md)
- [../workflow/known-limitations.md](../workflow/known-limitations.md)

Status legend:

- `Transferred` — user-visible behavior is present on the active `rterm` path.
- `Partially transferred` — the core path exists, but breadth, UX density,
  or supporting subflows are still narrower than TideTerm.
- `Planned` — a repository-local decision now exists and the remaining work
  is queued as an implementation phase instead of a vague blocker.
- `Exceeds original` — the TideTerm baseline is covered, and the current
  `rterm` path is already stricter or more capable in ways that matter to
  runtime correctness.
- `Not carried forward` — the old TideTerm surface was reviewed and is not
  part of the active `rterm` product direction.

Summary by grouped slices:

- `Exceeds original`: `4`
- `Transferred`: `14`
- `Partially transferred`: `1`
- `Planned`: `0`
- `Not carried forward`: `2`

## Matrix

| Slice | Status | Current `rterm` state | Remaining gap or reason |
| --- | --- | --- | --- |
| Terminal core path | `Transferred` | Active path covers input, PTY output streaming, scrollback hydration, interrupt, copy/paste shortcuts, jump-to-latest recovery, drag/drop path insertion, and open-current-directory into a files block. | Remote files blocks are still narrower than the old TideTerm fileshare surface, but the core terminal behavior is already on the active runtime path. |
| Workspace tabs and layout | `Transferred` | Active path covers create/close/rename/pin/reorder tabs, split add/move/swap, layout presets, restore semantics, and explicit empty-state recovery after closing the last tab. | This is now a backend-owned workspace model rather than a direct copy of TideTerm's older block grammar. |
| Launcher, files, tools, audit operator chain | `Transferred` | Workspace switcher, launcher entry, files panel navigation, tools inputs, audit traceability, and explicit cross-surface operator handoff are all live on the current shell. | Remaining work here is mostly visual compaction, not missing runtime behavior. |
| AI conversations, provider routing, and request context | `Exceeds original` | `rterm` now has DB-backed conversation threads, create/switch/rename/archive/restore/delete lifecycle, scoped search/filter views, conversation-scoped provider continuity, persisted widget context, stale-context repair, and explicit selected-context chips. | TideTerm had the baseline conversation surface; the current `rterm` shell is already stronger in thread lifecycle and context integrity. |
| Structured `/run`, approvals, explain, and target guardrails | `Exceeds original` | Explicit `/run` grammar, approval confirm/retry, execution blocks, explain linkage, audit provenance, and target-session/local-vs-remote guardrails are live and validated. | This area is already stricter than TideTerm because execution identity and retry safety are backend-owned and mismatch-safe. |
| Streaming AI responses and cancellation | `Transferred` | The shared conversation SSE route now carries backend-owned `stream_id` cancellation, Codex CLI `--json` token/reasoning/tool-call stream parts, Claude Code `stream-json` partials, and OpenAI-compatible HTTP text deltas through one frontend contract. | OpenAI-compatible HTTP remains narrower than the CLI-backed contract for provider-native reasoning/tool-call detail, but the active `rterm` streaming/cancel transport is now transferred. |
| File attachments into AI | `Transferred` | Files panel handoff, backend attachment reference storage, composer-side queued chips, recent attachment library reuse/delete, and transcript attachment reuse are all live on the active AI path and browser-validated. | Richer gallery-style browsing could still be added later, but the functional attachment lifecycle itself is now transferred. |
| Settings, help, trust, and secret-shield utility shell | `Transferred` | Active settings now expose overview plus real `AI / Terminal / Remote / MCP / Commander` sections, trusted tools, secret shielding, help entry points, compact shell framing, and browser-validated `Remote` / `MCP` inventory filtering flows. | Later breadth belongs to the `Remote SSH profile lifecycle` and `External MCP onboarding breadth` rows rather than to the shell container itself. |
| Remote SSH profile lifecycle | `Transferred` | `rterm` now covers saved profile create/edit/delete/list, preflight check, normalized auth/launch diagnostics, default-target selection, stale launch-state reset on material profile edits, and open-shell actions on the active SSH path. | Broader remote-controller/session-topology work now lives in `Advanced remote breadth` instead of keeping the base SSH lifecycle partially tracked forever. |
| `.ssh/config` import | `Transferred` | One-way import now supports direct `Host` / `HostName` / `User` / `Port` / `IdentityFile` profile fields, `Include`, wildcard-host defaults, and `Match host/originalhost` when deriving concrete saved profiles. | Broader SSH controller features like `ProxyJump`, richer `Match`, and two-way sync are tracked as later remote-breadth work rather than as missing baseline import behavior. |
| Advanced remote breadth: session groups, tmux resume, richer SSH topology, `wsh` replacement | `Transferred` | The terminal runtime now supports grouped sessions inside one widget with explicit active-session switching plus a filterable grouped-session browser, saved SSH profiles can opt into tmux-backed resume through the same backend-owned SSH launch path, and the `Remote` settings shell now exposes a tmux manager for discovery, named-session open/load flows, and direct resume into the active workspace. Historical `wsh`-style helper behavior is intentionally replaced here by explicit runtime-backed workspace/terminal actions rather than by reviving a separate helper stack. | WSL remains explicitly optional by ADR 0028 and only reopens if platform scope broadens beyond the current non-Windows-first product phase. |
| Remote fileshare surfaces | `Transferred` | The active shell now opens SSH-scoped files and preview widgets through a connection-aware backend fs contract, and preview handoff no longer forces a local-only stat check before mounting a remote path. Remote list/read/file/write/open flows all accept explicit `connection_id` over the active API path. | There is still no dedicated editor widget on the active shell, but the remote fileshare surfaces themselves are no longer local-only. |
| MCP lifecycle, invoke, and normalized outputs | `Exceeds original` | Active settings can list/register/get/edit/delete/start/stop/restart/enable/disable MCP servers; invoke is explicit; downstream data is bounded through `mcp.normalized.v1`. | This already goes beyond the original manager surface because `rterm` keeps lifecycle strict, output bounded, and AI handoff explicit instead of implicit. |
| External MCP onboarding breadth | `Transferred` | The active settings shell now exposes a bounded onboarding catalog, template-driven endpoint/auth prefills, draft probe before register, and explicit remote MCP registration/lifecycle over the same backend contract. | The curated catalog intentionally stays narrower than a marketplace-style discovery surface, but onboarding no longer depends on low-level raw field entry alone. |
| Plugin runtime boundary | `Exceeds original` | Side-process plugin runtime, manifest handshake, exposed-tool checks, capability allow-lists, normalized failure taxonomy, and core-owned policy/audit invariants are all live, with Go and Python reference plugins validated. | The core/plugin boundary is already stricter than the old baseline and is no longer frontend-coupled. |
| Plugin catalog and install UX | `Transferred` | The active settings shell now exposes a backend-owned local plugin catalog with explicit install sources limited to `git` repository URLs and `zip` archive URLs, plus enable/disable/update/remove lifecycle controls. Install records persist metadata, current-user actor provenance, and a future-facing access-policy shape before activation, while runtime registration still goes through the existing plugin boundary and policy/audit path. | Access-policy fields are persisted for future rights enforcement but are not enforced yet; broad online marketplace/discovery remains intentionally out of scope. |
| Online plugin marketplace | `Not carried forward` | The current plugin trust model is explicit local-code execution with runtime checks, not a sandboxed marketplace surface. | ADR 0030 explicitly declines a broad online marketplace in this phase. |
| Shell chrome and terminal advanced affordances | `Transferred` | The shell is now compact and Tide-recognizable, settings/terminal/right-rail/modal chrome has been tightened and browser-validated, terminal search is live with count/no-match state, one terminal widget can now host multiple backend-owned sessions with visible create/switch controls, a filterable grouped-session browser with per-session close/focus actions, and remote settings can open/resume SSH-backed tmux shells into the active workspace. | Remaining remote tmux/session breadth is tracked in `Advanced remote breadth`, not in shell/terminal chrome parity. |
| Window title rules | `Transferred` | The active shell now exposes a narrow runtime-backed window-title rule surface: backend settings persist `auto/custom` mode plus explicit custom title state, `General` settings can pin or reset that state, and the live shell updates `document.title` from the active workspace in auto mode or from the operator-defined custom title in custom mode. | This intentionally stops short of reviving the old compat-only title manager; the modern active path keeps the scope to auto-follow plus explicit rename only. |
| Language switch surface | `Partially transferred` | The active `General` settings path now exposes a runtime-backed language preference with immediate switching across `ru`, `en`, `zh-CN`, and `es`, and the active settings shell framing plus general/runtime copy follow that single persisted locale instead of browser-local state. | This is still a narrow localization slice, not a whole-app translation program: deeper settings subsections and broader widget surfaces remain partly untranslated on the active frontend path. |
| WaveProxy | `Not carried forward` | The active extension path is explicit CLI providers, one narrow OpenAI-compatible HTTP source, MCP, and plugins. | [tideterm-residual-decisions.md](../workflow/tideterm-residual-decisions.md) explicitly retires TideTerm-style WaveProxy semantics from the current clone scope. |

## Notes on interpretation

- The old vague `Blocked` bucket has been replaced with either `Planned`
  or `Not carried forward`.
- Several slices marked `Partially transferred` already have stronger core
  correctness than TideTerm, but still remain visually or functionally
  narrower in breadth.
- The most meaningful "already better than TideTerm" areas today are:
  conversation lifecycle, structured execution safety, MCP normalization,
  and plugin process boundaries.
