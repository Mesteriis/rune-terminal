# ADR 0004: React And TypeScript Frontend

## Status

Accepted

## Context

The frontend must support a complex workspace UI, terminal rendering and fast iteration without recreating a heavy client-owned orchestration model.

## Decision

Use React with TypeScript and Vite for the frontend.

## Consequences

- mature ecosystem for terminal and tooling UI
- straightforward Tauri integration
- low execution risk for a workspace-heavy desktop product

## Alternatives considered

- Solid + TypeScript
- Svelte + TypeScript

