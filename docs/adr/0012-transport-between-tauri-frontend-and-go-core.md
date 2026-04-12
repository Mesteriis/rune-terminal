# ADR 0012: Transport Between Tauri, Frontend And Go Core

## Status

Accepted

## Context

The rewrite needs a clear integration model that does not let transport become the product abstraction again.

## Decision

Tauri launches the Go core on loopback, the frontend discovers runtime info through a narrow Tauri command, and then communicates with the Go core over typed HTTP and SSE.

## Consequences

- transport is separate from domain logic
- frontend and Go can evolve independently
- Rust stays out of backend behavior

## Alternatives considered

- broad invoke-only bridge through Rust
- generated product-wide RPC surface similar to TideTerm

