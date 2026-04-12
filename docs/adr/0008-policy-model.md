# ADR 0008: Policy Model

## Status

Accepted

## Context

The old product direction required approvals, ignore rules and trusted rules, but those concerns were not consistently first-class.

## Decision

Use a single policy engine that evaluates capabilities, approval tiers, allowed roots, ignore rules and trusted rules for every tool execution.

## Consequences

- security semantics are explicit
- tool authors do not reimplement approval logic
- future file and git tools inherit the same protections

## Alternatives considered

- per-tool bespoke policy
- frontend-mediated approval logic

