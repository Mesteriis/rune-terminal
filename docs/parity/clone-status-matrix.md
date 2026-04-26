# TideTerm Clone Status Matrix

Date: `2026-04-26`

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
- `Transferred`: `4`
- `Partially transferred`: `6`
- `Planned`: `4`
- `Not carried forward`: `3`

## Matrix

| Slice | Status | Current `rterm` state | Remaining gap or reason |
| --- | --- | --- | --- |
| Terminal core path | `Transferred` | Active path covers input, PTY output streaming, scrollback hydration, interrupt, copy/paste shortcuts, jump-to-latest recovery, drag/drop path insertion, and open-current-directory into a files block. | Remote files blocks are still narrower than the old TideTerm fileshare surface, but the core terminal behavior is already on the active runtime path. |
| Workspace tabs and layout | `Transferred` | Active path covers create/close/rename/pin/reorder tabs, split add/move/swap, layout presets, restore semantics, and explicit empty-state recovery after closing the last tab. | This is now a backend-owned workspace model rather than a direct copy of TideTerm's older block grammar. |
| Launcher, files, tools, audit operator chain | `Transferred` | Workspace switcher, launcher entry, files panel navigation, tools inputs, audit traceability, and explicit cross-surface operator handoff are all live on the current shell. | Remaining work here is mostly visual compaction, not missing runtime behavior. |
| AI conversations, provider routing, and request context | `Exceeds original` | `rterm` now has DB-backed conversation threads, create/switch/rename/archive/restore/delete lifecycle, scoped search/filter views, conversation-scoped provider continuity, persisted widget context, stale-context repair, and explicit selected-context chips. | TideTerm had the baseline conversation surface; the current `rterm` shell is already stronger in thread lifecycle and context integrity. |
| Structured `/run`, approvals, explain, and target guardrails | `Exceeds original` | Explicit `/run` grammar, approval confirm/retry, execution blocks, explain linkage, audit provenance, and target-session/local-vs-remote guardrails are live and validated. | This area is already stricter than TideTerm because execution identity and retry safety are backend-owned and mismatch-safe. |
| Streaming AI responses and cancellation | `Partially transferred` | SSE conversation streaming is live, the composer can cancel in-flight streams, and OpenAI-compatible HTTP sources forward text deltas. | CLI providers still emit buffered deltas; reasoning/tool-call stream parts and durable backend-side cancellation are not complete yet. |
| File attachments into AI | `Partially transferred` | Files panel can queue backend-issued attachment references into the AI composer, remove them before submit, and render persisted attachment chips in transcript history. | There is still no managed attachment library, gallery/history UI, or broader storage/import flow. |
| Settings, help, trust, and secret-shield utility shell | `Transferred` | Active settings now expose overview plus real `AI / Terminal / Remote / MCP / Commander` sections, trusted tools, secret shielding, help entry points, compact shell framing, and browser-validated `Remote` / `MCP` inventory filtering flows. | Later breadth belongs to the `Remote SSH profile lifecycle` and `External MCP onboarding breadth` rows rather than to the shell container itself. |
| Remote SSH profile lifecycle | `Partially transferred` | `rterm` supports saved profile create/edit/delete/list, preflight check, default-target selection, and open-shell actions from the active settings shell. | Daily-driver breadth is improved, but the slice is still intentionally narrower than TideTerm's broader remote controller surface. |
| `.ssh/config` import | `Partially transferred` | There is a narrow one-way import for direct `Host` / `HostName` / `User` / `Port` / `IdentityFile` profile fields. | `Match`, `Include`, wildcard expansion, proxy chaining, keychain/passphrase workflows, and reverse sync are still absent. |
| Advanced remote breadth: session groups, tmux resume, richer SSH topology, `wsh` replacement | `Planned` | The current remote foundation stays `local + ssh`, with saved profiles and explicit session launch semantics. ADR 0028 records remote breadth v2 as a later extension of that same backend-owned model. | Multi-session terminal groups, tmux resume/session management, and richer auth/topology move to Phases `4-5`; WSL is explicitly optional and only reopens with broader platform scope. |
| Remote fileshare surfaces | `Planned` | The active shell can preserve remote path/context when opening files blocks from terminal state, but the files/preview/edit path remains local-first today. ADR 0029 records a dedicated remote files domain instead of reviving TideTerm fileshare residue. | Connection-aware list/read/stat/write contracts plus remote files widgets move to Phase `6`. |
| MCP lifecycle, invoke, and normalized outputs | `Exceeds original` | Active settings can list/register/get/edit/delete/start/stop/restart/enable/disable MCP servers; invoke is explicit; downstream data is bounded through `mcp.normalized.v1`. | This already goes beyond the original manager surface because `rterm` keeps lifecycle strict, output bounded, and AI handoff explicit instead of implicit. |
| External MCP onboarding breadth | `Partially transferred` | Real remote MCP endpoint registration with optional headers is live in settings and validated end-to-end. | Broad discovery, catalog, and import workflows for third-party MCP providers are still intentionally narrow. |
| Plugin runtime boundary | `Exceeds original` | Side-process plugin runtime, manifest handshake, exposed-tool checks, capability allow-lists, normalized failure taxonomy, and core-owned policy/audit invariants are all live, with Go and Python reference plugins validated. | The core/plugin boundary is already stricter than the old baseline and is no longer frontend-coupled. |
| Plugin catalog and install UX | `Planned` | Local reference plugins are supported and validated, and ADR 0030 now defines the next step as backend-owned local catalog/import/install flows rather than hard-coded references forever. | Catalog/import/install management moves to Phase `8`. |
| Online plugin marketplace | `Not carried forward` | The current plugin trust model is explicit local-code execution with runtime checks, not a sandboxed marketplace surface. | ADR 0030 explicitly declines a broad online marketplace in this phase. |
| Shell chrome and terminal advanced affordances | `Partially transferred` | The shell is now compact and Tide-recognizable, settings/terminal/right-rail/modal chrome has been tightened and browser-validated, and terminal search is live with count/no-match state. | The remaining gap is the missing multi-session terminal sidebar/session-browsing model rather than shell-density mismatch. |
| Window title rules | `Planned` | A narrow runtime-backed title surface still fits the active shell, but the old compat-only title manager is not the implementation path. | [tideterm-residual-decisions.md](../workflow/tideterm-residual-decisions.md) keeps this in scope for a later narrow slice (`Phase 9`). |
| Language switch surface | `Not carried forward` | The old TideTerm language toggle lives in legacy UI residue and is not part of the active frontend rewrite. | It reopens only if the active product takes on a real localization program. |
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
