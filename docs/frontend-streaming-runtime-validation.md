# Runtime Streaming Validation (Slice 3.1)

## Stream attach and chunk validation

Executed with a live server (`rterm-core`) on `http://127.0.0.1:52813` (`Authorization: Bearer smoketoken`).

1. `GET /api/v1/bootstrap` returns `workspace.active_widget_id = "term-main"`.
2. `GET /api/v1/terminal/term-main?from=0` returned `next_seq = 1` and base chunks.
3. `GET /api/v1/terminal/term-main/stream?from=1` was attached.
4. `POST /api/v1/terminal/term-main/input` with `{"text":"echo slice3-runtime-input"}`.
5. Stream emitted events (`event: output`) with `seq` values 1..27 for the pre-existing output stream and then new input-driven events from sequence 31 onward.

Observed behavior: event bytes reached the stream endpoint immediately after input, confirming bootstrap+snapshot then stream-driven updates.

Because the endpoint currently emits SSE as `output`, terminal stream store converts that into `TerminalStoreEventType: "chunk"` events via `onOutput` handling.

## End/completion validation

I attached a stream, observed sustained chunk flow, then terminated the client connection.

Observed behavior:

- No explicit `event: end` frame was observed from the stream response.
- Stream completion is currently seen as transport close when the HTTP stream is closed, not as an SSE `end` event.
- Store-side stream state transitions to inactive in `finally`/`stop`.

## Error validation

Executed invalid stream endpoint:

`GET /api/v1/terminal/does-not-exist/stream?from=0`

Observed response:

```
HTTP/1.1 404 Not Found
{"error":{"code":"widget_not_found","message":"terminal widget not found: does-not-exist"}}
```

Observed behavior:

- This produces a transport/request-level failure path (HTTP error) rather than SSE `error` frame.
- Stream error in the runtime contract is not emitted as SSE `error` by this backend path at present.

## Reconnect behavior

After chunk flow completed, stream was re-attached from the updated sequence:

1. `GET /api/v1/terminal/term-main?from=0` showed `next_seq = 31`.
2. Re-attached stream with `from=31`.
3. Posted `{"text":"echo slice3-runtime-reconnect"}`.
4. Stream returned `seq` progression 31..61 and subsequent data.

This validates manual reconnect from last-seen sequence and continuous delta processing.
