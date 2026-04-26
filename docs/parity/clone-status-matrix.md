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
- `Blocked` — not just "not done": this area currently needs a new
  runtime/domain slice, or is explicitly outside the active product
  boundary.
- `Exceeds original` — the TideTerm baseline is covered, and the current
  `rterm` path is already stricter or more capable in ways that matter to
  runtime correctness.

Summary by grouped slices:

- `Exceeds original`: `4`
- `Transferred`: `3`
- `Partially transferred`: `7`
- `Blocked`: `4`

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
| Settings, help, trust, and secret-shield utility shell | `Partially transferred` | Active settings now expose overview plus real `AI / Terminal / Remote / MCP / Commander` sections, trusted tools, secret shielding, and help entry points. | The shell is still lighter than TideTerm in overlay density, framing, and whole-surface polish. |
| Remote SSH profile lifecycle | `Partially transferred` | `rterm` supports saved profile create/edit/delete/list, preflight check, default-target selection, and open-shell actions from the active settings shell. | Daily-driver breadth is improved, but the slice is still intentionally narrower than TideTerm's broader remote controller surface. |
| `.ssh/config` import | `Partially transferred` | There is a narrow one-way import for direct `Host` / `HostName` / `User` / `Port` / `IdentityFile` profile fields. | `Match`, `Include`, wildcard expansion, proxy chaining, keychain/passphrase workflows, and reverse sync are still absent. |
| Advanced remote breadth: tmux resume, WSL, richer auth/topology, `wsh` helper stack | `Blocked` | The active remote model is intentionally `local + ssh` with explicit profile launch semantics. | TideTerm's tmux manager, WSL path, richer auth/proxy topology, and `wsh` helper/CLI stack need a different remote domain/runtime breadth that is outside the current product boundary. |
| Remote fileshare surfaces | `Blocked` | The active shell can preserve remote path/context when opening files blocks from terminal context, but it does not implement TideTerm-style remote fileshare widgets. | TideTerm's remote file browsing and preview/edit stack is not present in the new core and would require a dedicated remote-files domain slice. |
| MCP lifecycle, invoke, and normalized outputs | `Exceeds original` | Active settings can list/register/get/edit/delete/start/stop/restart/enable/disable MCP servers; invoke is explicit; downstream data is bounded through `mcp.normalized.v1`. | This already goes beyond the original manager surface because `rterm` keeps lifecycle strict, output bounded, and AI handoff explicit instead of implicit. |
| External MCP onboarding breadth | `Partially transferred` | Real remote MCP endpoint registration with optional headers is live in settings and validated end-to-end. | Broad discovery, catalog, and import workflows for third-party MCP providers are still intentionally narrow. |
| Plugin runtime boundary | `Exceeds original` | Side-process plugin runtime, manifest handshake, exposed-tool checks, capability allow-lists, normalized failure taxonomy, and core-owned policy/audit invariants are all live, with Go and Python reference plugins validated. | The core/plugin boundary is already stricter than the old baseline and is no longer frontend-coupled. |
| Plugin discovery and marketplace UX | `Blocked` | Local reference plugins are supported and validated. | Broader install/discover/manage marketplace behavior is still explicitly out of scope for this phase. |
| Shell chrome and terminal advanced affordances | `Partially transferred` | The shell is now compact and Tide-recognizable, terminal search is live with count/no-match state, and pane/header chrome has been tightened. | Remaining gaps are visual density, status-badge weight, whole-window composition, and the missing multi-session terminal sidebar. |
| Tide-specific misc surfaces: language switch, window title manager, WaveProxy | `Blocked` | These old TideTerm surfaces are not part of the active `rterm` product path. | They either rely on legacy UI residue or on product directions that the current roadmap explicitly does not reopen. |

## Notes on interpretation

- `Blocked` here does not mean "impossible". It means "not reachable by
  continuing the current narrow slices without opening a new product/domain
  decision".
- Several slices marked `Partially transferred` already have stronger core
  correctness than TideTerm, but still remain visually or functionally
  narrower in breadth.
- The most meaningful "already better than TideTerm" areas today are:
  conversation lifecycle, structured execution safety, MCP normalization,
  and plugin process boundaries.
