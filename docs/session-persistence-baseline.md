# Session Persistence Baseline

Date: `2026-04-17`  
Phase: `1.0.0-rc1` hardening

## 1. What is currently persisted

- `core/config/policy.json`: policy rules and overlays.
- `core/config/audit.jsonl`: audit event history.
- `core/config/agent-state.json`: prompt profile / role / mode selection.
- `core/config/connections.json`: active connection target, saved SSH connections, saved remote profiles, check/launch runtime markers.
- `core/config/conversation.json`: backend conversation transcript and provider metadata.

## 2. What is currently runtime-only

- workspace tabs/widgets shape (`workspace.Service` is bootstrapped from in-memory defaults).
- terminal live session objects, PTY process identity, in-memory output chunk ring buffers.
- remote shell process liveness (SSH process lifetime is runtime-only).
- MCP registry/runtime process map (including user-registered remote MCP entries in current implementation).
- plugin process runtime state.
- frontend transient panel/form state (tools input JSON, pending approval UI continuity maps, open/close widget flyout states).

## 3. What is restored today

- backend policy store, agent catalog selection, connection/remote profile catalog, conversation transcript, and audit log are loaded from persisted files.
- workspace shape is restored only as the static bootstrap default (`tab-main` / `tab-ops` with local widgets), not from previous runtime mutations.
- terminal sessions are started fresh for the current workspace widget set at runtime startup; no prior PTY process memory is restored.

## 4. What becomes stale/dead after restart

- all previous live terminal process instances (local and remote) are dead after runtime shutdown.
- any tab/widget mutations made during runtime are lost on restart in current behavior (workspace is not persisted yet).
- MCP runtime processes and dynamically registered MCP servers are lost on restart in current behavior.
- tools-panel pending approval continuity and other in-memory frontend-only transient state do not survive reload/restart.

## 5. Explicit non-goals for this batch

- no shell process memory checkpoint/restore.
- no hidden SSH connection resurrection magic.
- no frontend-only fake restore that claims live runtime state without backend truth.
