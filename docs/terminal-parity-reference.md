# Terminal Parity Reference

Date: `2026-04-17`
Phase: stability hardening
Scope: terminal-domain parity closure against TideTerm source checked directly from the repo-root `tideterm/` tree

This document uses the repo-root TideTerm sources as the primary reference for terminal parity in this batch.
Secondary docs were used only after the source files below were inspected.

## Tide source files inspected

- `tideterm/frontend/app/view/term/termwrap.ts`
  - scrollback hydration on mount
  - clipboard paste handling
  - native local drag/drop path insertion
  - terminal current-directory tracking via OSC 7
- `tideterm/frontend/app/view/term/term.tsx`
  - drag/drop path insertion from TideTerm `FILE_ITEM` drags into a terminal block
- `tideterm/frontend/app/view/term/term-model.ts`
  - keyboard shortcut behavior for copy/paste
  - keyboard jump-to-latest / scroll-to-bottom behavior
- `tideterm/frontend/app/app.tsx`
  - open current directory in new block from terminal context menu
- `tideterm/README.md`
  - product-level wording for drag/drop and open-directory behavior
  - used only as a consistency check after inspecting the implementation files above

## Extracted reference behavior

### Scrollback hydration on mount

Primary source:
- `tideterm/frontend/app/view/term/termwrap.ts`

Reference behavior:
- TideTerm restores buffered terminal output before live follow starts.
- `loadInitialTerminalData()` replays cached serialized terminal state first (`cache` file plus stored PTY offset).
- It then loads the main terminal output file from the saved offset and writes that data into xterm before marking the terminal as loaded.
- Live output arrives through the file-subject subscription after initial replay.
- The reference behavior is "restore prior buffer first, then follow live output" rather than "mount empty and wait for new chunks."

Adaptation note for RunaTerminal:
- TideTerm uses cache file + append-file replay; RunaTerminal uses HTTP snapshot + SSE.
- User-visible parity requirement is still the same: restore buffered output before live follow, without missing or duplicate lines.

### Copy/paste keyboard shortcuts

Primary source:
- `tideterm/frontend/app/view/term/term-model.ts`
- `tideterm/frontend/app/view/term/termwrap.ts`

Reference behavior:
- `Ctrl+Shift+V` triggers native paste into the terminal.
- `Ctrl+V` also pastes when TideTerm's `app:ctrlvpaste` setting allows it; default is enabled on Windows and disabled on macOS/Linux.
- `Ctrl+Shift+C` copies the current terminal selection to the clipboard.
- `termwrap.ts` also supports copy-on-select when the `term:copyonselect` setting is enabled.
- Clipboard paste handling in `termwrap.ts` supports both text and image blobs, with images materialized to temp files and pasted as paths.

### Jump-to-latest

Primary source:
- `tideterm/frontend/app/view/term/term-model.ts`

Reference behavior:
- `Shift+End` scrolls the terminal to the latest output.
- `Shift+Home` scrolls to the start of scrollback.
- On macOS, `Cmd+End` and `Cmd+Home` provide the same bottom/top behavior.
- `Shift+PageDown` and `Shift+PageUp` scroll by pages.

Observed source limitation:
- I did not find a dedicated visible TideTerm "Jump to latest" button in the inspected terminal source files.
- The inspected reference behavior for "jump to latest" is keyboard-driven scroll control plus normal xterm follow behavior while already at bottom.

### Drag/drop path insertion

Primary source:
- `tideterm/frontend/app/view/term/termwrap.ts`
- `tideterm/frontend/app/view/term/term.tsx`

Reference behavior:
- Native local file drops are handled directly in `termwrap.ts`.
- TideTerm prevents the browser default file-drop navigation behavior.
- Native local file drop only inserts paths for local terminals; remote terminals show `dropEffect = "none"` and do not accept native OS file drops.
- Native local file paths are normalized by:
  - preserving roots
  - stripping trailing path separators
  - shell-escaping whitespace and common shell metacharacters
  - joining multiple dropped paths with spaces
- TideTerm also accepts in-app `FILE_ITEM` drags in `term.tsx`.
- `FILE_ITEM` drops are accepted only when the dragged file connection matches the terminal connection.
- For `FILE_ITEM` drops, TideTerm resolves the path through `FileInfoCommand` when possible, falls back to URI parsing, removes a leading `/~` when present, then pastes the path into the terminal input without auto-executing it.

### Open current directory in new block

Primary source:
- `tideterm/frontend/app/app.tsx`

Reference behavior:
- Right-click inside a terminal block opens a context menu.
- If the terminal has tracked `cmd:cwd`, the context menu includes `Open Current Directory in New Block`.
- For multi-session terminal blocks, TideTerm prefers the active sub-session's `cmd:cwd` and connection metadata over the parent block's values.
- The action creates a new block with:
  - `view: "preview"`
  - `file: termCwd`
  - `connection: termConnection`
- TideTerm therefore opens the current directory as a Files/preview-style block rather than executing any command.

## Ambiguities found in source

- `Jump-to-latest control`:
  - the parity matrix wording suggests a visible control, but the inspected Tide terminal code showed keyboard-driven scroll-to-bottom behavior instead of a distinct visible button.
- `Open current directory in new block`:
  - `app.tsx` proves the new preview block payload, but block placement is delegated to `createBlock()` and the legacy layout model; the exact placement policy is not explicit in the context-menu handler itself.
- `Scrollback hydration`:
  - TideTerm transport is file-backed rather than snapshot/SSE-backed, so transport internals are not directly portable; parity must be judged on restored-output behavior, not implementation shape.

## Reference conclusion

For this batch, the canonical reference came from the repo-root TideTerm implementation files under `tideterm/frontend/app/...`, with `tideterm/README.md` used only as a consistency check.

## Validation-backed outcome

- Scrollback hydration:
  - RunaTerminal now restores buffered output through an atomic snapshot + subscribe handoff before live follow.
  - Headed browser validation confirmed no missing or duplicate buffered markers across reload.
- Copy/paste shortcuts:
  - active compat terminal now matches the inspected TideTerm keyboard semantics:
    - `Ctrl+Shift+C`
    - `Ctrl+Shift+V`
    - optional `Ctrl+V` under TideTerm's platform/setting rules
- Jump to latest:
  - the inspected TideTerm reference remained keyboard-driven rather than button-driven
  - RunaTerminal now matches that keyboard bottom/top/page navigation behavior on the active compat path
- Drag/drop path insertion:
  - headed validation covered both native local file drop and files-panel drag into the terminal
  - terminal-side connection matching and no-auto-execute behavior now align with the inspected TideTerm source
- Open current directory in new block:
  - active compat terminal now exposes the context-menu action and opens a new backend-owned files block with the current path and connection context
  - local directory blocks can browse outside the workspace root
  - remote directory blocks currently preserve path/connection metadata but remain read-only in the compat files view
