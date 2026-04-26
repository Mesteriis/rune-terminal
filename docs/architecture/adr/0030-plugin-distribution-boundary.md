# 0030. Plugin Distribution Boundary

- Status: Accepted

## Context

ADR 0027 defined the current process and permission boundary for plugin
execution. That solved runtime correctness, but not operator distribution
workflows. The remaining TideTerm-derived gap is often described as
"plugin marketplace/discovery", which is too broad and currently conflicts
with the repository's explicit scope limits.

The project needs a narrower answer:

- what operator-facing plugin management is actually in scope
- whether install/import flows are allowed before any stronger sandbox
  exists
- whether an online marketplace is part of the active product direction

## Decision

`rterm` will pursue a local catalog and import/install model, not a broad
online marketplace, in the current product phase.

Accepted direction:

- backend-owned plugin catalog metadata
- enable/disable/remove/update flows for locally available plugins
- explicit local import/install workflows subject to the existing plugin
  runtime checks and trust boundary
- runtime-safe validation before a plugin becomes active

Explicitly not carried forward in this phase:

- a TideTerm-style or cloud-backed plugin marketplace
- broad discovery of untrusted third-party plugins over the network
- any implication that the current local plugin runtime is a safe
  sandboxed marketplace environment

If a broader marketplace is ever reopened, it requires a separate future
ADR with a stronger trust/distribution model than the one available today.

## Consequences

Positive:

- the plugin gap becomes implementable without pretending marketplace
  safety that does not exist
- operator UX can improve around real local plugin management
- plugin distribution no longer conflicts with ADR 0027

Negative:

- users should not expect a general plugin store in the near term
- plugin discovery remains intentionally narrower than the historical
  TideTerm imagination of the area

## Alternatives considered

### Build an online plugin marketplace now

Rejected. The current trust and sandbox model is not strong enough for
that claim.

### Leave plugin management at hard-coded local reference plugins only

Rejected. That keeps the runtime correct but leaves operator workflows
unnecessarily incomplete.

### Treat local import/install as equivalent to a marketplace

Rejected. Local catalog/install improves ergonomics, but it does not
change the fundamental trust model.
