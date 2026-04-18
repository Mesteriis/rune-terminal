# Active Frontend Render Path

**Source of truth for the current component render tree in RunaTerminal.**

Last updated: 2026-04-18

---

## Overview

This document maps the actual runtime component tree from entrypoint to leaf nodes.
It distinguishes between:
- **ACTIVE**: Components in the current primary render path
- **ACTIVE-BUT-LEGACY-SHAPED**: Components in active path but using legacy patterns/modes
- **FALLBACK**: Components only rendered in compat/legacy mode
- **UNUSED**: Components not currently rendered

---

## ROOT ENTRYPOINT

```
wave.ts (DOMContentLoaded)
  └─ initBare()
      ├─ (if native Electron preload API)
      │  ├─ initWaveWrap() [App initialization]
      │  └─ initBuilderWrap() [Builder initialization]
      │
      └─ (if no native API - browser fallback)
         └─ initLegacyBrowserCompatRuntime()
            └─ initLegacyBrowserCompatApp()
```

---

## PRIMARY RENDER TREE (Wave/TideTerm Mode)

### Initialization: `initWave()`
```
wave.ts (initWave)
  └─ GlobalModel.initialize()
  └─ initWshrpc() → globalWS (RPC connection)
  └─ loadConnStatus()
  └─ initGlobalWaveEventSubs()
  └─ subscribeToConnEvents()
  └─ loadMonaco()
  └─ RpcApi.GetFullConfigCommand() → fullConfigAtom
  └─ RpcApi.GetWaveAIModeConfigCommand() → waveaiModeConfigAtom
  └─ React.createRoot(#main).render(<App />)
```

### React Tree: `<App />`
```
<Provider store={globalStore}>
  <TabModelContext.Provider value={getTabModelByTabId(tabId)}>
    <AppInner />
  </TabModelContext.Provider>
</Provider>
```

### App Inner: `<AppInner />`
```
<AppInner>
  ├─ <AppBackground />                    [Sets theme CSS]
  ├─ <AppKeyHandlers />                   [Global keyboard]
  ├─ <AppFocusHandler />                  [Debug focus tracking]
  ├─ <AppSettingsUpdater />               [Watches window settings]
  ├─ <WindowTitleManager />               [Updates document.title]
  ├─ <DndProvider backend={HTML5Backend}>
  │  └─ <Workspace compatMode={false} />  [PRIMARY]
  ├─ <ProxyDock />                        [Proxy metrics overlay]
  ├─ <FlashError />                       [Error notifications]
  └─ [isDev: <NotificationBubbles />]
```

### Workspace: `<Workspace compatMode={false} />`
```
<Workspace>
  ├─ <TabBar workspace={workspace} />     [Tab selector bar]
  ├─ <Panel orientation="horizontal" defaultLayout={[30%, 70%]}>
  │  ├─ <Panel id="WorkspaceAIPanelId">
  │  │  └─ {aiPanelVisible && <AIPanel />}
  │  │     └─ [SEE: AI PANEL SUBTREE BELOW]
  │  │
  │  ├─ <Separator />                      [Draggable divider]
  │  │
  │  └─ <Panel id="WorkspaceMainPanelId">  [PRIMARY CONTENT]
  │     └─ <TabContent tabId={activeTabId} />
  │        └─ [SEE: TAB CONTENT SUBTREE BELOW]
  │        └─ <Widgets layout={workspace.layout} />
  │           └─ [SEE: WIDGETS SUBTREE BELOW]
  │
  └─ <ModalsRenderer />                   [Modal system]
```

### Tab Bar: `<TabBar />`
```
<TabBar>
  ├─ (for each workspace.pinnedtabids)
  │  └─ <Tab isPinned={true} />
  │
  ├─ (for each workspace.tabids)
  │  └─ <Tab isPinned={false} />
  │
  └─ [Context menu on right-click]
```

### Tab Content: `<TabContent tabId={activeTabId} />`
```
<TabContent>
  └─ <LegacyTabContent tabId={tabId} />
     └─ <TileLayout>
        └─ (for each block in tab.blockids)
           └─ <Block nodeModel={blockNodeModel} />
              └─ [SEE: BLOCK SUBTREE BELOW]
```

### Block Rendering: `<Block />`
```
<Block nodeModel={nodeModel} preview={false}>
  └─ <BlockFrame>
     └─ Conditional based on block.meta.view:
        
        ├─ (view === "term")
        │  └─ <Term blockId={blockId} />
        │     └─ <TermWSH />
        │        └─ xterm.js terminal instance
        │
        ├─ (view === "preview")
        │  └─ <Preview blockId={blockId} />
        │     └─ Conditional:
        │        ├─ isDirectory() → <PreviewDirectory />
        │        ├─ isMarkdown() → <PreviewMarkdown />
        │        ├─ isCSV() → <CSVView />
        │        ├─ isText() → <PreviewEdit />
        │        ├─ isStreaming() → <PreviewStreaming />
        │        └─ error → <PreviewErrorOverlay />
        │
        ├─ (view === "code")
        │  └─ <CodeEditor blockId={blockId} />
        │     └─ Monaco editor instance
        │
        ├─ (view === "web")
        │  └─ <WebView blockId={blockId} />
        │     └─ iFrame with URL
        │
        ├─ (view === "vdom")
        │  └─ <VDOMView blockId={blockId} />
        │     └─ Tree structure viewer
        │
        ├─ (view === "help")
        │  └─ <HelpView blockId={blockId} />
        │
        ├─ (view === "sysinfo")
        │  └─ <SysInfoView blockId={blockId} />
        │
        ├─ (view === "aifilediff")
        │  └─ <AIFileDiff blockId={blockId} />
        │
        ├─ (view === "ijson")
        │  └─ <IJSONView blockId={blockId} />
        │
        └─ (default/unknown)
           └─ <ErrorOverlay />
```

### AI Panel: `<AIPanel />`
```
<AIPanel>
  ├─ <AIPanelHeader />
  │  ├─ <AIModeModel />                    [Mode selector dropdown]
  │  ├─ <AgentSelectionStrip />            [Agent selector]
  │  └─ [Close button]
  │
  ├─ <AIPanelMessages />
  │  └─ (for each message in conversation)
  │     └─ <AIMessage message={msg} />
  │        ├─ <Markdown content={msg.content} />
  │        │  └─ [Remark plugins for rendering]
  │        ├─ (if tool_use blocks)
  │        │  └─ <AIToolUse toolUse={block} />
  │        │     └─ Approve/Reject UI
  │        │     └─ <RunCommandApproval />  [If shell command]
  │        ├─ <ExecutionBlockList />        [If execution blocks]
  │        └─ <AIFeedbackButtons />         [Thumbs up/down]
  │
  ├─ <AIPanelInput />
  │  ├─ <MultilineInput />
  │  └─ [Send button]
  │
  ├─ [Conditional layers]
  │  ├─ <AIDraggedFiles />                 [If files dropped]
  │  ├─ <AIRateLimitStrip />               [If rate limited]
  │  ├─ <BYOKAnnouncement />               [If custom model]
  │  ├─ <TelemetryRequired />              [If opt-in needed]
  │  └─ <RestoreBackupModal />             [If backup available]
```

### Widgets (Right-Side Bar): `<Widgets />`
```
<Widgets>
  ├─ <div className="widget-bar">
  │  ├─ (for each widget in fullConfig.widgets, sorted)
  │  │  └─ <WidgetItem widget={w} />       [Clickable button]
  │  │     └─ [Floating window opens on click]
  │  │
  │  ├─ <WidgetActionButton action="audit" />
  │  ├─ <WidgetActionButton action="tools" />
  │  ├─ <WidgetActionButton action="quick_actions" />
  │  ├─ <WidgetActionButton action="settings" />
  │  ├─ [optional: <WidgetActionButton action="apps" />]
  │  └─ <WidgetActionButton action="files" />
  │
  └─ Floating windows (conditionally rendered):
     ├─ {isAppsOpen && <AppsFloatingWindow />}
     ├─ {isAuditOpen && <AuditFloatingWindow />}
     ├─ {isFilesOpen && <FilesFloatingWindow />}
     ├─ {isToolsOpen && <ToolsFloatingWindow />}
     ├─ {isQuickActionsOpen && <QuickActionsFloatingWindow />}
     └─ {isSettingsOpen && <SettingsFloatingWindow />}
```

### Modals: `<ModalsRenderer />`
```
<ModalsRenderer>
  └─ (for each modal in modalModel.queue)
     └─ <Modal key={modal.id}>
        └─ Conditional based on modal.type:
           ├─ "message" → <MessageModal />
           ├─ "input" → <UserInputModal />
           ├─ "typeahead" → <TypeaheadModal />
           ├─ "about" → <About />
           ├─ "rename-window" → <RenameWindowModal />
           ├─ "tmux-sessions" → <TMuxSessions />
           ├─ "remote-profiles" → <RemoteProfilesModal />
           └─ "conn-typeahead" → <ConnTypeahead />
```

---

## COMPAT MODE RENDER TREE (Browser/Legacy Mode)

### Initialization: `initLegacyBrowserCompatRuntime()`
```
wave.ts (initLegacyBrowserCompatRuntime)
  └─ createCompatApiFacade()
  └─ facade.clients.bootstrap.getHealth()
  └─ facade.clients.bootstrap.getBootstrap()
  └─ facade.clients.workspace.getWorkspace()
  └─ facade.clients.terminal.getSnapshot()
  └─ logRuntimeValidation()
  └─ React.createRoot(#main).render(<App compatMode={true} />)
```

### React Tree: `<App compatMode={true} />`
```
<Provider store={globalStore}>
  <CompatAppInner />
</Provider>
```

### Compat App Inner: `<CompatAppInner />`
```
<CompatAppInner>
  ├─ <AppBackground compatMode={true} />
  ├─ <AppFocusHandler />
  ├─ <AppSettingsUpdater />
  ├─ <DndProvider backend={HTML5Backend}>
  │  └─ <Workspace compatMode={true} />
  ├─ <FlashError />
  └─ [isDev: <NotificationBubbles />]
```

### Compat Workspace: `<Workspace compatMode={true} />`
```
<Workspace compatMode={true}>
  ├─ <TabBar workspace={compatWorkspace} compatMode={true} />
  │  └─ [Uses TideTerm tab structure]
  │
  ├─ <Panel orientation="horizontal">
  │  ├─ <Panel id="WorkspaceAIPanelId">
  │  │  └─ {aiPanelVisible && <AIPanelCompat />}
  │  │     └─ [Simplified AI interface]
  │  │
  │  └─ <Panel id="WorkspaceMainPanelId">
  │     ├─ <TabContent tabId={compatActiveTabId} compatWorkspace={compatWorkspace} />
  │     │  └─ <CompatTabContent>
  │     │     └─ <CompatSplitLayout tab={compatTab} widgets={compatWidgets} />
  │     │        └─ (for each widget in tab)
  │     │           └─ Conditional:
  │     │              ├─ widget.kind === "terminal" → <CompatTerminal />
  │     │              ├─ widget.kind === "files" → <CompatFilesView />
  │     │              ├─ widget.kind === "preview" → <Preview />
  │     │              └─ other → <ErrorOverlay />
  │     │
  │     └─ <Widgets compatMode={true} />
  │        └─ [Simplified widget bar]
  │
  └─ [NO ModalsRenderer in compat mode]
```

### Compat Terminal: `<CompatTerminal />`
```
<CompatTerminal widget={compatWidget}>
  └─ xterm.js instance
     └─ Connected to facade.clients.terminal
```

---

## KEY OBSERVATIONS ABOUT ACTIVE PATH

### Primary Content Flow (Normal Mode)
```
AppInner
  ↓
Workspace (non-compat)
  ↓
TabContent (LegacyTabContent branch)
  ↓
TileLayout (block splits)
  ↓
Block → BlockFrame → (Term/Preview/Code/Web/VDOM/etc)
```

### Always-Rendered
- **App** → **AppInner** → **Workspace** (core shell)
- **TabBar** (tab selector)
- **TabContent** (main area)
- **Widgets** (right bar)
- **AIPanel** (if visible)
- **ModalsRenderer** (queued modals)

### Conditionally Rendered
- **AIPanel**: depends on `aiPanelVisible` atom
- **BlockContent**: depends on `block.meta.view` (term/preview/code/etc)
- **FloatingWindows**: depends on flyout state (isAppsOpen, isAuditOpen, etc)
- **Modals**: depends on modalModel queue

### Fallback/Legacy Paths
- **CompatAppInner**: only if `compatMode={true}` (browser/legacy)
- **CompatTabContent**: only if `compatWorkspace` is provided
- **CompatSplitLayout**: only in compat mode
- **CompatTerminal**: only in compat mode

---

## STATE MANAGEMENT FLOW

### Global Atoms (Jotai)
```
globalStore (Provider)
  ├─ atoms.staticTabId                [Current tab]
  ├─ atoms.settingsAtom               [User settings]
  ├─ atoms.fullConfigAtom             [Server config]
  ├─ atoms.isFullScreen               [Fullscreen state]
  ├─ atoms.flashErrors                [Error queue]
  ├─ workspaceLayoutModel.panelVisibleAtom [AI panel visibility]
  ├─ modalsModel (queue)              [Open modals]
  └─ ... (40+ other atoms)
```

### Compat Mode State (WorkspaceStore)
```
workspaceStore (Zustand)
  ├─ active.tabs                      [TideTerm tabs]
  ├─ active.widgets                   [TideTerm widgets]
  ├─ active.activetabid               [Active tab ID]
  ├─ active.activewidgetid            [Active widget ID]
  └─ active.layout                    [Widget layout]
```

### Local Component State
```
WorkspaceElem
  ├─ [workspace state]                [From workspaceStore]
  ├─ panelGroupHandleRef              [react-resizable-panels]
  └─ aiPanelHandleRef
```

---

## CSS CLASS & STYLING

### Tailwind Classes
- Primary layout: `flex flex-col w-full h-full flex-grow min-h-0 overflow-hidden`
- Horizontal split: `flex flex-row`
- Vertical split: `flex flex-col`
- Common: `overflow-hidden`, `min-h-0`, `min-w-0` (prevent flex overflow bugs)

### CSS Variables
- `--zoomfactor`: Set by AppInner from Electron API
- `--zoomfactor-inv`: Inverse of zoom
- `--window-opacity`: Set by AppSettingsUpdater
- `--main-bg-color`: Set by AppBackground

### SCSS Files
- `frontend/app/app.scss`: Global styles
- `frontend/app/tab/tab.scss`: Tab bar styles
- `frontend/app/tab/tabbar.scss`: Tab bar container
- `frontend/app/view/term/term.scss`: Terminal styles
- `frontend/app/view/proxy/proxy-dock.scss`: Proxy metrics
- Individual component `.scss` files for scoped styles

---

## PANEL SYSTEM (react-resizable-panels)

### Layout Model
```
WorkspaceLayoutModel (singleton)
  ├─ Panel 1: AI Panel (collapsible, default 30%)
  ├─ Separator: Draggable divider
  └─ Panel 2: Main content (default 70%)
```

### Persistence
```
WorkspaceLayoutModel.handlePanelLayout()
  └─ Persists layout percentage to WorkspaceLayoutModel
  └─ Called on user drag/resize
```

---

## ERROR HANDLING

### React Error Boundary
```
<ErrorBoundary key={tabId}>
  └─ Wraps TabContent rendering
  └─ Catches render errors in block tree
```

### Flash Errors
```
<FlashError />
  └─ Shows queued flash errors
  └─ Auto-dismisses after 1s
  └─ Clickable to copy
```

### Block Errors
```
<Block /> → PreviewErrorOverlay
  └─ Shows why preview failed
  └─ File not found, parse error, etc
```

---

## HOTSPOTS & RENDER EFFICIENCY

### Memoization Points
- `AppInner` → **not memoized** (re-renders on any atom change)
- `Workspace` → **memoized** (memo())
- `TabContent` → **memoized** (React.memo)
- `Block` → **memoized** (React.memo)
- `AIPanel` → **not memoized** (re-renders frequently)

### Atom Subscriptions (Selective Re-render)
- `atoms.staticTabId` → triggers TabContent re-render
- `aiPanelVisible` → toggles AIPanel visibility
- `settingsAtom` → triggers AppSettingsUpdater
- `fullConfigAtom` → triggers Widgets re-render

### Lists & Keys
- TabBar: key={tab.id}
- BlockList: key={block.blockId}
- MessageList: key={msg.id}
- Widgets: key={widget.id}

---

## KEYBOARD & FOCUS FLOW

```
AppKeyHandlers
  ├─ document.addEventListener("keydown", keyutil.keydownWrapper(appHandleKeyDown))
  └─ document.addEventListener("mousedown", keyboardMouseDownHandler)

appHandleKeyDown()
  ├─ Checks for global shortcuts (Cmd+T, Cmd+W, etc)
  ├─ May route to focused element handler
  └─ May route to Term if terminal focused
```

---

## CONTEXT MENU FLOW

```
handleContextMenu() [on #main div]
  ├─ Finds nearest [data-blockid] or [data-widgetid]
  ├─ Gets terminal CWD if applicable
  ├─ Builds context menu items:
  │  ├─ Cut/Copy/Paste if editable
  │  ├─ "Open in new block" if CWD
  │  └─ "Open URL from clipboard"
  ├─ Registers debug menu: __RTERM_LAST_CONTEXT_MENU
  └─ ContextMenuModel.showContextMenu()
```

---

## WHAT'S TRULY ACTIVE NOW

✅ **Always**:
- App, AppInner, Workspace, TabBar, TabContent
- Block rendering (Term/Preview/Code/Web/VDOM)
- AIPanel (toggleable)
- Widgets bar + FloatingWindows
- ModalsRenderer

✅ **Most sessions**:
- Term (terminal blocks)
- Preview (file/directory viewing)
- xterm.js instance

✅ **On demand**:
- CodeEditor (when opening code blocks)
- WebView (when opening web URLs)
- QuickActionsFloatingWindow
- AuditFloatingWindow
- Modals (various)

❌ **Never active** (legacy):
- WorkspaceEditor
- WorkspaceSwitcher
- BuilderApp (separate window)

⚠️ **Compat only** (browser/legacy mode):
- CompatAppInner, CompatTabContent, CompatSplitLayout
- CompatTerminal, CompatFilesView
- All compat/* API facades

---

## PERFORMANCE IMPLICATIONS

### Heavy Renders
- AIPanel with long message history (100+ messages)
- PreviewDirectory with 1000+ files
- TileLayout with 20+ blocks (each has its own xterm instance)

### Optimization Opportunities
- AIPanel: Virtualize message list
- PreviewDirectory: Virtualize file list
- BlockFrame: Lazy load xterm only when visible
- Widgets: Memoize individual WidgetItem components

### Known Bottlenecks
- Workspace atom subscriptions cause full re-render
- AppInner not memoized (watches all global atoms)
- AIPanel re-renders on every message push


