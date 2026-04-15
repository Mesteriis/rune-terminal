# Frontend Compat Console Slice

Date: `2026-04-15`

## Scope

This slice only hardens the active compat runtime path used by:

- browser/dev startup through `frontend/wave.ts`
- compat app mount through `frontend/app/app.tsx`
- workspace/tab render through `frontend/app/workspace/workspace.tsx`, `frontend/app/tab/tabbar.tsx`, and `frontend/app/tab/tabcontent.tsx`
- compat terminal mount and input through `frontend/app/view/term/compat-terminal.tsx` and `frontend/app/view/term/termwrap.ts`
- compat workspace state through `frontend/app/state/workspace.store.ts`

Out of scope:

- AI panel behavior
- workspace editing flows
- unrelated legacy cleanup
- broad frontend parity work

## Runtime Trace

Observed active execution path for the visible compat shell:

1. `frontend/index.html` loads `frontend/wave.ts`
2. `frontend/wave.ts:initBrowserCompatRuntime()` resolves the typed compat API and fetches bootstrap, workspace, and active terminal snapshot
3. `frontend/wave.ts:initBrowserCompatApp()` hydrates `workspaceStore` and renders `<App compatMode />`
4. `frontend/app/app.tsx:CompatAppInner` renders `<Workspace compatMode />`
5. `frontend/app/workspace/workspace.tsx` subscribes to `workspaceStore` and renders:
   - `TabBar`
   - `TabContent`
   - compat terminal widget for the active tab
6. `frontend/app/tab/tabcontent.tsx:CompatTabContent` resolves the active terminal widget from the typed workspace snapshot
7. `frontend/app/view/term/compat-terminal.tsx` mounts `TermWrap`
8. `frontend/app/view/term/termwrap.ts` hydrates terminal output, opens the typed stream, and sends keyboard input through `terminalStore.sendInput()`

## Issue Mapping

### `A network error occurred.`

- Live source:
  `frontend/util/fontutil.ts`
- Live call site:
  `frontend/wave.ts:initBrowserCompatApp()` calling `loadFonts()`
- Real cause:
  compat startup was still calling the legacy custom-font loader, which attempted to load eight `/fonts/*` assets that do not exist in the active frontend tree. Each `FontFace.load()` rejection surfaced as an unhandled `NetworkError`.
- Fix:
  compat startup no longer calls `loadFonts()`. The compat path now uses browser fallback fonts instead of the missing legacy font bundle.
- Why this is on the active path:
  `initBrowserCompatApp()` runs before the compat shell is rendered on every dev/browser startup.

### `/wave/service` requests

- Live source:
  `frontend/app/state/workspace.store.ts`
- Live call site:
  `WorkspaceStore.createTerminalTab()` calling `refreshWorkspaceList()`
- Real cause:
  the compat add-tab path created a tab through the typed workspace facade, then immediately refreshed the legacy workspace list through `WorkspaceService.ListWorkspaces()`, which goes through `frontend/app/store/wos.ts` and hits `/wave/service`.
- Fix:
  `createTerminalTab()` now skips the legacy workspace-list refresh while compat mode is active.
- Why this is on the active path:
  the visible compat tab bar uses `workspaceStore.createTerminalTab()` for the `Add Tab` button.

### `call object.GetObject failed`

- Live source:
  `frontend/app/store/contextmenu.ts`
- Live call site:
  `ContextMenuModel.showContextMenu()` reading `globalStore.get(atoms.workspace)`, which resolves through the legacy workspace atom in `frontend/app/store/global.ts`
- Real cause:
  compat-mode tab right-click still flowed into the legacy tab context-menu model. That model reads the old `atoms.workspace` graph, which resolves `window:<id>` through `WOS.getObjectValue()` and reaches `/wave/service`.
- Fix:
  compat mode now blocks legacy tab-bar context-menu propagation in `frontend/app/tab/tabbar.tsx`, and `CompatAppInner` no longer attaches the legacy root context-menu handler.
- Why this is on the active path:
  the compat shell always renders the visible tab bar, and right-clicking a visible tab previously entered the legacy context-menu path immediately.

### `window.requestIdleCallback is not a function`

- Live source:
  `frontend/app/view/term/termwrap.ts`
- Exact call site located:
  `runProcessIdleTimeout()` previously called `window.requestIdleCallback(...)` directly
- Real cause:
  the compat terminal mounts `TermWrap` directly, and this code assumed browser support for `requestIdleCallback`.
- Fix:
  the terminal now uses a local fallback:
  `window.requestIdleCallback ?? ((cb) => setTimeout(cb, 1))`
  implemented in a type-safe form at the exact call site.
- Why this is on the active path:
  every compat terminal mount calls `TermWrap.initTerminal()`, which starts `runProcessIdleTimeout()`.

### Font decode / missing styles warnings

- Live source:
  `frontend/util/fontutil.ts`
- Live call site:
  `frontend/wave.ts:initBrowserCompatApp()`
- Real cause:
  the compat path was still requesting the legacy `Inter`, `JetBrains Mono`, and `Hack` files from `/fonts/*`, but those assets are not shipped on the active frontend path.
- Fix:
  non-critical custom font loading is disabled for compat startup. The shell renders with fallback fonts instead of generating decode failures and missing-font noise.
- Why this is on the active path:
  font loading happened during every compat startup before the first visible render.

## Files Changed

- `frontend/wave.ts`
- `frontend/app/app.tsx`
- `frontend/app/state/workspace.store.ts`
- `frontend/app/workspace/workspace.tsx`
- `frontend/app/tab/tabbar.tsx`
- `frontend/app/view/term/termwrap.ts`

## Result

The active compat shell now stays on the typed workspace/terminal path for:

- initial load
- active tab render
- tab switching
- terminal input

The legacy WOS `/wave/service` path is isolated away from those verified compat flows.
