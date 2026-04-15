# Workspace Slice 6 Result

## What workspace path now uses from the new stack

- `frontend/app/tab/tabbar.tsx` now uses `frontend/compat/workspace` for:
  - tab selection/focus (`focusTab`),
  - terminal tab creation (`createTerminalTab`),
  - tab close (`closeTab`),
  - pin/unpin (`setTabPinned`),
  - drag reorder (`moveTab`) by publishing per-tab moves and pin boundary changes.
- `frontend/app/tab/tab.tsx` now uses `frontend/compat/workspace` for tab rename (`renameTab`) via tab context UI.
- `frontend/app/store/keymodel.ts` now uses `frontend/compat/workspace` for:
  - keyboard tab focus shortcuts (`focusTab`),
  - `Cmd+t` tab creation (`createTerminalTab`),
  - close-active-static-tab command (`closeTab`).
- `frontend/compat/workspace.ts` remains the only new workspace seam exposed to UI callsites and is backed by `frontend/runtime` + `frontend/rterm-api/workspace`.

## What workspace path still leaves legacy

- Workspace list/switch/update flows in `frontend/app/tab/workspaceswitcher.tsx` and metadata editing in `frontend/app/tab/workspaceeditor.tsx` still use legacy workspace service calls.
- Base active workspace bootstrap and layout shell wiring still comes from legacy store/WOS paths (`frontend/app/store/global.ts`, `frontend/wave.ts`).
- Non-tab workspace interactions that are not in direct active terminal-tab operations were intentionally not migrated in this slice.
- Legacy workspace/tab forwarding helpers in `frontend/app/store/global.ts` (`createTab`, `setActiveTab`) were removed because they are dead and not on the active runtime path after slice 6 migration.

## Temporary shims introduced

- `frontend/compat/workspace` facade methods are used as the migration entry for supported workspace operations.
- `TabBar` reorder logic now translates drag/drop reorder into API `moveTab` calls with per-tab `before_tab_id` payloads.

## Deferred scope

- Broad legacy `app/store` or `app/workspace` refactor was intentionally avoided.
- Workspace switcher behavior and other non-tab migration paths are intentionally left for follow-up work.
