# Operator Workflow Result

Date: `2026-04-16`  
Phase: `1.0.0-rc1` release hardening

## 1. Handoffs that exist now

- `Files` -> AI context: `Attach Selected File To AI Context` creates explicit attachment reference and attaches it to composer state.
- `Files` -> AI prompt: `Use Selected Path In AI Prompt` inserts the selected path into the AI composer without sending.
- `Files` -> `/run` prompt: `Use Selected Path In /run Prompt` prepares explicit `/run` input with selected path and requires operator review/send.
- Terminal -> explain: compat terminal now provides `Explain Latest Output In AI`, which calls explain route using latest widget command resolved from audit truth.
- `Tools` <- current selection: tools panel now exposes explicit input helpers:
  - `Use Selected File Path` for tools with `path`/`paths` input fields.
  - `Use Active Widget` for tools with `widget_id` input fields.
- `Tools` -> audit: executed tools remain visible in audit surface with backend-owned event truth.
- MCP invoke stays explicit in `Tools` and remains bounded/non-auto-injected.

## 2. What remains manual

- Operator still chooses the exact command semantics for file-path-driven `/run` prompts before execution.
- Tool execution still requires explicit operator click after any input patching helper.
- Terminal explain is explicit and per-action; there is no background explain stream.
- Cross-panel navigation remains user-driven (no auto-opening/repositioning of every related panel).

## 3. Intentionally unsupported

- No hidden automatic context injection into AI/tool/runtime calls.
- No full workflow automation engine across terminal/files/tools/MCP/remote.
- No broad shell redesign or IDE-style orchestration layer.
- No implicit MCP-to-agent context piping.

## 4. Remaining friction points

- Terminal explain action currently depends on latest `term.send_input` audit lineage for command identity; direct terminal typing outside that path is not auto-lifted as explain intent.
- File-to-`/run` helper uses a conservative command skeleton and still expects operator adjustment for non-text workflows.
- Remote-target confidence in this batch is guard-level for mismatch rejection; full reachable-host remote sweep remains a separate validation domain.
