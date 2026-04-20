# ADR 0001: Rewrite Philosophy And Architectural Goals

## Status

Accepted

## Context

TideTerm proved the product demand for a terminal workspace with AI-native trajectories, but the audit showed a high coupling between transport, frontend state and backend runtime semantics.

## Decision

rune-terminal will be a clean-room rewrite that preserves product ideas while discarding the architectural shape of the old codebase.

## Consequences

- migration is conceptual rather than code-copy based
- foundational modules are allowed to start smaller if their boundaries stay correct
- parity with the old product is explicitly secondary to architectural integrity

## Alternatives considered

- continue evolving the TideTerm fork in place
- do a transport-only rewrite while keeping the existing object model

