# ADR 0003: Go-First Backend Core

## Status

Accepted

## Context

The runtime must handle session orchestration, local process management, policy evaluation, audit and future remote connections without introducing unnecessary implementation fragmentation.

## Decision

Use Go as the primary implementation language for backend, runtime and domain logic.

## Consequences

- backend ownership is unambiguous
- concurrency and streaming concerns stay in one language
- Rust remains optional for narrowly justified low-level modules

## Alternatives considered

- full Rust backend
- mixed Go/Rust backend from day one

