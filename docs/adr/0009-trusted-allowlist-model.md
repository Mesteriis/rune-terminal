# ADR 0009: Trusted Allowlist Model

## Status

Accepted

## Context

Repeated safe workflows should not require the same confirmation forever, but reducing friction must remain auditable and scoped.

## Decision

Trusted rules support `global`, `workspace` and `repo` scopes, with `exact`, `glob`, `regex` and `structured` matchers plus explicit revocation.

## Consequences

- users can encode approval memory without making policy invisible
- rules remain narrow and reviewable
- audit captures both rule changes and rule use

## Alternatives considered

- no trusted memory
- unscoped allow-everything toggles

