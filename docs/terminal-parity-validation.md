# Terminal Parity Validation

## Last verified state

- Date: `2026-04-17`
- State: `VERIFIED` for the active compat terminal parity batch in a live runtime and a headed browser session
- Scope:
  - scrollback hydration on mount
  - copy/paste keyboard shortcuts
  - jump-to-latest keyboard follow behavior
  - drag/drop path insertion
  - open current directory in new block
  - terminal-adjacent shell surfaces still opening after the batch (`AI`, `Tools`, `Audit`, `MCP`, quick actions, remote-profile basics, structured execution)

## Exact headed browser flow used

- Desktop startup smoke:
  - `npm run tauri:dev`
  - observed ready state from the launched desktop process:
    - `{"base_url":"http://127.0.0.1:58764","pid":55207}`
- Live headed terminal parity run:
  - `npx playwright test e2e/terminal-parity.spec.ts -c e2e/playwright.config.ts --headed`
  - result: `5 passed (13.2s)`
- Live headed workflow regression checks:
  - `npx playwright test e2e/quick-actions.spec.ts e2e/structured-execution-block.spec.ts -c e2e/playwright.config.ts --headed`
  - result: `2 passed (10.1s)`
- Additional live headed shell-surface smoke against a manual compat runtime:
  - core:
    - `RTERM_AUTH_TOKEN=terminal-parity-token ./scripts/go.sh run ./cmd/rterm-core serve --listen 127.0.0.1:61270 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-terminal-parity-9iWO38`
  - frontend:
    - `VITE_RTERM_API_BASE=http://127.0.0.1:61270 VITE_RTERM_AUTH_TOKEN=terminal-parity-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4205 --strictPort`
  - headed Playwright smoke:
    - dragged `files-entry-file-README.md` from the files panel into the active terminal and confirmed path insertion
    - opened quick actions
    - triggered `ui.open_tools_panel`
    - verified visible `Tools` surface and `Execute` button
    - triggered `ui.open_audit_panel`
    - verified visible `No audit events available` audit empty state

## What was visibly verified

- Scrollback hydration:
  - terminal output generated before reload was still present after a full page reload
  - live output continued after the hydrated buffer restored
  - buffered markers did not duplicate across the reload boundary
- Copy/paste:
  - terminal selection copied with `Ctrl+Shift+C`
  - clipboard text pasted back into the active PTY path with `Ctrl+Shift+V`
  - pasted command executed only after the explicit `Enter` keypress
- Jump to latest:
  - `Shift+Home` moved the viewport off the live tail
  - new output did not auto-scroll while the viewport stayed away from the tail
  - `Shift+End` returned the viewport to the bottom and follow resumed for subsequent output
- Drag/drop path insertion:
  - a native local file drop inserted the path into the prompt line
  - a files-panel drag into the terminal also inserted the path on the active compat path
  - the path insert did not auto-execute
- Open current directory in new block:
  - terminal context-menu logic exposed `Open Current Directory in New Block`
  - invoking the captured menu item created a new compat `files` block
  - the new block preserved the current local path and rendered directory contents
- Existing shell workflows after the batch:
  - quick actions still opened and routed file, MCP, and remote-profile surfaces
  - `/run` still rendered and acted on a structured execution block in the AI panel
  - tools and audit utility surfaces still opened in a headed browser session

## Tide source files checked against visible behavior

- `tideterm/frontend/app/view/term/termwrap.ts`
- `tideterm/frontend/app/view/term/term.tsx`
- `tideterm/frontend/app/view/term/term-model.ts`
- `tideterm/frontend/app/app.tsx`
- `tideterm/README.md`

These repo-root Tide sources remained the primary behavior reference for the headed validation.

## Remaining mismatch

- Browser compat runtime still does not render the native context menu bridge; the headed browser validation captured the exact menu built by `handleContextMenu` and invoked the real menu-item closure from that captured menu.
- Remote `open current directory in new block` still preserves remote path and connection metadata only; the active compat files block does not browse remote filesystems yet.
