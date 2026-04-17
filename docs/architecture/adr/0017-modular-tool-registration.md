# ADR 0017: Modular Tool Registration

## Status

Accepted

## Context

`core/app/tools.go` had already become a domain bucket. Leaving all tool definitions in one file would recreate the same maintenance failure mode as TideTerm's handler monoliths.

## Decision

Split tool registration by domain:

- workspace tools
- terminal tools
- policy tools

Keep shared helpers small and local to the app package.

## Consequences

- tool additions land in the owning domain slice
- review scope is narrower
- the registry bootstrap remains centralized without becoming a god-file

## Alternatives considered

- keep a single `tools.go`
- move every tool into a separate package before the surface area justifies it
