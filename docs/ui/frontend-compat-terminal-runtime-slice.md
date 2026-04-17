# Frontend Compat Terminal Runtime Slice

Date: `2026-04-15`

## Scope

This slice hardens only the active compat terminal path used by:

- initial terminal mount
- new tab -> terminal mount
- terminal input

Code scope stayed intentionally narrow:

- `frontend/app/state/terminal.store.ts`
- `frontend/app/view/term/termwrap.ts` was traced as the crash site, but not rewritten
- no workspace logic, tab bar logic, `wave.ts`, or architecture was changed

## Runtime Trace

Observed active execution path for the failing terminal mount:

1. compat app renders the active terminal widget
2. `frontend/app/view/term/compat-terminal.tsx` mounts `TermWrap`
3. `frontend/app/view/term/termwrap.ts:loadInitialTerminalData()` calls `terminalStore.refresh(this.blockId)`
4. `frontend/app/state/terminal.store.ts:refresh()` resolves `getTerminalFacade().getSnapshot(widgetId)`
5. compat terminal facade requests `GET /api/v1/terminal/<widgetId>?from=0`
6. `TermWrap` iterates `snapshot.chunks` and replays buffered output

## Failure

### Error

`TypeError: snapshot.chunks is not iterable`

### Exact source

- crash site:
  `frontend/app/view/term/termwrap.ts:1049`
- bad data entered the active path through:
  `frontend/app/state/terminal.store.ts:127`

### What `snapshot` is here

At the crash site, `snapshot` is the typed terminal snapshot returned by the compat terminal facade and cached in `terminalStore`.

Nominal type:

- `TerminalSnapshot` from `frontend/rterm-api/terminal/types.ts`

Observed runtime object on the failing new-tab mount:

```json
{
  "state": {
    "widget_id": "term_580e9f76b899a32e",
    "session_id": "shell:term_580e9f76b899a32e",
    "title": "New Shell",
    "status": "running",
    "cols": 0,
    "rows": 0,
    "working_directory": "/Users/avm/projects/Personal/tideterm/runa-terminal"
  },
  "chunks": null,
  "next_seq": 1
}
```

So on the active runtime path:

- `snapshot` was not `undefined`
- `snapshot` was not an array
- this was not a legacy object-graph payload
- the incompatibility was a typed runtime payload that violated the expected `TerminalSnapshot` contract by returning `chunks: null`

## Cause

`frontend/app/view/term/termwrap.ts:1049` assumes `snapshot.chunks` is iterable:

```ts
for (const chunk of snapshot.chunks) {
```

That assumption is valid for the declared type but not for the first live snapshot returned during a compat new-tab mount. The store accepted the malformed snapshot unchanged, so the first replay pass in `TermWrap` crashed immediately.

The same malformed payload would also remain unsafe for later stream appends inside `terminalStore.startStream()` because that code spreads `state.snapshot.chunks`.

## Fix

The fix stays at the boundary where the bad data enters the active compat terminal path.

Changed in `frontend/app/state/terminal.store.ts`:

- added `normalizeTerminalSnapshot(snapshot)`
- coerced `chunks` to `[]` when the runtime payload does not provide an array
- applied normalization inside `refresh()` before the snapshot is stored or observed

Result:

- `TermWrap.loadInitialTerminalData()` always receives an iterable `chunks` field
- stream append logic also receives a stable array shape
- no terminal architecture or store model was rewritten

## Why this is safe

- the fix is boundary-local and only affects the active compat terminal snapshot ingress
- it preserves all existing snapshot fields
- it only normalizes an invalid runtime value to the empty-buffer state that the terminal replay path already supports
- once later snapshot/stream data arrives with real chunks, the terminal continues normally

## Result

The compat terminal path now remains stable for:

- initial terminal mount
- new tab -> terminal mount
- terminal input

without the runtime crash caused by `snapshot.chunks` being `null` on first mount.

## Historical Reconciliation

The earlier compat console/runtime validation entry recorded `TypeError: snapshot.chunks is not iterable` as an out-of-scope observation for that older slice.

That older note is now historical only:

- it accurately described the state before `c025cd0`
- it is superseded by the terminal runtime stabilization fix in `c025cd0`
- it should not be read as an active unresolved result after this slice

## Terminal SSE Abort Classification

Follow-up runtime verification checked the `net::ERR_ABORTED` entries seen for terminal SSE during tab switching.

Observed runtime path:

1. active tab changes
2. `frontend/app/view/term/compat-terminal.tsx` unmount cleanup runs
3. `TermWrap.dispose()` calls `terminalStore.stop(widgetId)`
4. `frontend/app/state/terminal.store.ts:stopStream()` calls `abortController.abort()`
5. the previous `/api/v1/terminal/<widget>/stream` request is canceled
6. the newly active terminal mounts and starts a replacement stream

Observed impact:

- the abort did not surface in `pageErrors`
- the abort did not surface in `consoleErrors`
- terminal input continued to work
- post-switch terminal state resumed from the updated sequence without observed output loss

Classification:

- `harmless but noisy`
- this is expected client-side cancellation for a replaced long-lived SSE subscription
- browser network tooling may still display the canceled request as `net::ERR_ABORTED`

## Rapid Stream Race-Safety Validation

Follow-up validation checked rapid tab switching and stream lifecycle safety without changing terminal runtime code.

Validated scenarios:

1. fresh load, then `Main Shell <-> Ops Shell` rapid switching for 5 round-trips
2. terminal input followed by an almost immediate tab switch away and back
3. additional rapid switching on a warmed runtime
4. `Add Tab`, then rapid switching between `Main Shell` and the new terminal tab

Observed runtime facts:

- tracked stream replacement remained single-open at any point in the validated switching windows
- the cleanup source stayed the same:
  - `CompatTerminalView` unmount cleanup
  - `TermWrap.dispose()`
  - `terminalStore.stop(widgetId)`
  - `TerminalStore.stopStream()`
  - `AbortController.abort()`
- no dangling old open stream was observed after the validated rapid-switch sequences
- no late `chunk` delivery into the inactive terminal path was observed after `stream-stop`
- in the input-and-switch scenario, the resumed terminal reopened from the advanced `from` sequence and the server snapshot contained the marker output exactly once, without duplicate or missing chunk sequences
- for the new tab, the stream restarted from `from=1`, then later from `from=3`, then `from=4`, while the validated server snapshot remained sequence-consistent

Residual note:

- intentional stream aborts still pass through store-level `error` bookkeeping as `BodyStreamBuffer was aborted`
- this did not surface as page or console errors in the validated compat path
- classification: `suspicious but not proven`
- no code fix was justified by this validation slice alone
