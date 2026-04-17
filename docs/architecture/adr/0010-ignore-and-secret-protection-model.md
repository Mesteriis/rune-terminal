# ADR 0010: Ignore And Secret Protection Model

## Status

Accepted

## Context

AI-native tooling makes accidental secret exposure an architectural risk, not just a UX edge case.

## Decision

Seed a default ignore rule set for common secret-bearing files and support `deny`, `metadata-only` and `redact` modes.

## Consequences

- secret protection is active before file tools expand
- trusted rules do not bypass secret handling
- overrides require explicit approval

## Alternatives considered

- rely on user education only
- treat ignore rules as optional convenience filters

