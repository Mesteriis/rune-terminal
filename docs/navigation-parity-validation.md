# Navigation Parity Validation

## Last verified state

- Date: `2026-04-17`
- State: `VERIFIED` for the navigation / launcher parity batch in a live runtime and a headed, visible browser session
- Scope:
  - workspace switcher behavior
  - launcher discoverability and action entry
  - launcher/switcher overlay stacking
  - launcher/switcher positioning and viewport bounds
  - shell fill/stretch behavior affecting those surfaces
  - adjacent shell regressions: terminal, quick actions, structured execution, tools, audit, MCP, remote-context basics, and window behavior parity

## Exact headed browser flow used

- Desktop startup smoke:
  - `npm run tauri:dev`
  - observed desktop process launch:
    - `{"base_url":"http://127.0.0.1:56181","pid":26701}`
- Live headed parity and regression sweep:
  - `npx playwright test e2e/navigation-parity.spec.ts e2e/quick-actions.spec.ts e2e/structured-execution-block.spec.ts e2e/window-behavior.spec.ts e2e/terminal-parity.spec.ts -c e2e/playwright.config.ts --headed`
  - result: `11 passed (35.1s)`
- Release gate sweep used alongside the headed proof:
  - `npm run validate`
  - result: passed
- The browser run above was headed and visible, not hidden.

## What was visibly verified

- Workspace switcher:
  - the top-left shell button opened a compact switcher popover anchored below the button
  - an unsaved workspace showed `Open workspace` with a `Save workspace` action
  - saving the current workspace produced a persisted named row with Tide-aligned default icon/color metadata
  - a new unsaved workspace could be created explicitly from the same switcher
  - selecting the saved row switched back to that workspace and restored the `Switch workspace` title state
- Launcher discoverability:
  - the launcher remained visibly discoverable from the compat shell action rail
  - the launcher surface opened with visible operator-driven actions, including files and local terminal creation
  - selected-file context and local-vs-remote gating stayed visible inside the launcher/quick-actions surface
- Layer / stacking / position / stretch:
  - launcher and files overlays stayed within the viewport bounds in the headed browser
  - opening `Files` after `Launcher` dismissed the launcher instead of stacking overlapping flyouts
  - the workspace switcher stayed anchored in the top-left shell area without clipping
  - the right utility rail stretched to the same height as the main compat content row
- No-break regressions:
  - terminal parity behaviors still passed in the same headed sweep
  - quick actions still opened files and MCP controls
  - structured execution still rendered and acted on `/run` blocks
  - tools and audit utility surfaces still opened visibly
  - window split/drop/focus/persistence behavior still passed

## Tide source files checked against visible behavior

- `tideterm/frontend/app/tab/workspaceswitcher.tsx`
- `tideterm/frontend/app/tab/workspaceswitcher.scss`
- `tideterm/frontend/app/view/launcher/launcher.tsx`
- `tideterm/frontend/app/store/keymodel.ts`
- `tideterm/frontend/app/workspace/widgets.tsx`
- `tideterm/frontend/app/workspace/workspace.tsx`
- `tideterm/frontend/app/element/popover.tsx`
- `tideterm/frontend/app/element/popover.scss`
- `tideterm/frontend/layout/lib/TileLayout.tsx`
- `tideterm/frontend/layout/lib/tilelayout.scss`
- `tideterm/pkg/wcore/workspace.go`
- `tideterm/pkg/wcore/window.go`
- `tideterm/pkg/service/workspaceservice/workspaceservice.go`

These repo-root Tide sources were used as the primary reference for the headed validation.

## Remaining mismatch

- The compat launcher remains an adaptation on the existing quick-actions/right-rail surface instead of Tide's dedicated launcher block, but the visible discoverability, explicit operator-driven action selection, and bounded overlay behavior matched the reference intent validated in this batch.
- The compat browser runtime remains single-window, so the headed validation could not exercise Tide's cross-window workspace focus transfer path from `wcore.SwitchWorkspace`; user-visible save/create/edit/switch behavior was validated directly.
