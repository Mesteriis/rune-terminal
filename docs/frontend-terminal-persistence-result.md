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

## Remaining limitation

- This hotfix validation covered short command output and repeated remount replay. It did not run a separate long-running command while switching tabs mid-stream.
