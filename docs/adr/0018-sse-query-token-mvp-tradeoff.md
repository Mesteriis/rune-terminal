# ADR 0018: SSE Query Token MVP Tradeoff

## Status

Accepted

## Context

RunaTerminal uses browser `EventSource` for terminal output streaming. Native `EventSource` does not allow custom authorization headers, but the Go core still needs authentication even on loopback.

## Decision

Accept the auth token in the query string for terminal SSE routes only:

- allowed:
  `GET /api/v1/terminal/{widgetID}/stream?token=...`
- not allowed:
  query-string auth on standard JSON endpoints

This is treated as an explicit MVP compromise, not the long-term transport model. The intended replacement is a scoped stream-ticket mechanism that can be minted over an authenticated JSON request and then redeemed by `EventSource`.

## Consequences

- terminal SSE remains usable from the browser without introducing a custom stream client immediately
- query-token auth does not spread across the rest of the API surface
- transport documentation must call out the temporary nature of this decision

## Alternatives considered

- unauthenticated loopback SSE
- replacing `EventSource` immediately with a custom fetch-based stream client
- broad query-string auth across all HTTP endpoints
