# ADR 0012: Transport Between Tauri, Frontend And Go Core

## Status

Accepted

## Context

The rewrite needs a clear integration model that does not let transport become the product abstraction again.

## Decision

Tauri launches the Go core on loopback, the frontend discovers runtime info through a narrow Tauri command, and then communicates with the Go core over typed HTTP and SSE.

HTTP remains an adapter contract, not a product-wide RPC blob. Transport semantics stay explicit:

- `401` for auth failures
- `400` for malformed requests and invalid tool input
- `403` for policy denial
- `428` for approval-required tool executions
- `500` for internal failures

## Consequences

- transport is separate from domain logic
- frontend and Go can evolve independently
- Rust stays out of backend behavior
- approval and denial states are visible at the HTTP layer instead of being hidden behind blanket `200` responses

## Alternatives considered

- broad invoke-only bridge through Rust
- generated product-wide RPC surface similar to TideTerm
