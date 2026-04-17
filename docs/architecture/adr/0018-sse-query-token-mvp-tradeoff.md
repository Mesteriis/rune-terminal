# ADR 0018: SSE Query Token MVP Tradeoff

## Status

Accepted, later narrowed by active-path hardening

## Context

The original MVP assumed native `EventSource` for terminal streaming, which cannot send custom authorization headers. The Go core still needs authentication even on loopback.

The active frontend terminal path now uses `fetch` + `ReadableStream`, so it can send bearer auth headers directly.

## Decision

Keep query-token auth available only as a constrained fallback for terminal SSE routes:

- allowed:
  `GET /api/v1/terminal/{widgetID}/stream?token=...`
- not allowed:
  query-string auth on standard JSON endpoints

The normal active shell path now uses bearer-token auth headers for streaming. Query-token auth is no longer the default stream auth model.

## Consequences

- the active shell path no longer exposes the long-lived auth token in the stream URL
- query-token auth does not spread across the rest of the API surface
- documentation must distinguish normal header-auth streaming from the narrower fallback path

## Alternatives considered

- unauthenticated loopback SSE
- replacing `EventSource` immediately with a custom fetch-based stream client
- broad query-string auth across all HTTP endpoints
