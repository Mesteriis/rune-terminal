# 0019. Remote / SSH Foundation

- Status: Accepted

## Context

TideTerm treats local and remote shells as first-class product behavior. RunaTerminal had already reached a launchable local shell baseline, but remote and SSH remained a product-level gap.

Exact parity with TideTerm's legacy remote stack would require carrying forward old connection-controller complexity, frontend-owned state, and transport-heavy semantics. That would conflict with the rewrite goals already captured in the earlier ADR set.

We still need a real remote foundation now, not another placeholder. The first slice must be narrow, explicit, and compatible with the Go-first runtime.

## Decision

RunaTerminal introduces a dedicated `core/connections` domain as the new remote foundation.

This slice implements:

- an explicit connection catalog with `local` and `ssh` connection kinds
- persisted SSH connection profiles
- active connection selection
- explicit connection lifecycle fields for last preflight-check result and last launch-result feedback
- connection-aware terminal launch options
- shell-level connection entry points and catalog views
- typed HTTP adapter routes for connection catalog reads and writes

Terminal sessions remain PTY-driven. Local sessions launch the normal local shell. SSH sessions launch the system `ssh` binary inside the PTY using the selected profile.

The shell uses the connection catalog as a backend-owned source of truth:

- the workspace switcher shows the active connection target
- terminal chrome shows the current connection
- the connections panel can add/select SSH profiles, run an explicit preflight check, inspect lifecycle-oriented status, and open a new tab bound to a specific connection

## Consequences

Positive:

- remote is no longer a missing product area
- local versus SSH is now explicit in the domain model
- per-widget connection binding is stored in the workspace snapshot
- the frontend no longer needs to infer connection behavior ad hoc
- future remote parity can extend this domain without reviving TideTerm's legacy transport stack

Negative:

- this is not full TideTerm remote parity
- SSH sessions currently rely on the local `ssh` binary and do not implement a richer remote agent/controller layer
- the active connection is only the default target for future tabs, not a live remote session
- preflight checks are local validation plus binary/path checks, not a full network reachability guarantee
- there is still no long-lived remote controller state in the runtime

## Alternatives considered

### Copy TideTerm connection stack wholesale

Rejected. It would reintroduce the very transport complexity and backend/frontend entanglement this rewrite is avoiding.

### Keep remote missing until later

Rejected. Remote and SSH are a product-level gap large enough to block meaningful parity claims.

### Add frontend-only SSH profiles without a backend domain

Rejected. Connection semantics would become implicit, brittle, and shell-owned instead of runtime-owned.
