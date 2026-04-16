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

- terminal live session objects, PTY process identity, in-memory output chunk ring buffers.
- remote shell process liveness (SSH process lifetime is runtime-only).
- MCP registry/runtime process map (including user-registered remote MCP entries in current implementation).
- plugin process runtime state.
- frontend transient panel/form state (tools input JSON, pending approval UI continuity maps, open/close widget flyout states).

## 3. What is restored today

- backend policy store, agent catalog selection, connection/remote profile catalog, conversation transcript, and audit log are loaded from persisted files.
- workspace shape (tabs/widgets order and active IDs) is restored from backend `workspace.json` snapshot.
- terminal sessions are started fresh for the current workspace widget set at runtime startup; no prior PTY process memory is restored.

## 4. What becomes stale/dead after restart

- all previous live terminal process instances (local and remote) are dead after runtime shutdown.
- previous PTY output ring buffers and process-local command state are stale/dead after restart.
- MCP runtime processes and dynamically registered MCP servers are lost on restart in current behavior.
- tools-panel pending approval continuity and other in-memory frontend-only transient state do not survive reload/restart.

## 5. Explicit non-goals for this batch

- no shell process memory checkpoint/restore.
- no hidden SSH connection resurrection magic.
- no frontend-only fake restore that claims live runtime state without backend truth.

## Local session restore contract

- persisted truth: local terminal tab/widget metadata restores from backend workspace snapshot.
- non-persisted truth: the old local PTY process does not survive restart.
- restore behavior: runtime creates a new local process for restored local widgets and marks it as restored-from-snapshot state.
- operator control: user can explicitly restart/recreate the session from the terminal surface; no hidden process resurrection is attempted.

## Remote session restore contract

- persisted truth: remote tab/widget metadata and profile linkage (`connection_id`/profile id) restore from backend snapshot.
- non-persisted truth: old SSH process/session lifetime does not survive restart boundaries.
- restore behavior: runtime attempts to start restored remote widgets; failures are surfaced as explicit disconnected terminal state rather than fake running state.
- operator control: reconnect/restart remains explicit (user action), with no hidden SSH reconnect loops.

## Surface restore boundaries

- AI panel transcript: backend conversation snapshot persists and is restored from `conversation.json`.
- AI composer draft and panel-local transient UI state: intentionally non-persistent.
- tools panel form JSON/input/response panes: explicitly reset on reopen; no persistence claim.
- audit panel list view state: explicitly refreshed on open and reset when closed; persisted source-of-truth remains `audit.jsonl`.
- MCP registry/config: persisted as backend config (`mcp-registry.json`) for registered remote servers and enabled flags.
- MCP runtime process state: intentionally runtime-only; after restart servers restore as stopped and require explicit start/invoke actions.
