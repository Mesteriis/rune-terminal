# rune-terminal Architecture

## Rewrite Position

rune-terminal is a clean-room rewrite of TideTerm, not an incremental fork evolution. The audit of the old repository produced three strong conclusions:

1. TideTerm has the right product ideas.
2. TideTerm carries too much product meaning inside transport and UI state plumbing.
3. AI-native tooling only becomes stable if security, policy and audit are first-class platform modules.

## What We Carry Forward

- block and workspace oriented terminal UX
- local and SSH session abstractions
- event-driven interactions
- AI-native product direction
- typed tool definitions and explicit metadata

## What We Explicitly Avoid

- monolithic RPC handlers
- global mutable state as the integration primitive
- frontend-owned orchestration of backend semantics
- policy retrofitted as chat-specific callbacks
- backend split across Go and Rust without a clear domain boundary

## Layering

```text
Frontend (React + TypeScript)
  -> UI composition, terminal rendering, optimistic interaction shell

Tauri Desktop Shell (Rust)
  -> native windowing, process bootstrap, local runtime discovery

Go Core
  -> workspace service
  -> connection service
  -> terminal service
  -> conversation service
  -> tool runtime
  -> agent profile and work-mode store
  -> policy engine and rule store
  -> audit log
  -> typed HTTP transport
```

## Modules

- `core/workspace`
  Manages workspace snapshots, widget inventory and active widget focus.
- `core/connections`
  Manages the persisted connection catalog, active connection selection, local versus SSH connection metadata, last preflight-check result, and last launch-result feedback.
- `core/terminal`
  Manages terminal sessions, PTY processes, output buffering and subscriptions.
  Terminal launches are connection-aware: local sessions use the current shell, while SSH sessions launch the system `ssh` binary inside the PTY.
- `core/conversation`
  Manages the persisted AI transcript and the narrow provider adapter for real assistant responses.
  The conversation path resolves providers from backend-owned agent config and currently routes through local CLI adapters plus one explicit OpenAI-compatible HTTP source path: Codex CLI (`codex exec`), Claude Code CLI (`claude -p`), and operator-supplied OpenAI-compatible endpoints (`/v1/models`, `/v1/chat/completions`).
- `core/toolruntime`
  Hosts tool registry, operation planning, approval handling, execution results and audit emission.
- `core/agent`
  Stores system prompt profiles, role presets and work modes that project into policy overlays.
- `core/policy`
  Enforces a staged pipeline for capabilities, allowed roots, ignore rules, trusted rules and approvals.
- `core/audit`
  Persists auditable events for mutating or sensitive operations.
- `core/transport/httpapi`
  Exposes typed transport for frontend and shell integration without leaking transport concerns into domain packages.

## Transport Model

- Tauri starts the Go core as a local child process.
- Go listens on loopback only and emits a ready file with the final port.
- Tauri exposes `runtime_info` so the frontend can discover the Go base URL and auth token.
- Frontend talks directly to the Go core over local HTTP and SSE.
- Shell-level management routes now include connection catalog reads and writes in addition to workspace, policy, agent, and terminal adapters.
- Connection routes expose catalog state, active default-target selection, SSH profile save, and explicit preflight checks.
- Agent routes now expose both the role/mode/profile catalog and a dedicated conversation transport:
  - `GET /api/v1/agent/conversation`
  - `POST /api/v1/agent/conversation/messages`
- transport keeps HTTP semantics explicit:
  - `401` for missing or invalid auth
  - `400` for malformed requests or invalid tool input
  - `403` for policy denial
  - `428` for approval-required tool executions
  - `500` for internal failures

This keeps Rust out of the main backend path while preserving a secure desktop boundary.

## SSE Authentication Note

The active terminal stream path uses `fetch` streaming with bearer-token auth, so the normal shell path no longer relies on query-string auth. A constrained query-token fallback is still accepted for terminal stream consumers that cannot send authorization headers. Standard JSON endpoints do not accept query-string auth.

## Security Model

Every tool execution flows through:

1. registry lookup
2. schema decode
3. execution planning
4. policy evaluation:
   - capability stage
   - allowed roots stage
   - ignore rule stage
   - trusted rule stage
   - approval stage
5. approval resolution
6. execution
7. audit append

Ignore rules never become optional just because a tool is trusted. Trusted rules reduce approval friction, but they do not disable secret protection.

Role presets, work modes and system prompt profiles are not UI-only metadata. They project capability removals/additions, approval strictness and trusted-rule posture into the same policy pipeline.

## Why This Is Long-Lived

- UI state is intentionally thin; the backend owns the durable model.
- transport is an adapter, not a product boundary
- tool runtime is generic and policy-aware from day one
- connection state is explicit and backend-owned instead of being inferred from frontend shell heuristics
- terminal orchestration is isolated from workspace orchestration
- future AI features can integrate through the tool runtime instead of growing a second orchestration stack
- AI provider/account routing stays backend-owned and intentionally narrow: the active runtime supports local Codex CLI, local Claude Code CLI, and one explicit OpenAI-compatible HTTP source kind
- remote state is explicit and backend-owned, but it is still profile-oriented rather than a long-lived remote controller model
