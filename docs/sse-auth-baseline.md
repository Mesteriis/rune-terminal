# SSE Auth Baseline

## Current stream auth model

- Terminal streaming route is `GET /api/v1/terminal/{widgetID}/stream`.
- Backend auth middleware accepts bearer auth everywhere and also accepts `?token=<auth>` for terminal stream routes only.
- Frontend runtime config currently sets `streamAuthMode: "query-token"` whenever an auth token exists.

## Where token-in-query is used

- `frontend/runtime/stream.ts` appends `token` to the stream URL when `streamAuthMode === "query-token"`.
- `frontend/compat/terminal.ts` passes that mode through to the active terminal facade.
- `frontend/rterm-api/http/sse.ts` then calls `client.requestRaw("GET", ...)` with `includeAuth: false` and `token` in the query string.

## Current constraint reality

- The active terminal path is not native `EventSource`.
- `frontend/rterm-api/http/sse.ts` consumes the stream with `fetch` + `ReadableStream`, so it can already send `Authorization` headers.
- The original query-token reasoning still exists in docs because browser `EventSource` cannot set custom auth headers, but that is not the current normal path.
- `buildStreamUrl()` helpers still exist for URL-based consumers, so a query-token fallback may still be needed for non-fetch consumers if they reappear.

## Slice boundary

- No terminal redesign
- No stream protocol redesign
- No new transport layer
