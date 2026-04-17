# Frontend Terminal Streaming Contract

## Event model
The terminal stream endpoint is `/api/v1/terminal/{widgetId}/stream`.

Supported event types:
- `chunk`: terminal output chunk. Payload is `TerminalOutputChunk`.
- `end`: stream completion marker. Optional payload includes `{ code?: string, message?: string }`.
- `error`: stream error marker. Payload is `{ code: string, message: string }`.
- `output`: legacy alias mapped to `chunk`.
- SSE keepalive keeps the HTTP connection open and does not mutate state.

## Payload schemas
`TerminalOutputChunk`
- `seq: number`
- `timestamp: string`
- `data: string`

`end` payload
- `code?: string`
- `message?: string`

`error` payload
- `code: string`
- `message: string`

## Ordering and replay guarantees
- UI bootstrap loads a snapshot first via `terminalStore.refresh(widgetId)` using `/terminal/{widgetId}?from=0`.
- Stream subscription starts with `from = snapshot.next_seq`.
- Incoming chunks are accepted only if `chunk.seq >= state.nextSeq`.
- Store updates `state.nextSeq` to `chunk.seq + 1` and appends chunk to snapshot history.
- `snapshot` mutations from stream and snapshot load flow through `terminalStore` notifications.

## Reconnect behavior
- `terminalStore.startStream(widgetId, from)` always starts by opening a new stream state.
- If stream errors or ends, `streamActive` is set to `false` and `streamError` recorded when applicable.
- UI reuses snapshot + next `from` value and can call `startStream` again for recovery after errors.
- Consumers should call `terminalStore.stop(widgetId)` on teardown.

## Error handling
- Unknown events are forwarded to warning logger path and ignored by default.
- `stream_error`/`error` events set `streamError` in store snapshot and stop stream activity.
- Transport failures during stream open/update set `streamError` and clear active stream state.
- Snapshot remains authoritative fallback when stream is unavailable.
