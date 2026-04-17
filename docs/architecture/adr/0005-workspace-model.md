# ADR 0005: Workspace Model

## Status

Accepted

## Context

The old product mixed block metadata, layout mechanics and UI view-model state. The rewrite needs a smaller, durable core model.

## Decision

Start with a backend-owned workspace model that tracks widget inventory and active focus, with richer layout semantics deferred until the contracts are stable.

## Consequences

- workspace logic is testable without the renderer
- focus operations become explicit and auditable
- future layout trees can be layered without rewriting the core

## Alternatives considered

- port the old block/layout model as-is
- let the frontend own focus state

