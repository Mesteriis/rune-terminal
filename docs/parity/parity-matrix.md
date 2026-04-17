# Parity Matrix

Date: `2026-04-17`
Phase: `1.0.0-rc1` hardening

This is the canonical parity source of truth for release tracking.

Status values:
- `FULL`
- `PARTIAL`
- `MISSING`

| Feature | Domain | Reference behavior | Current behavior | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Terminal input path | terminal | TideTerm sends keystrokes/commands to active terminal session | Active compat terminal sends input through backend terminal API path | FULL | Validated in active runtime and UI slices |
| Terminal stream output | terminal | Terminal surface receives live PTY output stream | Snapshot + SSE stream path is active on compat terminal | FULL | Streaming contract and runtime validations exist |
| Scrollback hydration on mount | terminal | Terminal restores buffered output before live follow | Snapshot hydration exists before stream attach | PARTIAL | Hydration works; deeper term parity still open |
| Interrupt active session | terminal | Explicit interrupt action on active session | `term.interrupt` runtime path exists and is wired in UI | FULL | Runtime/API validation is documented |
| Copy/paste keyboard shortcuts | terminal | Shell-like terminal copy/paste shortcuts | Shortcut handling exists on compat path | PARTIAL | Still carries legacy handler shape in places |
| Jump-to-latest control | terminal | Visible follow-output/jump affordance | Follow behavior exists; full TideTerm-like visible control parity not fully proven | PARTIAL | Tracked in historical parity notes |
| Drag/drop path insertion | terminal | Drag file/path into terminal command flow | Local drop behavior exists | PARTIAL | Full remote file-block parity not confirmed |
| Open current directory in new block | terminal | Open current terminal directory into new block flow | No active compat parity path | MISSING | Listed as missing in prior parity inventory |
| Multi-session terminal block | terminal | Multiple sessions inside one terminal block | Active compat path remains single-session-per-widget | MISSING | Out of current release scope |
| Tab lifecycle controls | workspace/layout | Compact tab controls: create/close/rename/pin/reorder | Tab lifecycle actions exist and are backend-backed | FULL | Includes pin/unpin, rename, reorder inside group |
| Split layout add/move/swap | workspace/layout | Window splits, explicit drop zones, center swap | Add-split, directional move, outer zones, center swap implemented | FULL | Window parity validations are present |
| Layout presets | workspace/layout | Save/switch layout presets without session identity drift | Layout save/switch exists with backend snapshot fields | FULL | Mode/surface/focus composition is persisted |
| Workspace restore semantics | workspace/layout | Restore tabs/widgets/layout truth on restart | Snapshot persistence/restore is active | FULL | Session lifecycle caveats tracked separately |
| Last-tab closure parity | workspace/layout | User can close all tabs when desired | Last tab cannot be closed | PARTIAL | Intentional current implementation guard |
| Explicit `/run` grammar | structured execution | Explicit command grammar path from AI panel | `/run` and `run:` paths execute via tool runtime | FULL | Canonical execution path is in place |
| Approval confirm/retry integrity | structured execution | Approval-required execution uses explicit confirm + intent-safe retry | `safety.confirm` + intent-bound approval token path is active | FULL | Mismatch retries rejected (`approval_mismatch`) |
| Execution block record | structured execution | Structured command/result unit with provenance | Execution blocks and provenance IDs are available | FULL | Backend block APIs and explain linkage exist |
| Explain from execution block | structured execution | Explain action tied to command result/provenance | Explain route supports block identity and provenance fields | FULL | Identity mismatch checks exist |
| Target-session guardrails | structured execution | Prevent accidental local/remote target confusion | Context carries target session/connection fields with mismatch guarding | PARTIAL | Guard-level verified; broader remote parity pending |
| Workspace switcher behavior | navigation | Recognizable workspace switcher navigation grammar | Switcher exists, currently narrow single-workspace shape | PARTIAL | Functional but reduced breadth |
| Launcher discoverability | navigation | Launcher/search entry for common actions | Launcher section and utility flyouts exist | PARTIAL | Placement and shell parity still being hardened |
| Files panel navigation | navigation | File browsing in workspace context | Files panel supports bounded list/preview and selection | FULL | Backend-root-bounded read/list contracts are active |
| Files-to-AI explicit handoff | navigation | Explicit selected-path/file attachment into AI flow | Attach-to-AI and insert-path actions exist | FULL | No auto-send; user action required |
| Files-to-`/run` explicit handoff | navigation | Explicit selected-path insertion for run flow | `Use Selected Path In /run Prompt` exists | FULL | Operator review/edit remains explicit |
| AI panel baseline surface | panels | Left panel chat surface with mode/context controls | TideTerm-shaped AI panel + mode strip + merged transcript exists | PARTIAL | Shell balance/styling parity still partial |
| Tools panel execution helpers | panels | Explicit tool execution inputs and run controls | `Use Selected File Path` and `Use Active Widget` helpers exist | FULL | Execute remains explicit click |
| Audit panel traceability | panels | Visible operation history with execution provenance | Audit surface shows execution/approval/explain events | FULL | Backend audit is source of truth |
| Settings utility surfaces | panels | Utility settings/help/trust/secret shield surfaces | Overview + trusted tools + secret shield + help are available | PARTIAL | Scope intentionally reduced vs TideTerm breadth |
| Connection catalog model | remote | Explicit local + SSH connection inventory | Local + saved SSH profiles + active default target exist | FULL | Backend-owned catalog model is active |
| SSH profile workflow | remote | Save/check/select/open-shell profile actions | Profile save/list/select/check/open-shell actions exist | PARTIAL | Daily-driver narrow path validated; breadth limited |
| Connection lifecycle signals | remote | Distinct profile/preflight/launch usability semantics | `check_status`, `launch_status`, `usability` are surfaced | FULL | Explicitly split to avoid fake connected state |
| `.ssh/config` import | remote | Import host profiles from local SSH config | Not implemented | MISSING | Explicit non-goal in release scope |
| Advanced SSH auth/topology | remote | ProxyJump/richer auth/keychain workflows | Not implemented | MISSING | Post-`1.0.0` target |
| MCP server lifecycle controls | MCP | Register/list/start/stop/restart/enable/disable MCP servers | Lifecycle control surface exists for registered servers | PARTIAL | External onboarding still narrow |
| MCP explicit invocation | MCP | Explicit invoke call per server/tool | Invoke API and UI controls exist | FULL | No implicit invocation path |
| MCP output normalization | MCP | Bounded normalized MCP payload for downstream usage | `mcp.normalized.v1` bounded output path is active | FULL | Truncation and bounds behavior documented |
| MCP-to-AI auto injection | MCP | (Reference) optional implicit linkage in richer systems | No automatic injection; explicit action only | FULL | Intentional contract choice for this release |
| External MCP onboarding breadth | MCP | Straightforward setup of real external MCP providers | Limited and still rough | PARTIAL | Validation shows narrow real-world setup path |
| Plugin process boundary | plugins | Separate runtime process with explicit handshake contract | Side-process protocol with manifest checks is in place | FULL | Frontend remains decoupled from plugin process |
| Plugin failure taxonomy | plugins | Explicit classification of runtime/plugin failures | Failure codes are normalized and surfaced | FULL | Includes launch/handshake/timeout/crash/malformed cases |
| Plugin policy/audit invariants | plugins | Plugin execution still gated by core policy and audit | Approval and audit remain core-owned | FULL | Boundary verification documents this |
| Plugin ecosystem/discovery | plugins | Install/discover/manage broader plugin ecosystem | Not implemented | MISSING | Explicit non-goal for `1.0.0-rc1` |
| Quick actions metadata workflow | workflow | Explicit action catalog with context requirements | Quick actions API/UI metadata and gating are present | FULL | Headed browser validation exists |
| Operator cross-surface chain | workflow | Files -> AI/`/run`, tools, audit, explain chain | Chain is implemented with explicit handoffs | FULL | Operator workflow validation exists |
| Release validation gates | workflow | Executable release gates with truthful pass/fail state | `npm run validate` + `npm run tauri:dev` smoke are documented gates | FULL | Full-lint debt is tracked separately |
| Shell chrome parity | UX | Compact TideTerm-recognizable top shell density and hierarchy | Improved but still not fully matched | PARTIAL | UX parity remains active hardening area |
| Terminal advanced affordances | UX | Multi-session sidebar + deep find/search UI | Not present on active compat path | MISSING | Explicitly out of current release scope |
| Attachment management UX breadth | UX | Managed attachment storage/import/gallery-style UX | Basic local references exist, broad UX not present | PARTIAL | Expanded attachment UX remains post-1.0 |
| Streaming AI responses | UX | Streamed assistant responses in panel | Not implemented in current release path | MISSING | Listed in known limitations |
