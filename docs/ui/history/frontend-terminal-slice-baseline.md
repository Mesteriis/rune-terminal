# Terminal Migration Baseline (Slice 5)

## 1) Current terminal UI entry path

- `frontend/app/workspace/` owns terminal tab layout and block registration, which instantiates terminal block models from `TermViewModel`.
- `frontend/app/view/term/term-model.ts`
  - Creates terminal model instances for `viewType === "term"`.
  - Owns most terminal runtime commands for terminal control flow (`sendDataToController`, `forceRestartController`, session create/kill helpers, and `resyncController`).
  - Builds and mounts `TermWrap` in `TerminalView` via `termRef`.
- `frontend/app/view/term/term.tsx`
  - Renders terminal UI.
  - Creates `TermWrap` with `sendDataHandler` from `TermViewModel`.
- `frontend/app/view/term/termwrap.ts`
  - Owns terminal stream and terminal output rendering path.
  - Fetches legacy file state with `fetchWaveFile` in `loadInitialTerminalData`.
  - Subscribes to legacy file subject events via `getFileSubject` in `initTerminal`.
  - Sends terminal input by calling back into `sendDataHandler`.

## 2) Terminal dependency map (minimum set)

- Terminal view/model entry
  - `frontend/app/view/term/term.tsx`
  - `frontend/app/view/term/term-model.ts`
  - `frontend/app/view/term/termwrap.ts`

- Legacy terminal transport dependencies
  - `frontend/app/store/wps.ts` (`getFileSubject`, `WSFileEventData` subscription lifecycle)
  - `frontend/app/store/global.ts` (`fetchWaveFile` for `TermFileName` / `cache:term:full`)
  - `frontend/app/store/wshclientapi.ts` (`ControllerInputCommand`, `ControllerResyncCommand`, `ControllerStopCommand`, `SetRTInfoCommand`)
  - `frontend/app/store/wshrpcutil.ts` (`TabRpcClient` + route registration)
  - `frontend/app/store/wshclient.ts` and `frontend/app/store/ws.ts` (indirect websocket command transport)

- Terminal state helpers tied to active terminal path
  - `frontend/app/view/term/termsticker.tsx` (legacy sticker command sender)
  - `frontend/app/view/term/term-wsh.tsx` (legacy command callbacks and helper terminal metadata path)
  - `frontend/app/view/term/shellblocking.ts` and `frontend/app/view/term/termutil.ts`

## 3) Migration boundary for this slice

- This slice migrates only the terminal runtime dataflow used by the active terminal flow:
  - initial terminal state/snapshot retrieval,
  - send input,
  - live output stream consumption,
  - stream resume point handling,
  - terminal restart/resync command path remains as legacy RPC in this slice.

- Workspace path migration is explicitly excluded and remains on existing Wave/store logic.

- Session/session-list UI behavior remains in legacy model code; only terminal transport for terminal session blocks is migrated where active callsites are touched.

## 4) Safety rules for this slice

- Do not change terminal visual markup, styles, or class names except for transport-path wiring.
- Do not touch terminal runtime logic outside active terminal model/view path.
- Do not migrate workspace UI or workspace navigation/store behavior.
- Do not perform broad store refactors; keep migration to minimum active terminal callsites.
