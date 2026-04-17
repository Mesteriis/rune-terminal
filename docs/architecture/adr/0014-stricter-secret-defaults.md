# ADR 0014: Stricter Secret Defaults

## Status

Accepted

## Context

The initial rewrite seeded all default secret-bearing patterns as `metadata-only`. That is too permissive for private keys and certificate bundles.

## Decision

Split the default ignore set into two classes:

- `.env`, `.env.*`, `secrets.*` -> `metadata-only`
- `*.pem`, `*.key`, `*.p12`, `id_rsa`, `id_ed25519` -> `deny`

## Consequences

- key material now requires explicit confirmation even before richer file tools exist
- environment files stay discoverable at metadata level for pragmatic workflows
- tests and docs must pin the default rule table

## Alternatives considered

- keep every default at `metadata-only`
- deny every secret-shaped path including `.env`
