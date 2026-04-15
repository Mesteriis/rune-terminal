# Terminal State Sequence (Slice 3.1)

## Bootstrap sequence

1. UI mounts `TerminalWrap` via `workspace`/`term.tsx` path.
2. `TermWrap.initTerminal()` calls `loadInitialTerminalData()`.
3. `loadInitialTerminalData()` calls `terminalStore.refresh(blockId)`.
4. `terminalStore.refresh()` invokes `getTerminalFacade().getSnapshot(widgetId)` (HTTP snapshot endpoint).
5. Snapshot result is returned and `startingSeq` is set to `snapshot.next_seq`.

## Steady-state stream sequence

1. `TermWrap.initTerminal()` subscribes to `terminalStore` events.
2. The same lifecycle then calls `terminalStore.startStream(blockId, startingSeq)`.
3. `terminalStore.startStream()` opens `consumeStream(widgetId, {from: startingSeq})` from terminal facade.
4. On each stream frame, parser output is delivered to `onOutput`.
5. `terminalStore` appends chunk data to in-memory snapshot and emits `TerminalStoreEventType = "chunk"`.
6. `TermWrap` receives `chunk` event and applies it through `handleTerminalChunk()`.

## Fallback/refresh sequence

1. Initial bootstrap relies on one snapshot fetch as above.
2. In normal steady state, snapshot is not re-fetched for live deltas.
3. `terminalStore.refresh()` is only called by the bootstrap path and does not run on a polling loop for live terminal text updates.
4. If stream consume fails (error frame, request failure, or abort), stream state is stopped and marked errored (`streamError`) in `terminalStore`; this is the current fallback/error path in the active terminal flow.
5. If stream attachment succeeds again after failure, `startStream` resumes from the widget `nextSeq`.

## Code path ownership

- Snapshot read path: `TermWrap.loadInitialTerminalData` → `terminalStore.refresh` → `Compat terminal facade`.
- Stream attach path: `TermWrap.initTerminal` → `terminalStore.startStream` → `consumeStream`.
- Stream update path: `terminalStore` event notify `chunk` → `TermWrap` `handleTerminalChunk`.
- Direct terminal stream events in store: `rterm-api/http/sse` normalizes `output` and `chunk` SSE frames to `onOutput`, and store maps that to `TerminalStoreEventType: "chunk"` for UI observers.

## Enforcement note

Because the terminal UI is only snapshot-bootstrapped once on terminal mount, normal periodic refresh is not a live replacement for stream updates in this active path.
