# Frontend UI Recovery State Flow

Date: 2026-04-15

## Live verification baseline

A live browser-hosted frontend was run against the current Go runtime with:

```bash
RTERM_AUTH_TOKEN=ui-recovery-token ./apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52745 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/runa-ui-recovery-state
VITE_RTERM_API_BASE=http://127.0.0.1:52745 VITE_RTERM_AUTH_TOKEN=ui-recovery-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4178 --strictPort
```

Observed runtime data:

- `GET /api/v1/workspace`
  - `active_tab_id: "tab-main"`
  - `active_widget_id: "term-main"`
  - tabs:
    - `tab-main` -> `widget_ids:["term-main"]`
    - `tab-ops` -> `widget_ids:["term-side"]`
- `GET /api/v1/terminal/term-main?from=0`
  - terminal state exists
  - `session_id: "term-main"`
  - `status: "running"`
  - terminal chunks are present

Observed browser console:

- `workspace.active_tab_id=tab-main`
- `workspace.active_widget_id=term-main`
- `terminal.widget_id=term-main`
- `terminal.snapshot=ok next_seq=5 status=running`

Observed DOM after load:

- `document.body` contains only:
  - `<div id="main"></div>`
  - `<script type="module" src="/wave.ts"></script>`

That confirms the backend state exists and the frontend receives it, but the UI root never converts it into visible content.

## Workspace snapshot flow

Current typed workspace path:

1. `frontend/wave.ts`
2. `initBrowserCompatRuntime()`
3. `createCompatApiFacade()`
4. `clients.workspace.getWorkspace()`
5. `WorkspaceSnapshot`

The browser path successfully reaches step 5.

Current store path if the app shell mounts:

1. `frontend/app/workspace/workspace.tsx`
2. `workspaceStore.refresh()`
3. `frontend/app/state/workspace.store.ts`
4. `adaptWorkspaceFromApi()`

State preserved by `workspaceStore` today:

- workspace id
- workspace name
- active tab id
- ordered tab ids
- pinned tab ids

State dropped by `workspaceStore` today:

- tab titles
- tab descriptions
- tab `widget_ids`
- widget inventory
- `active_widget_id`

This is the first state-loss point.

The current visible shell needs more than ordered tab ids:

- `frontend/app/tab/tab.tsx` needs tab title data
- `frontend/app/tab/tabcontent.tsx` needs tab-to-widget content mapping
- the terminal mount needs a widget id

That mapping is present in `/api/v1/workspace`, but it is discarded in `adaptWorkspaceFromApi()`.

## Active tab flow

Typed workspace source of truth:

- `/api/v1/workspace.active_tab_id`
- `workspaceStore.state.active.activetabid`

Visible UI source of truth today:

- `atoms.staticTabId`

Current readers:

- `frontend/app/workspace/workspace.tsx`
  - uses `atoms.staticTabId` to decide whether to show `No Active Tab` and to key `TabContent`
- `frontend/app/tab/tabbar.tsx`
  - uses `atoms.staticTabId` to mark the active tab
- `frontend/app/app.tsx`
  - creates `TabModelContext` from `getTabModelByTabId(tabId)` where `tabId` comes from `atoms.staticTabId`

This is the second state-loss point.

The migrated workspace snapshot can change active tab, but the visible shell still points at the legacy static atom that was originally meant to be fixed at boot.

## Terminal snapshot flow

Current typed terminal path:

1. `frontend/compat/terminal.ts`
2. `frontend/app/state/terminal.store.ts`
3. `frontend/app/view/term/termwrap.ts`

This path is already mostly compatible with the new runtime:

- `terminalStore.refresh(widgetId)` uses `/api/v1/terminal/{widgetId}`
- `terminalStore.startStream(widgetId)` uses `/api/v1/terminal/{widgetId}/stream`
- `terminalStore.sendInput(widgetId, text)` uses `/api/v1/terminal/{widgetId}/input`

The typed terminal data is therefore not missing.

The missing link is the mount path:

- no React root is mounted in browser/Tauri compat mode
- no workspace content tree mounts
- no terminal component receives `widgetId = active_widget_id`

Even if the shell mounts, the current content path still asks for legacy objects:

- `frontend/app/tab/tabcontent.tsx` reads WOS `Tab`
- `frontend/app/block/block.tsx` reads WOS `Block`
- `frontend/app/view/term/term-model.ts` builds from WOS block metadata

The current runtime does not expose the legacy `/wave/*` object graph, so the terminal never reaches the point where `termwrap.ts` can hydrate from the typed snapshot.

## Exact loss points

### 1. Bootstrap layer

`frontend/wave.ts:initBrowserCompatRuntime()`

- typed workspace snapshot fetched: yes
- typed terminal snapshot fetched: yes
- React app mounted: no

### 2. Mapping layer

`frontend/app/state/workspace.store.ts:adaptWorkspaceFromApi()`

- `active_tab_id` preserved: yes
- `active_widget_id` preserved: no
- `tabs[].widget_ids` preserved: no
- `tabs[].title` preserved: no
- `widgets[]` preserved: no

### 3. Selector layer

Visible components still key off legacy `atoms.staticTabId` and WOS objects instead of the typed workspace snapshot:

- `frontend/app/workspace/workspace.tsx`
- `frontend/app/tab/tabbar.tsx`
- `frontend/app/tab/tab.tsx`
- `frontend/app/tab/tabcontent.tsx`

## Recovery implication

The minimum render recovery does not require a redesign.

It requires three narrow corrections:

1. mount the existing shell in browser/Tauri compat mode
2. preserve enough workspace snapshot data to map active tab -> widget -> title
3. drive visible active-tab and terminal mounting from the typed workspace snapshot instead of legacy WOS-only selectors
