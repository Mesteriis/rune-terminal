# ADR 0006: Terminal Session Model

## Status

Accepted

## Context

Terminal behavior is central to the product and must be consumable by both UI and tools.

## Decision

Represent terminal widgets as backend-owned terminal sessions with explicit lifecycle, input, interrupt and output streaming APIs.

## Consequences

- terminal truth lives in one place
- AI tools and UI consume the same runtime semantics
- remote launchers can later reuse the same contract

## Alternatives considered

- frontend-owned terminal lifecycle
- controller abstractions derived from the old TideTerm stack

