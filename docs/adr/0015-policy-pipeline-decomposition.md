# ADR 0015: Policy Pipeline Decomposition

## Status

Accepted

## Context

A single branching policy function will drift toward the same unmaintainable bucket shape that TideTerm accumulated in other subsystems.

## Decision

Decompose policy evaluation into explicit stages:

1. capability
2. allowed roots
3. ignore rules
4. trusted rules
5. approval

Each stage operates on a shared pipeline state and can stop evaluation with a concrete reason.

## Consequences

- evaluation order is explicit and testable
- role/mode overlays can plug in without turning policy into nested conditionals
- future path and remote-connection controls have a stable insertion point

## Alternatives considered

- keep a single `Evaluate` kitchen-sink function
- split by helper functions but keep hidden control flow inside one file
