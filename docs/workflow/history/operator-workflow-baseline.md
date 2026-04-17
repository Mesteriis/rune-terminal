# Operator Workflow Baseline

Date: `2026-04-16`  
Phase: `1.0.0-rc1` release hardening

## Current supported flows

### 1. File -> AI

- Operator opens `Files` floating window from the right utility rail.
- Operator browses workspace-root-bounded directories via backend truth (`/api/v1/fs/list`).
- Operator selects a file and can load bounded preview (`/api/v1/fs/read`).
- Operator clicks `Attach Selected File To AI Context`.
- Frontend creates explicit attachment reference (`/api/v1/agent/conversation/attachments/references`) and adds it to AI composer state.
- AI context injection is explicit and user-driven; file selection alone does not inject context.

### 2. File -> /run

- Operator can reveal a file path in `Files` (`Selected path`).
- Operator manually moves to AI panel/composer and types a `/run <command>` that uses that path.
- Runtime command execution goes through explicit tool runtime path (`term.send_input`).

### 3. Terminal -> explain

- Current explain path is coupled to explicit `/run` flow in AI panel.
- `/run` executes first through tool runtime, then explain endpoint is called explicitly (`/api/v1/agent/terminal-commands/explain`).
- There is no dedicated terminal-surface one-click action for explain in the active compat terminal view.

### 4. Tools -> audit

- Operator opens `Tools` floating window and executes a selected tool through `/api/v1/tools/execute`.
- Tool runtime writes audit events.
- Operator opens `Audit` floating window and reviews resulting events (`/api/v1/audit`), including approval chains when applicable.

### 5. MCP -> invoke

- Operator uses MCP section inside `Tools` floating window.
- Operator explicitly chooses server, payload, and optional on-demand start.
- Invoke remains explicit (`/api/v1/mcp/invoke`) and bounded; output remains in tools surface unless operator reuses it manually.

### 6. Remote -> /run

- Active terminal widget remains explicitly bound to local or SSH connection.
- `/run` tool context derives session target from active widget binding (`target_session`, `target_connection_id`) and executes against that widget.
- Backend rejects local/remote target mismatches for terminal input execution.

## Current friction points

- Cross-surface handoff is mostly manual between `Files`, AI composer, and `Tools`.
- No single normalized operator-visible active-context model exists across floating windows.
- Terminal explain is explicit in `/run` path but not explicitly exposed as a terminal-surface handoff action.
- Tool input preparation does not currently provide explicit “use current file/selection” actions.
- File-to-`/run` remains path-copy/manual command composition, which adds repetitive operator steps.

## Duplicated/manual steps

- Repeated manual copy/use of selected file path across files, AI composer, and tool input JSON.
- Repeated re-identification of the current target (active widget / local vs remote) by operator mental model instead of a shared surface summary.
- Manual panel switching to complete common handoffs (`Files` -> AI, `Files` -> `Tools`, terminal output -> AI explanation path).

## Explicitly out of scope for this batch

- Full automation engine across surfaces.
- Hidden/automatic context injection system.
- Broad shell/UI redesign.
