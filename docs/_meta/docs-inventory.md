# Docs inventory

Date: `2026-04-20`
Phase: pre-release

This is a compact inventory of the **active** documentation tree. Files
under any `history/` sub-folder are considered archival and are not
listed here — see the corresponding domain folder if you need them.

The previous, much larger inventory (when the cleanup was still in
progress) is preserved at
[`history/docs-inventory-2026-04-17.md`](./history/docs-inventory-2026-04-17.md).

## Root

| Path | Purpose |
| --- | --- |
| `docs/README.md` | Docs entry point and canonical quick links |

## Architecture

| Path | Purpose |
| --- | --- |
| `docs/architecture/system.md` | System-level architecture overview |
| `docs/architecture/architecture.md` | Long-form architecture write-up (pre-rewrite language — still accurate on principles) |
| `docs/architecture/domain-model.md` | Workspace / terminal / tool domain model |
| `docs/architecture/terminal-architecture.md` | Terminal subsystem detail |
| `docs/architecture/tool-runtime.md` | Tool runtime semantics |
| `docs/architecture/policy-model.md` | Policy pipeline + defaults |
| `docs/architecture/execution-contract.md` | Execution contract for tools |
| `docs/architecture/execution-result-message-model.md` | Structured execution result message model |
| `docs/architecture/current-behavior.md` | Snapshot of current observable behavior |
| `docs/architecture/history/layer-system-baseline-2026-04-17.md` | Archived layering baseline (references legacy `frontend/app/workspace/*` shell) |

## ADRs

| Path | Title |
| --- | --- |
| `docs/architecture/adr/0001-rewrite-philosophy-and-architectural-goals.md` | Rewrite philosophy and architectural goals |
| `docs/architecture/adr/0002-tauri-as-desktop-shell.md` | Tauri as desktop shell |
| `docs/architecture/adr/0003-go-first-backend-core.md` | Go-first backend core |
| `docs/architecture/adr/0004-react-typescript-frontend.md` | React + TypeScript frontend |
| `docs/architecture/adr/0005-workspace-model.md` | Workspace model |
| `docs/architecture/adr/0006-terminal-session-model.md` | Terminal session model |
| `docs/architecture/adr/0007-tool-runtime-model.md` | Tool runtime model |
| `docs/architecture/adr/0008-policy-model.md` | Policy model |
| `docs/architecture/adr/0009-trusted-allowlist-model.md` | Trusted allowlist model |
| `docs/architecture/adr/0010-ignore-and-secret-protection-model.md` | Ignore and secret-protection model |
| `docs/architecture/adr/0011-audit-log-model.md` | Audit log model |
| `docs/architecture/adr/0012-transport-between-tauri-frontend-and-go-core.md` | Transport between Tauri, frontend and Go core |
| `docs/architecture/adr/0013-why-not-electron-and-why-not-full-rust-backend.md` | Why not Electron and why not full-Rust backend |
| `docs/architecture/adr/0014-stricter-secret-defaults.md` | Stricter secret defaults |
| `docs/architecture/adr/0015-policy-pipeline-decomposition.md` | Policy pipeline decomposition |
| `docs/architecture/adr/0016-role-mode-and-system-prompt-subsystem.md` | Role, mode and system-prompt subsystem |
| `docs/architecture/adr/0017-modular-tool-registration.md` | Modular tool registration |
| `docs/architecture/adr/0018-sse-query-token-mvp-tradeoff.md` | SSE query-token MVP tradeoff |
| `docs/architecture/adr/0019-remote-ssh-foundation.md` | Remote / SSH foundation |
| `docs/architecture/adr/0020-ai-conversation-backend-foundation.md` | AI conversation backend foundation |
| `docs/architecture/adr/0021-ai-terminal-command-execution-path.md` | AI terminal command execution path |

## Execution

| Path | Purpose |
| --- | --- |
| `docs/execution/execution-model.md` | Execution model (tool runtime consumer view) |

## Workspace

| Path | Purpose |
| --- | --- |
| `docs/workspace/workspace-model.md` | Workspace object model |
| `docs/workspace/window-behavior-reference.md` | Window behavior reference |
| `docs/workspace/window-behavior-gap.md` | Open gaps in window behavior |
| `docs/workspace/window-behavior-validation.md` | Window behavior validation notes |
| `docs/workspace/workspace-navigation-validation-correction.md` | Navigation validation correction |

## Remote

| Path | Purpose |
| --- | --- |
| `docs/remote/remote-model.md` | Remote / SSH model |
| `docs/remote/remote-ssh-config-import.md` | `.ssh/config` import notes |

## MCP

| Path | Purpose |
| --- | --- |
| `docs/mcp/mcp-model.md` | MCP integration model |
| `docs/mcp/mcp-playground-validation.md` | MCP playground validation |

## Plugins

| Path | Purpose |
| --- | --- |
| `docs/plugins/plugin-runtime.md` | Plugin runtime overview |
| `docs/plugins/plugin-runtime-protocol.md` | JSON-line stdio protocol (`rterm.plugin.v1`) |
| `docs/plugins/plugin-execution-model.md` | Plugin execution lifecycle |
| `docs/plugins/plugin-boundary-verification.md` | Plugin boundary verification |

## Workflow

| Path | Purpose |
| --- | --- |
| `docs/workflow/roadmap.md` | Current roadmap (short, pre-release) |
| `docs/workflow/known-limitations.md` | Known limitations, honest gap list |
| `docs/workflow/operator-workflow.md` | Operator-facing workflow |
| `docs/workflow/agent-modes.md` | Agent modes |
| `docs/workflow/system-prompts.md` | System prompt profiles |
| `docs/workflow/quick-actions-browser-validation.md` | Quick-actions browser validation |
| `docs/workflow/release-1.0.md` | Legacy release-1.0 narrative (kept for context, not the current plan) |
| `docs/workflow/release-checklist-1.0.md` | Legacy release-1.0 checklist (kept for context) |

## Parity (historical)

| Path | Purpose |
| --- | --- |
| `docs/parity/parity-matrix.md` | Legacy parity matrix; no longer a source of truth |
| `docs/parity/gap-summary.md` | Legacy gap summary |

## Validation

| Path | Purpose |
| --- | --- |
| `docs/validation/validation.md` | Validation entry point |
| `docs/validation/execution.md` | Execution validation |
| `docs/validation/workspace.md` | Workspace validation |
| `docs/validation/remote.md` | Remote validation |
| `docs/validation/mcp.md` | MCP validation |
| `docs/validation/plugins.md` | Plugins validation |
| `docs/validation/workflow.md` | Workflow validation |
| `docs/validation/structured-execution-browser-validation.md` | Structured execution browser validation |

## Meta

| Path | Purpose |
| --- | --- |
| `docs/_meta/docs-inventory.md` | This file |
| `docs/_meta/docs-structure.md` | Rules for where new docs should live |
