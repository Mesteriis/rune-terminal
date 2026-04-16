# frontend terminal persistence baseline

Date: `2026-04-16`

## Active render path

- Active compat workspace mounts terminal content through:
  - `frontend/app/workspace/workspace.tsx`
  - `frontend/app/tab/tabcontent.tsx`
  - `frontend/app/view/term/compat-terminal.tsx`
  - `frontend/app/view/term/termwrap.ts`
- The active tab renders `CompatTerminalView` for the tab's terminal widget.
- Backend terminal truth comes from:
  - `GET /api/v1/terminal/{widgetID}`
  - `GET /api/v1/terminal/{widgetID}/stream`

## Tab switch lifecycle

- `workspace.tsx` renders `TabContent` with key ``${tabId}:${workspace.activewidgetid}``.
- `tabcontent.tsx` renders `CompatTerminalView` with key `widgetId`.
- Switching away from a terminal tab therefore unmounts that tab's `CompatTerminalView` and `TermWrap`.
- `compat-terminal.tsx` cleanup calls `termWrap.dispose()`.
- `termWrap.dispose()` unsubscribes from `terminalStore` and calls `terminalStore.stop(widgetId)`, which aborts the live stream.
- Switching back mounts a fresh `CompatTerminalView` / `TermWrap` for the same widget id.

## Restore path today

- On mount, `termwrap.initTerminal()` calls `loadInitialTerminalData()`.
- `loadInitialTerminalData()` calls `terminalStore.refresh(widgetId)`, which fetches the backend snapshot and stores `snapshot`, `nextSeq`, and `session_id`.
- After that, `termwrap` subscribes to `terminalStore` updates and starts a new stream from `snapshot.next_seq`.
- The widget id remains stable across tab switches for a given tab (`term-main`, `term-side`, etc.).

## Likely cause of lost visible output

- Snapshot/history replay exists, but `termwrap` advances `lastAppliedSnapshotSeq` to `snapshot.next_seq` before replaying `snapshot.chunks`.
- `handleTerminalChunk()` skips any chunk where `chunk.seq < lastAppliedSnapshotSeq`.
- Result: replayed snapshot chunks are skipped on remount, so previously visible output is not restored even though backend chunks still exist.
- New live output can still appear after remount because the stream restarts from `next_seq`.

## Strict slice boundary

- no redesign
- no keep-alive-only solution
- no unrelated terminal feature work
