# Frontend UI Recovery Confirmation

Date: 2026-04-15

## Scope

This document confirms the stability-critical UI recovery slice for the visible workspace and terminal:

- workspace shell renders again in the active browser/Tauri compat path
- active tab is visible and driven from typed workspace state
- terminal widget mounts from the typed terminal snapshot/stream path
- backend data now reaches visible UI without depending on legacy WOS-only objects

## What Was Broken

The empty UI was caused by a render-path failure, not a layout or styling issue.

Primary blockers were:

- `frontend/wave.ts` browser compat startup validated `/api/v1/*` successfully but never mounted React
- `workspaceStore` dropped `active_widget_id`, tab titles, tab `widget_ids`, and widget inventory from the typed workspace snapshot
- the visible shell still mounted legacy WOS-dependent pieces in compat mode:
  - tab title reads
  - tab content WOS tab/block lookup
  - modal renderer
  - workspace/theme refreshes over `/wave/service`
- compat terminal mounting still inherited legacy key/WOS/WSH assumptions that produced render or interaction errors

## What Was Fixed

The recovery stayed within the existing shell and terminal components.

Narrow fixes applied:

- browser compat startup now initializes globals, hydrates `workspaceStore`, creates a React root, and renders `<App compatMode />`
- `workspaceStore` now preserves:
  - `active_widget_id`
  - tab titles and descriptions
  - tab `widget_ids`
  - widget inventory and connection ids
- compat workspace rendering now uses typed workspace state for:
  - active tab selection
  - tab titles
  - active widget lookup
- compat tab content mounts a minimal terminal wrapper directly from `active tab -> widget -> terminal widget`
- compat mode skips legacy WOS-only mounts that were breaking render:
  - `ModalsRenderer`
  - AI panel ref/meta initialization
  - workspace list/theme refreshes
  - legacy tab-title object reads
- browser compat startup now installs a no-op tab RPC client so terminal startup no longer crashes on missing legacy WSH transport
- compat terminal input uses `terminalStore.sendInput()` and overrides local-connection checks from typed workspace widget metadata instead of WOS block reads
- compat terminal disables WebGL so tab switches can dispose/remount terminals cleanly in the compat path

## Live Verification

Validation environment:

```bash
RTERM_AUTH_TOKEN=ui-recovery-token ./apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52745 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/runa-ui-recovery-state
VITE_RTERM_API_BASE=http://127.0.0.1:52745 VITE_RTERM_AUTH_TOKEN=ui-recovery-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4178 --strictPort
npx tsc -p frontend/tsconfig.json --noEmit
npm --prefix frontend run build
```

Live browser verification used MCP Playwright against `http://127.0.0.1:4178/`.

Observed results:

- the page renders the workspace shell instead of a blank `#main`
- visible tabs render from typed workspace state
- terminal widget renders and shows buffered output
- terminal input posts to `POST /api/v1/terminal/<widget>/input` with `200 OK`
- typed input echoed into the visible terminal surface
- tab switching triggers `POST /api/v1/workspace/focus-tab` with `200 OK`
- after tab switch, `/api/v1/workspace.active_tab_id` matched the clicked tab and the terminal remounted for that tab

Tab-switch smoke note:

- a second terminal tab was created in the temporary validation state via `POST /api/v1/workspace/tabs` so tab switching could be verified explicitly after an earlier browser misclick closed the extra tab in that temp state

## Remaining Acceptable Issues

These were observed during live validation but did not block the recovered render path:

- dev console still reports repeated font decode warnings for the bundled font assets served by the current dev environment
- dev console still shows generic `A network error occurred.` messages from existing terminal/browser integrations
- this slice did not attempt to restore or validate broader legacy areas such as workspace switcher editing flows, AI panel behavior, or non-terminal widget parity

## Result

For the active recovery slice, the UI is restored to a usable state:

- workspace visible
- active tab visible
- terminal visible
- backend-to-UI data flow confirmed
