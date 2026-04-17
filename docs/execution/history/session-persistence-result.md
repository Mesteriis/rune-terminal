# Session Persistence / Restore Result

Date: `2026-04-17`  
Status: `implemented and validated`

## 1. What now persists

- backend workspace snapshot (`workspace.json`): workspace id/name, tab order, tab metadata, widget metadata, active tab/widget ids.
- conversation transcript (`conversation.json`).
- audit log (`audit.jsonl`).
- connection + remote profile state (`connections.json`).
- MCP remote registry config (`mcp-registry.json`): registered remote server ids/endpoints/headers and enabled flags.

## 2. What restores as live

- restored local terminal widgets start fresh PTY processes and report `status:"running"` with `restored:true`.
- restored remote widgets with valid connection linkage attempt fresh session start; when start succeeds they run as new live sessions.

## 3. What restores as disconnected/stale

- restored terminal widgets whose prior runtime process is gone and cannot be started (for example missing remote profile linkage) report explicit `status:"disconnected"` with `status_detail`.
- MCP servers restore as configured entries but runtime process state restores as `stopped` (manual start required).

## 4. What remains intentionally non-persistent

- shell process memory/checkpoint state.
- in-memory PTY output ring buffers from previous runtime instance.
- tools panel transient form/input/result buffers.
- audit panel transient UI list state.
- AI composer transient draft text and panel-local ephemeral UI state.
- live MCP process handles.

## 5. Remaining restore friction

- explicit remote restart errors currently surface as generic `internal_failure` transport shape even when the root cause is actionable (`connection not found`).
- disconnected remote restore path is validated; authenticated reconnect across full restart still depends on available credentials/host at validation time.
