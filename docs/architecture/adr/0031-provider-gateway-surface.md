# 0031. Provider Gateway Surface

- Status: Accepted

## Context

`rterm` deliberately declined a TideTerm-style `WaveProxy` revival during
the parity cleanup because the old proxy stack mixed product meaning,
provider routing, and transport-specific operator UX too tightly.

That left one real operator gap behind:

- the active AI path had stricter runtime correctness, approvals, and
  audit ownership
- but it still lacked a backend-owned provider gateway surface for recent
  run history, health signals, and latency/operator feedback

The project needs a narrower answer than “bring back WaveProxy”:

- keep conversation/provider routing on the current Go runtime path
- add gateway-style observability and operator telemetry
- avoid introducing a second proxy/runtime stack beside the existing
  conversation service

## Decision

`rterm` will add a backend-owned provider gateway surface on top of the
current conversation/provider runtime instead of reviving a standalone
proxy subsystem.

Accepted direction:

- provider-run history persisted in `runtime.db`
- backend-owned provider health/latency summaries derived from recent runs
- explicit HTTP transport for provider gateway telemetry
- settings-shell visibility for recent provider activity and gateway
  signals on the active provider route

Explicitly out of scope in this phase:

- a standalone TideTerm-style proxy server UI/runtime
- a second routing/orchestration stack that bypasses the conversation
  service
- broad provider marketplace/discovery or proxy-only channel universes

## Consequences

Positive:

- operator-facing provider observability improves without weakening the
  current runtime/tool/policy boundaries
- the AI transport becomes easier to reason about operationally
- future routing improvements can build on explicit run history instead of
  ad hoc frontend state

Negative:

- this does not by itself create a multi-channel proxy router
- provider latency/convenience gaps still need future runtime work beyond
  telemetry alone

## Alternatives considered

### Recreate WaveProxy as a standalone subsystem

Rejected. That would reintroduce a second product/runtime center instead
of strengthening the active Go core.

### Keep provider routing opaque and UI-light

Rejected. Correctness alone is not enough if operators cannot inspect
provider health, recent failures, or latency shape.
