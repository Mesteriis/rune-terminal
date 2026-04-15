# Frontend UI Recovery Baseline

Date: 2026-04-15

## Scope

This document captures the active frontend render path for the release-blocking UI recovery slice:

- visible workspace
- active tab
- terminal widget rendering
- backend-to-UI data flow

It is limited to identifying the current render tree and the state gates that block content from appearing.

## Root render path

The active frontend entrypoint is still `frontend/wave.ts`.

Current startup flow:

1. `DOMContentLoaded` calls `initBare()`.
2. `initBare()` checks whether `window.api` exists through `hasElectronPreloadApi()`.
3. In browser/dev and current Tauri runtime, `window.api` is absent, so `initBare()` takes the browser-compat branch.
4. The browser-compat branch calls `initBrowserCompatRuntime()`.
5. `initBrowserCompatRuntime()` validates typed runtime access by requesting:
   - `/healthz`
   - `/api/v1/bootstrap`
   - `/api/v1/workspace`
   - `/api/v1/terminal/{widget_id}`
6. After validation it calls `setDocumentVisible()`.

Critical finding:

- The browser-compat branch does not call `initWave()`.
- It does not create a React root.
- It does not render `<App />`.

That means the current browser/Tauri path can confirm backend health while still leaving the UI visually empty.

## Workspace render path

If the app root is mounted, the current workspace render chain is:

1. `frontend/wave.ts`
2. `frontend/app/app.tsx` -> `<App />`
3. `frontend/app/app.tsx` -> `<Workspace />`
4. `frontend/app/workspace/workspace.tsx`
5. `frontend/app/tab/tabbar.tsx`
6. `frontend/app/tab/tabcontent.tsx`
7. `frontend/app/workspace/widgets.tsx`

Inside `Workspace`:

- `workspaceStore` is the active typed state source for workspace snapshot reads and tab mutations.
- `TabBar` receives the active workspace summary from `workspaceStore`.
- Main content currently keys off `tabId !== ""`, where `tabId` is read from `atoms.staticTabId`.

## Terminal render path

The current terminal render chain is still the imported TideTerm block path:

1. `frontend/app/tab/tabcontent.tsx`
2. `frontend/app/block/block.tsx`
3. `frontend/app/view/term/term-model.ts`
4. `frontend/app/view/term/term.tsx`
5. `frontend/app/view/term/termwrap.ts`

Data expectations in that chain:

- `TabContent` expects a legacy `Tab` object from WOS.
- `TabContent` expects `tab.blockids` to exist.
- `Block` expects a legacy `Block` object from WOS.
- `TermViewModel` expects block metadata from WOS and still touches legacy RPC/event paths.
- `TermWrap` is already migrated for the terminal snapshot/input/stream data path and uses `terminalStore` plus `compat/terminal`.

## Conditions currently blocking visible content

### 1. React never mounts in the active browser/Tauri path

`initBrowserCompatRuntime()` verifies the new runtime APIs but never mounts the app root.

Immediate effect:

- no workspace shell
- no tabs
- no terminal surface

### 2. Active content still depends on legacy WOS objects that the current runtime does not provide

The shell is partially migrated:

- workspace mutations and snapshot reads use `workspaceStore`
- terminal snapshot/input/stream use `terminalStore`

But the visible center-stage render path still depends on legacy objects:

- `TabBar` tab labels come from WOS-backed `Tab` objects in `frontend/app/tab/tab.tsx`
- `TabContent` reads WOS-backed `Tab` objects and expects `blockids`
- `Block` and `TermViewModel` read WOS-backed `Block` objects and legacy metadata

The current Go runtime exposes typed `/api/v1/*` routes, not legacy `/wave/*` object endpoints, so these WOS reads do not have a matching active backend source.

### 3. Active tab selection is split between migrated workspace state and legacy static atoms

The migrated workspace snapshot carries:

- `active_tab_id`
- `active_widget_id`

But visible content still keys off legacy atoms:

- `Workspace` reads `atoms.staticTabId`
- `TabBar` highlights against `atoms.staticTabId`
- `TabModelContext` is created from that same static tab id in `App`

That means even after workspace API data exists, the visible active-tab render path is not driven directly from the typed workspace snapshot.

## Recovery implication

The render failure is not a styling or layout problem.

It is a state-path problem with two layers:

1. the active browser/Tauri bootstrap path stops before mounting React
2. the mounted shell still mixes typed workspace state with legacy WOS-dependent content state

The minimal recovery path should therefore focus on:

- mounting the existing app shell in browser/Tauri mode
- mapping typed workspace state into the existing visible tab/workspace path
- mounting a terminal surface from the typed terminal snapshot/stream path without reopening a broad frontend rewrite
