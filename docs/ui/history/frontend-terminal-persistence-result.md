# frontend terminal persistence result

Date: `2026-04-16`

## Cause

- `CompatTerminalView` remounts on tab switch because the active tab content is keyed by tab/widget identity.
- On remount, `TermWrap` fetched the backend snapshot correctly, but snapshot replay marked `lastAppliedSnapshotSeq` as `snapshot.next_seq` before iterating `snapshot.chunks`.
- The replay loop then skipped the fetched chunks as already applied, so the renderer came back with an empty visible buffer until new live output arrived.

## Change

- `frontend/app/view/term/termwrap.ts` now replays snapshot chunks before advancing the applied snapshot sequence for remount restore.
- Initial remount restore replays the full fetched snapshot into a fresh renderer state.
- Later snapshot updates only replay chunks newer than the last applied snapshot sequence, so duplicate restore is avoided.
- Session changes still reset the renderer before replaying the new session snapshot.

## Result

- Remount replay now restores prior visible output after `Main Shell -> Ops Shell -> Main Shell`.
- Repeating the tab switch does not duplicate the restored lines.
- New commands entered after restore continue to stream into the same renderer state.
- Mid-stream tab switching was validated separately in `docs/frontend-terminal-midstream-validation.md`; the renderer restored hidden-tab output and continued live output after return without duplicate markers.

## Remaining limitation

- The mid-stream validation used line-oriented stdout markers. A separate ANSI-heavy redraw workload has not been validated in this slice.
