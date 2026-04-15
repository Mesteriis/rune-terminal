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
