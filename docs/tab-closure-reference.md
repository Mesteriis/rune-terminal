# Last-Tab Closure Reference

Date: `2026-04-17`
Phase: `1.0.0-rc1` hardening

This document uses the repo-root Tide sources as the primary reference for last-tab closure parity.

## Exact Tide source files inspected

- `tideterm/frontend/app/tab/tabbar.tsx`
  - top-level tab close handler; confirms the UI path does not special-case the final tab before calling close
- `tideterm/frontend/app/tab/tabcontent.tsx`
  - tab content behavior when the current tab object is missing or empty
- `tideterm/frontend/app/workspace/workspace.tsx`
  - workspace rendering when `atoms.staticTabId` is empty; confirms the visible empty-workspace state
- `tideterm/frontend/app/store/global.ts`
  - add-tab entry point; confirms Tide keeps explicit tab creation instead of hidden fallback creation
- `tideterm/pkg/service/workspaceservice/workspaceservice.go`
  - service return contract after close; distinguishes `newactivetabid` from `closewindow`
- `tideterm/pkg/wcore/workspace.go`
  - canonical tab deletion logic; determines the next active tab and the empty-workspace case
- `tideterm/pkg/service/objectservice/objectservice.go`
  - explicit error path for actions that require an active tab after the workspace becomes empty

## Extracted Tide behavior

### Can the last tab be closed?

Yes.

Evidence:

- `tideterm/frontend/app/tab/tabbar.tsx`
  - `handleCloseTab` always calls `getApi().closeTab(ws.oid, tabId)` and does not guard on tab count
- `tideterm/pkg/wcore/workspace.go`
  - `DeleteTab(...)` sets `newActiveTabId = ""` when no pinned or unpinned tabs remain

### What happens after closing the final tab?

Tide does not auto-create a replacement tab.

The resulting state is:

- no active tab
- no implicit fallback shell
- explicit empty-workspace rendering on the active shell

Evidence:

- `tideterm/pkg/wcore/workspace.go`
  - when the closed tab was the final remaining tab, `ws.ActiveTabId = ""`
- `tideterm/pkg/service/workspaceservice/workspaceservice.go`
  - `CloseTab(...)` returns `CloseWindow = true` when `newActiveTabId == ""`
  - it does not create a replacement tab or synthesize a fallback tab id
- `tideterm/frontend/app/workspace/workspace.tsx`
  - when `tabId === ""`, the workspace renders `CenteredDiv>No Active Tab</CenteredDiv>`

### Does Tide create a fallback tab automatically?

No.

The inspected Tide sources show explicit add-tab creation only:

- `tideterm/frontend/app/tab/tabbar.tsx`
  - `handleAddTab()` calls `createTab()`
- `tideterm/frontend/app/store/global.ts`
  - `createTab()` delegates to `getApi().createTab()`

There is no inspected Tide source that auto-creates a hidden fallback tab after the last one is closed.

### What happens to follow-on actions when there is no active tab?

Actions that require a tab fail explicitly instead of silently rehydrating one.

Evidence:

- `tideterm/pkg/service/objectservice/objectservice.go`
  - `CreateBlock(...)` returns `no active tab` when `uiContext.ActiveTabId == ""`

This shows Tide treats the empty-workspace state as valid and operator-visible, not as an invalid transient that must be hidden by automatic tab creation.

## Edge cases from the inspected source

- If the closed tab was active and other tabs remain:
  - `tideterm/pkg/wcore/workspace.go` selects another existing tab and sets `ActiveTabId` accordingly
  - if normal tabs remain, the selection moves to the nearest remaining unpinned tab according to the removed tab position
  - if no normal tabs remain but pinned tabs do, it falls back to the first pinned tab
- If no tabs remain:
  - `ActiveTabId` becomes `""`
  - the workspace service reports `closewindow: true`
  - the workspace UI has an explicit `No Active Tab` state
- Actions that depend on an active tab remain explicit:
  - they error with `no active tab` instead of triggering automatic recovery

## Reference summary

The inspected Tide behavior is:

1. allow the last tab to close
2. do not auto-create a replacement tab
3. leave the workspace in an explicit empty state with no active tab
4. require the operator to create a new tab explicitly when they want to continue

These repo-root Tide sources were inspected directly and used as the primary reference for this batch.
