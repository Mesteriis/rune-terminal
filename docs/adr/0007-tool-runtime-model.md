# ADR 0007: Tool Runtime Model

## Status

Accepted

## Context

The rewrite needs AI-native tooling without coupling tools to a specific chat subsystem.

## Decision

Create a standalone tool runtime with a registry, schemas, execution planning, policy evaluation and audit integration.

## Consequences

- tools can be reused by UI, AI and future automation
- policy remains centralized
- chat integrations stay thin

## Alternatives considered

- embed tools directly in the AI/chat layer
- ad-hoc command handlers with metadata annotations

