# Terminal Slice 5 Result

## What terminal path now uses from the new stack

- `frontend/app/view/term/termwrap.ts`
  - terminal snapshot now comes from `getTerminalFacade().getSnapshot(blockId)` (typed API client path).
  - terminal stream now comes from `getTerminalFacade().consumeStream(...)`.
  - stream subscription uses abortable lifecycle via `AbortController`.
  - input send path uses `getTerminalFacade().sendInput(...)` through `TermViewModel.sendDataToController`.
- `frontend/compat/terminal.ts`
  - exposes terminal bridge functions and stream-mode helpers used by terminal UI.
  - wires runtime stream auth mode into stream calls and URL builder.
- `frontend/rterm-api/terminal/**`
  - terminal snapshot/input/stream client methods are now the terminal transport source.
- `frontend/rterm-api/http/sse.ts`
  - terminal SSE parsing and cancelation support are used by the stream flow.
- `frontend/runtime/**`
  - runtime config/stream URL behavior is now the source of truth for terminal auth/query-token handling.

## What still remains legacy for now

- Terminal restart/stop/session-list management commands still use legacy store RPC calls (`ControllerStopCommand`, `ControllerResyncCommand`, `ControllerInputCommand` fallback in non-migrated sticker path).
- Terminal UI state and runtime metadata updates remain in legacy model/store logic.
- `frontend/app/view/term/termsticker.tsx` still uses legacy controller input for sticker quick actions.

## What remains deferred to workspace slice

- Workspace path migration is not migrated in this slice.
- Workspace mutation flows and workspace-level terminal orchestration remain untouched.

## Known limitations / temporary shims

- Stream auth uses query-token when backend/auth/runtime config requires it; no websocket or alternate transport was introduced.
- Interrupt semantics are intentionally unchanged because no dedicated terminal HTTP interrupt endpoint exists in the current backend contract.
- Legacy terminal transport paths are kept for non-terminal core-path callers until Slice 6.
