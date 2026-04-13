# Current Behavior

This document records the runtime invariants that are true in the repository today.
It is intentionally operational, not narrative.

## Workspace and tab contract

- The workspace now owns both `tabs` and `widgets`.
- There is exactly one active tab and one active widget.
- In the current parity slice, each tab references one primary widget.
- Focusing a tab synchronizes the active widget to that tab's primary widget.
- Focusing a widget also synchronizes the active tab if that widget belongs to a known tab.
- Tabs are the shell-level navigation unit.
- Widgets remain the secondary inventory used by the right-side dock and terminal/runtime binding.

## Session lifecycle contract

- Each terminal widget owns at most one active session.
- `terminal.StartSession(widget_id)` is idempotent for an already-running widget session.
- Concurrent `StartSession` calls for the same widget coalesce onto a single launch attempt.
- A second `StartSession` must not spawn a second process for the same widget.
- Session IDs are currently equal to widget IDs in the MVP.
- On startup, the runtime eagerly boots sessions for terminal widgets in the default workspace.
- When a process exits, terminal state moves to `exited` or `failed`, input/interrupt are disabled, and active stream subscribers are closed.

## Output subscription contract

- Terminal output subscribers are per-session fanout endpoints.
- Unsubscribe is idempotent.
- Unsubscribe closes the subscriber channel after removing it from the session registry.
- Output delivery uses subscriber objects with internal close/deliver synchronization to avoid `send on closed channel`.
- A closed subscriber may still appear in an old snapshot of the subscriber list, but delivery to it is a no-op.

## Approval lifecycle contract

- Approval requests are created only when policy evaluation requires confirmation.
- `safety.confirm` consumes the pending approval ID and returns a short-lived approval token.
- Pending approval IDs are single-use.
- Approval tokens are single-use.
- A consumed approval token cannot be replayed for a second execution.
- Reusing a consumed approval token causes the execution to fall back to normal policy evaluation, which may produce a new approval requirement.

## Trusted rule behavior

- Trusted rules are allowlist-style matches scoped to `global`, `workspace`, or `repo`.
- A matching trusted rule can auto-approve dangerous operations.
- Trusted rules do not auto-approve destructive operations.
- Trusted auto-approve can be disabled by the active role/mode/profile overlay.
- Trusted rules do not override hard denials caused by missing capabilities.

## Ignore rule behavior

- Ignore rules protect sensitive paths and filename patterns.
- Default secret protection modes are:
  - `.env`, `.env.*`, `secrets.*` => `metadata-only`
  - `*.pem`, `*.key`, `*.p12`, `id_rsa`, `id_ed25519` => `deny`
- `metadata-only` marks the match in the decision but does not block execution.
- `redact` is reserved for paths that may be referenced but must have contents masked by higher-level tooling.
- `deny` is a hard sensitive-path boundary unless explicit approval is supplied.

## Allowed roots semantics

- Allowed roots define the filesystem boundary for operations that declare `RequiresAllowedRoots`.
- Paths inside an allowed root pass that stage.
- Paths outside allowed roots require approval.
- Approval makes the outside-root access confirmable, not ambiently trusted.

## Policy precedence

The current pipeline is:

1. capability checks
2. allowed roots
3. ignore rules
4. trusted rules
5. approval tier

Practical consequences:

- Missing capabilities are hard denials.
- Outside-root access is confirmable if approval is allowed for that operation.
- `deny` ignore rules take precedence over trusted rules when no approval is present.
- Trusted rules can suppress approval only after capability, allowed-root, and ignore stages have passed.

## Hard boundary vs confirmable boundary

Hard boundaries:

- missing required capabilities
- unsupported or invalid tool input
- nonexistent widget/rule/profile/role/mode IDs

Confirmable boundaries:

- approval-tier requirements for dangerous/destructive actions
- operations outside allowed roots
- `deny` ignore rules

## Temporary MVP compromises

- SSE terminal streams accept the auth token via query string because browser `EventSource` cannot send `Authorization` headers. This is limited to the stream endpoint and will be replaced by a scoped stream-ticket mechanism.
- Session IDs currently equal widget IDs instead of using a separate durable session identity layer.
- The desktop shell launches the Go core as a sidecar process and discovers it via a ready file; a richer process supervisor does not exist yet.
