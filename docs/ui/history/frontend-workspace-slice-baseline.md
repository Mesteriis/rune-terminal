# Workspace Migration Baseline (Slice 6)

## 1) Current workspace UI entry path

- `frontend/app/app.tsx` renders `<Workspace />` inside the active app shell.
- `frontend/app/workspace/workspace.tsx` is the workspace layout container used by the active UI.
- `frontend/app/tab/tabbar.tsx` owns tab bar interactions:
  - add tab button
  - tab selection
  - close
  - pin/unpin
  - drag/reorder state updates
- `frontend/app/tab/tab.tsx` owns tab rename interaction.
- `frontend/app/tab/workspaceswitcher.tsx` owns workspace switcher controls and metadata editor surface.
- `frontend/app/tab/workspaceeditor.tsx` fetches workspace metadata values and pushes metadata edits.
- `frontend/store/global.ts` provides `atoms.workspace` from WOS-backed window/workspace objects and exports legacy entry helpers (`getApi`, `createTab`, `setActiveTab`).

## 2) Workspace dependency map (minimum set)

- State + active workspace snapshot:
  - `frontend/app/store/global.ts` (`atoms.workspace` and related atoms)
  - `frontend/app/workspace/workspace.tsx` (passes active workspace into tab UI)
- Legacy transport/runtime coupling:
  - `frontend/app/store/services.ts` (`WorkspaceService`, `ObjectService`)
  - `frontend/app/store/global.ts` (`getApi()`, `createTab()`, `setActiveTab()`)
- Workspace operation callsites:
  - `frontend/app/tab/tabbar.tsx`: create, focus/select, close, pin/unpin, reorder
  - `frontend/app/tab/tab.tsx`: rename
  - `frontend/app/tab/workspaceswitcher.tsx`: list workspaces, switch workspace, create/save/delete workspace
  - `frontend/app/store/keymodel.ts`: keyboard workspace tab navigation and close

## 3) Migration boundary for this slice

- Migrated now:
  - active workspace tab operations that map to the typed HTTP contract (`focus tab`, `focus/rename/pin/move/close tab`, and terminal-tab creation)
  - selection and close paths used by tab bar and keyboard actions
- Remains intentionally deferred:
  - workspace list/switch/create/update/delete (no dedicated HTTP endpoints in current transport contract)
  - workspace editor metadata sources beyond what is actively wired through typed clients
- Broad workspace feature cleanup and terminal migration are excluded.

## 4) Safety rules for this slice

- Preserve workspace visual structure and class names.
- Keep terminal migration and terminal code intact.
- Do not perform broad `frontend/app/store/**` refactors.
- Do not redesign workspace logic beyond the minimum migrated operations.
