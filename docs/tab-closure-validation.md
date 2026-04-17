# Last-Tab Closure Validation

Date: `2026-04-17`
Validation mode: `headed / visible browser`

This validation used the repo-root Tide sources as the primary reference for last-tab closure parity and exercised the active compat shell against a live runtime.

## Tide source files checked against visible behavior

- `tideterm/frontend/app/tab/tabbar.tsx`
- `tideterm/frontend/app/tab/tabcontent.tsx`
- `tideterm/frontend/app/workspace/workspace.tsx`
- `tideterm/frontend/app/store/global.ts`
- `tideterm/pkg/service/workspaceservice/workspaceservice.go`
- `tideterm/pkg/wcore/workspace.go`
- `tideterm/pkg/service/objectservice/objectservice.go`

## Exact headed flow used

1. Started a live core runtime with:
   - `RTERM_AUTH_TOKEN=last-tab-parity-token ./scripts/go.sh run ./cmd/rterm-core serve --listen 127.0.0.1:61318 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir <tmp>`
2. Started the frontend dev server with:
   - `VITE_RTERM_API_BASE=http://127.0.0.1:61318`
   - `VITE_RTERM_AUTH_TOKEN=last-tab-parity-token`
   - `npm --prefix frontend run dev -- --host 127.0.0.1 --port 4318 --strictPort`
3. Opened a visible Playwright Chromium window against `http://127.0.0.1:4318/`.
4. Closed tabs one by one through the visible tab chrome:
   - hovered `tab-ops` and clicked the visible close affordance
   - hovered `tab-main` and clicked the visible close affordance
5. Verified the resulting empty state in the visible shell.
6. Queried `/api/v1/workspace` after each close transition.
7. Reloaded the app while empty and re-verified the empty state.
8. Clicked the visible top-bar add-tab button to create a new shell again.
9. Reloaded once more and verified the recreated tab persisted.

## What was visibly verified

- The runtime started with two tabs:
  - `tab-main`
  - `tab-ops`
- Closing `tab-ops` left `tab-main` active and removed the closed widget from the workspace snapshot.
- Closing the last remaining tab succeeded instead of returning a UI or API error.
- After the last close:
  - no tabs remained in the visible shell
  - the shell showed `No Active Tab`
  - `/api/v1/workspace` returned:
    - `tabs: []`
    - `active_tab_id: ""`
    - `widgets: []`
    - `active_widget_id: ""`
- Reloading the app while empty preserved the same tabless state:
  - `No Active Tab` remained visible
  - the workspace snapshot still had zero tabs and empty active ids
- Recovery remained explicit and operator-driven:
  - clicking the visible add-tab button created a single new shell tab
  - the new terminal pane became visible again
  - the workspace snapshot contained one new tab and one new terminal widget
- Reloading after explicit recovery preserved the recreated tab and its active ids.

## Captured evidence

- empty-workspace visible shell:
  - `/tmp/last-tab-closure-empty.png`
- recreated-shell visible state:
  - `/tmp/last-tab-closure-recreated.png`

## Remaining mismatch

- none on the active compat path

## Validation note

This validation was run in a headed, visible Chromium session against a live core/frontend runtime, not in hidden/headless mode.
