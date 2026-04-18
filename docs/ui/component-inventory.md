# Frontend Component Inventory

**Source of truth for RunaTerminal frontend component system.**

Last updated: 2026-04-18

---

## Overview

This document catalogs every meaningful component/surface in the frontend, organized by domain.
It establishes the baseline for understanding what exists, where it lives, and its purpose.

---

## SHELL CHROME COMPONENTS

### Layout & Structure

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **App** | `frontend/app/app.tsx` | shell chrome | ACTIVE | Root shell container; manages global keyboard handlers, context menus, settings updater, notifications | React root via `wave.ts` | Branches to CompatAppInner or AppInner based on mode |
| **AppInner** | `frontend/app/app.tsx` | shell chrome | ACTIVE | Main shell layout; renders Workspace inside DndProvider | App (normal mode) | Parent of Workspace, ProxyDock, FlashError |
| **CompatAppInner** | `frontend/app/app.tsx` | shell chrome | ACTIVE-BUT-LEGACY-SHAPED | Compatibility shell layout for browser/legacy mode | App (compat mode) | Simplified version without WindowTitleManager, reduced handlers |
| **Workspace** | `frontend/app/workspace/workspace.tsx` | layout | ACTIVE | Main container for tab bar, tab content, AI panel; manages splits/panels via react-resizable-panels | AppInner / CompatAppInner | Renders TabBar, TabContent, AIPanel, Widgets |
| **WorkspaceLayoutModel** | `frontend/app/workspace/workspace-layout-model.ts` | layout | ACTIVE | State model for workspace split layout (AI panel percentage, visibility) | Workspace | Singleton; manages react-resizable-panels refs |
| **Widgets** | `frontend/app/workspace/widgets.tsx` | layout | ACTIVE | Right-side widget bar + floating windows (tools, audit, files, apps, settings, launcher) | Workspace | Manages open/close state of utility flyouts |

### Tab Bar & Navigation

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **TabBar** | `frontend/app/tab/tabbar.tsx` | shell chrome | ACTIVE | Horizontal tab selector at top; shows tabs/pinned tabs | Workspace | Renders individual Tab components, TabBar model state |
| **Tab** | `frontend/app/tab/tab.tsx` | shell chrome | ACTIVE | Single tab in tab bar; context menu, drag/drop, rename | TabBar | Controlled by tabbar-model.ts |
| **TabContent** | `frontend/app/tab/tabcontent.tsx` | layout | ACTIVE | Main content area for active tab; renders layout split blocks | Workspace | Shows terminal/preview/vdom content |
| **TabBarModel** | `frontend/app/tab/tabbar-model.ts` | layout | ACTIVE | State for tab bar (active tab, rename mode, hover) | TabBar | Singleton model |
| **WorkspaceEditor** | `frontend/app/tab/workspaceeditor.tsx` | overlay | FALLBACK | Legacy workspace editor surface (deprecated) | - | Unused in current render path |
| **WorkspaceSwitcher** | `frontend/app/tab/workspaceswitcher.tsx` | overlay | FALLBACK | Legacy workspace switcher (deprecated) | - | Unused in current render path |
| **UpdateBanner** | `frontend/app/tab/updatebanner.tsx` | shell chrome | FALLBACK | Shows updater status banner | TabBar (conditionally) | May appear in tab bar area |

### Window & Title Management

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **WindowTitleManager** | `frontend/app/window/windowtitle.tsx` | shell chrome | ACTIVE | Manages Electron window title updates | AppInner | Sets document.title based on tab name |
| **AppBackground** | `frontend/app/app-bg.tsx` | shell chrome | ACTIVE | Background layer; sets --main-bg-color CSS var | AppInner / CompatAppInner | Handles window transparency/blur settings |

---

## TERMINAL & EXECUTION COMPONENTS

### Terminal Display

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **Block** | `frontend/app/block/block.tsx` | terminal | ACTIVE | Container for terminal/preview/code blocks; handles visibility, sizing | BlockFrame | Renders appropriate child based on block.meta.view |
| **BlockFrame** | `frontend/app/block/blockframe.tsx` | terminal | ACTIVE | Wrapper that manages block rendering within layout; applies styling | TabContent | Parent of Block |
| **Term** | `frontend/app/view/term/term.tsx` | terminal | ACTIVE | xterm.js terminal widget renderer | Block (when view=="term") | Core terminal UI; manages xterm instance |
| **TermWrap** | `frontend/app/view/term/termwrap.tsx` | terminal | ACTIVE | Wrapper around Term; handles focus, keybindings | Term | Unused currently; Term is direct child |
| **TermWSH** | `frontend/app/view/term/term-wsh.tsx` | terminal | ACTIVE | Terminal connected to Wave Shell Home (WSH) | Block (view=="term") | Receives updates from backend terminal |
| **TermModel** | `frontend/app/view/term/term-model.ts` | terminal | ACTIVE | State model for terminal (snapshot, keybindings) | Term / TermWSH | Manages xterm add-ons |
| **CompatTerminal** | `frontend/app/view/term/compat-terminal.tsx` | terminal | ACTIVE-BUT-LEGACY-SHAPED | Compat mode terminal (TideTerm widget-based) | Widget (compat mode) | Fallback for legacy TideTerm widget system |
| **TermSticker** | `frontend/app/view/term/termsticker.tsx` | terminal | ACTIVE | Floating label showing session info in terminal | Term | Shows connection, session state |
| **IJSONView** | `frontend/app/view/term/ijson.tsx` | terminal | FALLBACK | Jupyter JSON output renderer | Block (view=="ijson") | Rarely used; JSON output format |

### Terminal Utilities

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **ShellBlocking** | `frontend/app/view/term/shellblocking.ts` | terminal | ACTIVE | Shell blocking/approval integration for sensitive commands | Term | Coordinates with approval system |
| **ExplainHandoff** | `frontend/app/view/term/explain-handoff.ts` | terminal | ACTIVE | Integrates terminal output with AI explain feature | Term, Widgets | Passes latest terminal output to AI |
| **TermTheme** | `frontend/app/view/term/termtheme.ts` | terminal | ACTIVE | xterm.js color theme configuration | Term | Maps Wave settings to xterm colors |
| **TermUtil** | `frontend/app/view/term/termutil.ts` | terminal | ACTIVE | Terminal utilities (parsing, validation) | Term | Shared helpers |
| **DraggedFileURI** | `frontend/app/view/term/dragged-file-uri.ts` | terminal | ACTIVE | Handles drag-drop file insertion into terminal | Term | Sets file path in terminal input |
| **FitAddon** | `frontend/app/view/term/fitaddon.ts` | terminal | ACTIVE | xterm FitAddon wrapper (size terminal to container) | Term | xterm plugin |

---

## PANELS & OVERLAYS

### AI Panel

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **AIPanel** | `frontend/app/aipanel/aipanel.tsx` | panel | ACTIVE | Main AI chat interface | Workspace | Toggleable side panel via react-resizable-panels |
| **AIPanelCompat** | `frontend/app/aipanel/aipanel-compat.tsx` | panel | ACTIVE-BUT-LEGACY-SHAPED | Compatibility version for browser/legacy mode | AIPanel (compat path) | Simplified AI interface |
| **AIPanelHeader** | `frontend/app/aipanel/aipanelheader.tsx` | panel | ACTIVE | AI panel top bar (title, close button) | AIPanel | Shows AI mode selector |
| **AIPanelInput** | `frontend/app/aipanel/aipanelinput.tsx` | panel | ACTIVE | Text input for AI prompts | AIPanel | Multiline input with command validation |
| **AIPanelMessages** | `frontend/app/aipanel/aipanelmessages.tsx` | panel | ACTIVE | Message history display | AIPanel | Renders aimessage components |
| **AIMessage** | `frontend/app/aipanel/aimessage.tsx` | panel | ACTIVE | Single AI or user message | AIPanelMessages | Renders markdown, code, tool use blocks |
| **AIToolUse** | `frontend/app/aipanel/aitooluse.tsx` | panel | ACTIVE | AI tool invocation UI (approve/reject) | AIMessage | Shows tool call for approval |
| **AIModeModel** | `frontend/app/aipanel/aimode.tsx` | panel | ACTIVE | AI mode selector/switcher | AIPanelHeader | Dropdown for different AI personas |
| **AIRateLimitStrip** | `frontend/app/aipanel/airatelimitstrip.tsx` | panel | ACTIVE | Shows rate limiting warnings | AIPanel | User-facing rate limit indicator |
| **AIDraggedFiles** | `frontend/app/aipanel/aidroppedfiles.tsx` | panel | ACTIVE | Displays files dragged into AI panel | AIPanelInput | Shows file preview before send |
| **AIFeedbackButtons** | `frontend/app/aipanel/aifeedbackbuttons.tsx` | panel | ACTIVE | Thumbs up/down feedback for AI responses | AIMessage | User feedback collection |
| **ExecutionBlockList** | `frontend/app/aipanel/execution-block-list.tsx` | panel | ACTIVE | Shows execution blocks from AI commands | AIMessage | Displays structured execution results |
| **AgentSelectionStrip** | `frontend/app/aipanel/agent-selection-strip.tsx` | panel | ACTIVE | Dropdown to select which agent to use | AIPanelHeader | Toggles between available agents |
| **BYOKAnnouncement** | `frontend/app/aipanel/byokannouncement.tsx` | panel | ACTIVE | "Bring Your Own Key" warning for custom models | AIPanel | User education overlay |
| **CompatContext** | `frontend/app/aipanel/compat-context.ts` | panel | ACTIVE-BUT-LEGACY-SHAPED | Context bridge for compat mode AI | AIPanel / AIPanelCompat | Bridges new AI to old workspace store |
| **WaveAIModel** | `frontend/app/aipanel/waveai-model.tsx` | panel | ACTIVE | AI state management (messages, mode) | AIPanel | Singleton; persists AI state |
| **CompatConversation** | `frontend/app/aipanel/compat-conversation.ts` | panel | ACTIVE-BUT-LEGACY-SHAPED | Conversation bridge for compat mode | AIPanel (compat) | Legacy conversation handler |
| **TelemetryRequired** | `frontend/app/aipanel/telemetryrequired.tsx` | panel | ACTIVE | Shows telemetry opt-in requirement | AIPanel | User agreement overlay |
| **RestoreBackupModal** | `frontend/app/aipanel/restorebackupmodal.tsx` | modals | ACTIVE | Modal for restoring AI backup | modalsModel | Triggered by backup recovery |
| **RunCommandApproval** | `frontend/app/aipanel/run-command-approval.tsx` | panel | ACTIVE | UI for approving dangerous commands from AI | AIToolUse | Security approval layer |

### Files/Preview Panel

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **Preview** | `frontend/app/view/preview/preview.tsx` | panel | ACTIVE | Multi-format preview renderer (markdown, CSV, binary) | Block (view=="preview") | Dispatches to appropriate preview type |
| **PreviewDirectory** | `frontend/app/view/preview/preview-directory.tsx` | panel | ACTIVE | Directory browser/file explorer | Block (view=="preview" + directory) | Shows file tree with search |
| **PreviewMarkdown** | `frontend/app/view/preview/preview-markdown.tsx` | panel | ACTIVE | Markdown viewer with rendering | Preview | Uses streamdown/markdown components |
| **CSVView** | `frontend/app/view/preview/csvview.tsx` | panel | ACTIVE | CSV table viewer | Preview | Shows CSV as sortable table |
| **PreviewEdit** | `frontend/app/view/preview/preview-edit.tsx` | panel | ACTIVE | Simple text file editor | Preview | Basic inline editor for files |
| **PreviewStreaming** | `frontend/app/view/preview/preview-streaming.tsx` | panel | ACTIVE | Streaming output viewer (real-time updates) | Preview | Follows output as it arrives |
| **PreviewErrorOverlay** | `frontend/app/view/preview/preview-error-overlay.tsx` | panel | ACTIVE | Error display for preview failures | Preview | Shows why preview failed |
| **PreviewModel** | `frontend/app/view/preview/preview-model.tsx` | panel | ACTIVE | State model for preview | Preview | Manages preview mode, file state |
| **EntryManager** | `frontend/app/view/preview/entry-manager.tsx` | panel | ACTIVE | File entry browser/manager | PreviewDirectory | Renders individual file entries |
| **PreviewDirectoryUtils** | `frontend/app/view/preview/preview-directory-utils.tsx` | panel | ACTIVE | Directory utilities (sorting, filtering) | PreviewDirectory | Shared directory helpers |
| **CompatFilesView** | `frontend/app/view/files/compat-files-view.tsx` | panel | ACTIVE-BUT-LEGACY-SHAPED | Files view for compat mode (widget-based) | Widget (compat) | Fallback file browser |

### Code Editor Panel

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **CodeEditor** | `frontend/app/view/codeeditor/codeeditor.tsx` | panel | ACTIVE | Monaco code editor for files | Block (view=="code") | Full IDE-like editing |
| **DiffViewer** | `frontend/app/view/codeeditor/diffviewer.tsx` | panel | ACTIVE | Diff view in Monaco | CodeEditor | Shows file differences |
| **SchemaEndpoints** | `frontend/app/view/codeeditor/schemaendpoints.ts` | panel | ACTIVE | JSON schema endpoint configuration | CodeEditor | Provides type hints |
| **YAMLWorker** | `frontend/app/view/codeeditor/yamlworker.js` | panel | ACTIVE | Web worker for YAML parsing | CodeEditor | Offloads YAML validation |

### Other Panels & Views

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **HelpView** | `frontend/app/view/helpview/helpview.tsx` | panel | ACTIVE | Built-in help/documentation viewer | Block (view=="help") | Shows help content |
| **QuickTipsView** | `frontend/app/view/quicktipsview/quicktipsview.tsx` | panel | ACTIVE | Quick tips/hints overlay | Workspace | Contextual help display |
| **SysInfoView** | `frontend/app/view/sysinfo/sysinfo.tsx` | panel | ACTIVE | System information display | Block (view=="sysinfo") | Shows system stats |
| **WebView** | `frontend/app/view/webview/webview.tsx` | panel | ACTIVE | Embedded web content viewer | Block (view=="web") | iFrame-based web rendering |
| **VDOMView** | `frontend/app/view/vdom/vdom.tsx` | panel | ACTIVE | Virtual DOM / JSON tree viewer | Block (view=="vdom") | Renders tree structures |
| **VDOMModel** | `frontend/app/view/vdom/vdom-model.tsx` | panel | ACTIVE | VDOM state management | VDOMView | Tree state, expansion |
| **VDOMUtils** | `frontend/app/view/vdom/vdom-utils.tsx` | panel | ACTIVE | VDOM rendering utilities | VDOMView | Tree rendering helpers |
| **WaveAIView** | `frontend/app/view/waveai/waveai.tsx` | panel | ACTIVE | WaveAI-specific view (legacy) | Block (view=="waveai") | Fallback AI view |
| **AIFileDiff** | `frontend/app/view/aifilediff/aifilediff.tsx` | panel | ACTIVE | AI-generated file diff viewer | Block (view=="aifilediff") | Shows AI code changes |

### Floating Windows (Utility Surfaces)

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **AppsFloatingWindow** | `frontend/app/workspace/apps-floating-window.tsx` | overlay | ACTIVE | Floating window for WaveApp launcher | Widgets | Shows available apps |
| **AuditFloatingWindow** | `frontend/app/workspace/audit-floating-window.tsx` | overlay | ACTIVE | Floating audit log viewer | Widgets | Displays audit trail |
| **FilesFloatingWindow** | `frontend/app/workspace/files-floating-window.tsx` | overlay | ACTIVE | Floating file browser | Widgets | Quick file access |
| **QuickActionsFloatingWindow** | `frontend/app/workspace/quick-actions-floating-window.tsx` | overlay | ACTIVE | Floating quick actions launcher | Widgets | Command palette-like interface |
| **SettingsFloatingWindow** | `frontend/app/workspace/settings-floating-window.tsx` | overlay | ACTIVE | Floating settings panel | Widgets | Application settings UI |
| **ToolsFloatingWindow** | `frontend/app/workspace/tools-floating-window.tsx` | overlay | ACTIVE | Floating tools browser | Widgets | Shows available tools/plugins |
| **WidgetItem** | `frontend/app/workspace/widget-item.tsx` | overlay | ACTIVE | Single widget button in widget bar | Widgets | Clickable widget trigger |
| **WidgetActionButton** | `frontend/app/workspace/widget-action-button.tsx` | overlay | ACTIVE | Action button variant for widgets | Widgets | Special action widget button |
| **UtilitySurfaceFrame** | `frontend/app/workspace/utility-surface-frame.tsx` | overlay | ACTIVE | Container for floating windows | Widgets | Wraps floating content |
| **WidgetsMeasurement** | `frontend/app/workspace/widgets-measurement.tsx` | overlay | ACTIVE | Measures widget dimensions | Widgets | Calculates overflow/collapse |

---

## MODALS & DIALOGS

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **ModalsRenderer** | `frontend/app/modals/modalsrenderer.tsx` | overlay | ACTIVE | Renders queued modals | Workspace | Manages modal z-index, stacking |
| **Modal** | `frontend/app/modals/modal.tsx` | overlay | ACTIVE | Base modal component | ModalsRenderer | Reusable modal container |
| **ModalRegistry** | `frontend/app/modals/modalregistry.tsx` | overlay | ACTIVE | Modal registration system | modalsModel | Tracks available modals |
| **About** | `frontend/app/modals/about.tsx` | overlay | ACTIVE | About dialog | ModalRegistry | Version info, credits |
| **MessageModal** | `frontend/app/modals/messagemodal.tsx` | overlay | ACTIVE | Generic message/alert dialog | ModalRegistry | Simple confirmation modals |
| **TypeaheadModal** | `frontend/app/modals/typeaheadmodal.tsx` | overlay | ACTIVE | Command/symbol search dialog | ModalRegistry | Fuzzy search modal |
| **ConnTypeahead** | `frontend/app/modals/conntypeahead.tsx` | overlay | ACTIVE | Connection selector typeahead | TypeaheadModal variant | Searches connections |
| **UserInputModal** | `frontend/app/modals/userinputmodal.tsx` | overlay | ACTIVE | Generic user input dialog | ModalRegistry | Text input modal |
| **RenameWindowModal** | `frontend/app/modals/renamewindowmodal.tsx` | overlay | ACTIVE | Rename window dialog | ModalRegistry | Window naming |
| **TMuxSessions** | `frontend/app/modals/tmuxsessions.tsx` | overlay | ACTIVE | Tmux session selector | ModalRegistry | Shows tmux sessions |
| **RemoteProfilesModal** | `frontend/app/modals/remoteprofilesmodal.tsx` | overlay | ACTIVE | Remote connection profiles | ModalRegistry | SSH/remote config |

---

## SHARED UI PRIMITIVES & ELEMENTS

### Buttons & Controls

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **Button** | `frontend/app/element/button.tsx` | shared/ui primitive | ACTIVE | Standard button component | Various | Primary, secondary, danger variants |
| **IconButton** | `frontend/app/element/iconbutton.tsx` | shared/ui primitive | ACTIVE | Icon-only button | Various | Toolbar buttons |
| **LinkButton** | `frontend/app/element/linkbutton.tsx` | shared/ui primitive | ACTIVE | Styled link as button | Various | Navigation buttons |
| **MenuButton** | `frontend/app/element/menubutton.tsx` | shared/ui primitive | ACTIVE | Button with dropdown menu | Various | Reveals menu on click |
| **CopyButton** | `frontend/app/element/copybutton.tsx` | shared/ui primitive | ACTIVE | Copy-to-clipboard button | Various | Shows feedback on copy |
| **EmojiButton** | `frontend/app/element/emojibutton.tsx` | shared/ui primitive | ACTIVE | Button to trigger emoji picker | AIPanel | Emoji insertion |
| **EmojiPalette** | `frontend/app/element/emojipalette.tsx` | shared/ui primitive | ACTIVE | Emoji selector grid | EmojiButton | Shows emoji options |
| **ExpandableMenu** | `frontend/app/element/expandablemenu.tsx` | shared/ui primitive | ACTIVE | Menu that expands/collapses | Various | Hierarchical menu |
| **FlyoutMenu** | `frontend/app/element/flyoutmenu.tsx` | shared/ui primitive | ACTIVE | Dropdown flyout menu | MenuButton, various | Positioned menu UI |
| **Toggle** | `frontend/app/element/toggle.tsx` | shared/ui primitive | ACTIVE | On/off toggle switch | Various | Boolean control |

### Input Components

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **Input** | `frontend/app/element/input.tsx` | shared/ui primitive | ACTIVE | Text input field | Various | Basic text input |
| **MultilineInput** | `frontend/app/element/multilineinput.tsx` | shared/ui primitive | ACTIVE | Textarea for multi-line input | AIPanelInput | Expands as you type |
| **Search** | `frontend/app/element/search.tsx` | shared/ui primitive | ACTIVE | Search box with filtering | Various | Search UI widget |
| **Popover** | `frontend/app/element/popover.tsx` | shared/ui primitive | ACTIVE | Positioned popup container | Various | Floating popover |
| **Tooltip** | `frontend/app/element/tooltip.tsx` | shared/ui primitive | ACTIVE | Hover tooltip | Various | Contextual help |

### Display & Layout

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **CenteredDiv** | `frontend/app/element/quickelems.tsx` | shared/ui primitive | ACTIVE | Centered content container | Various | Common layout utility |
| **ErrorBoundary** | `frontend/app/element/errorboundary.tsx` | shared/ui primitive | ACTIVE | Error boundary wrapper | Various | Catches render errors |
| **ProgressBar** | `frontend/app/element/progressbar.tsx` | shared/ui primitive | ACTIVE | Progress bar indicator | Various | Shows completion % |
| **TypingIndicator** | `frontend/app/element/typingindicator.tsx` | shared/ui primitive | ACTIVE | Animated typing dots | AIMessage | Shows AI is thinking |
| **Markdown** | `frontend/app/element/markdown.tsx` | shared/ui primitive | ACTIVE | Markdown to React renderer | AIMessage, Preview | Uses remark plugins |
| **Streamdown** | `frontend/app/element/streamdown.tsx` | shared/ui primitive | ACTIVE | Streaming markdown renderer | PreviewStreaming | Real-time markdown |
| **AnsiLine** | `frontend/app/element/ansiline.tsx` | shared/ui primitive | ACTIVE | ANSI color/formatting renderer | Various | Terminal output formatting |
| **Magnify** | `frontend/app/element/magnify.tsx` | shared/ui primitive | ACTIVE | Magnification/zoom control | Preview | Zoom controls |
| **QuickTips** | `frontend/app/element/quicktips.tsx` | shared/ui primitive | ACTIVE | Quick tips helper | WorkspaceElem | Shows contextual tips |

### Markdown & Content

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **MarkdownContentBlockPlugin** | `frontend/app/element/markdown-contentblock-plugin.ts` | shared/ui primitive | ACTIVE | Remark plugin for content blocks | Markdown | Renders Wave content blocks in markdown |
| **MarkdownUtil** | `frontend/app/element/markdown-util.ts` | shared/ui primitive | ACTIVE | Markdown utilities | Markdown components | Shared markdown helpers |
| **RemarkMermaidToTag** | `frontend/app/element/remark-mermaid-to-tag.ts` | shared/ui primitive | ACTIVE | Remark plugin for Mermaid diagrams | Markdown | Converts mermaid to HTML |

---

## COMPAT/LEGACY COMPONENTS

### Legacy Widget System

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **CompatPaneHeader** | `frontend/app/workspace/compat-pane-header.tsx` | compat/fallback | ACTIVE-BUT-LEGACY-SHAPED | Header for compat-mode panes | Workspace (compat) | TideTerm widget headers |
| **CompatSplitLayout** | `frontend/app/tab/compat-split-layout.tsx` | compat/fallback | ACTIVE-BUT-LEGACY-SHAPED | Split layout for compat mode | TabContent (compat) | TideTerm split panel logic |

### Active-Path Compat Layers

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **CompatWidgetsWrapper** | (in widgets.tsx section) | compat/fallback | ACTIVE-BUT-LEGACY-SHAPED | Wraps compat-mode widgets | Workspace (compat mode) | TideTerm widget rendering |
| **SessionTarget** | `frontend/app/workspace/session-target.ts` | compat/fallback | ACTIVE-BUT-LEGACY-SHAPED | Session/connection target in compat | Block | Maps connections in legacy widget mode |

---

## STATE MANAGEMENT & MODELS

### Global State

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **GlobalStore** | `frontend/app/store/jotaiStore.ts` | state | ACTIVE | Jotai atom store | App provider | Global atoms |
| **atoms** | `frontend/store/global.ts` | state | ACTIVE | Atom definitions (tab, settings, etc.) | GlobalStore subscribers | Defines all global atoms |
| **GlobalModel** | `frontend/app/store/global-model.ts` | state | ACTIVE | Global model singleton | wave.ts | Window/client/workspace atoms |
| **ClientModel** | `frontend/app/store/client-model.ts` | state | ACTIVE | Client state model | AppInner | Client data atoms |
| **TabModelContext** | `frontend/app/store/tab-model.ts` | state | ACTIVE | Tab-specific state provider | AppInner | Per-tab atoms |

### Local State Models

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **ContextMenuModel** | `frontend/app/store/contextmenu.ts` | state | ACTIVE | Context menu state | app.tsx | Manages right-click menus |
| **ModalModel** | `frontend/app/store/modalmodel.ts` | state | ACTIVE | Modal queue state | modalsModel subscriber | Tracks open modals |
| **WorkspaceStore** | `frontend/app/state/workspace.store.ts` | state | ACTIVE | Compat mode workspace state | Workspace (compat) | TideTerm widget state mirror |
| **TerminalStore** | `frontend/app/state/terminal.store.ts` | state | ACTIVE | Terminal snapshot state | Term, Widgets | Terminal updates |
| **BlockModel** | `frontend/app/block/block-model.ts` | state | ACTIVE | Block state (visibility, layout) | Block | Individual block state |

---

## PROXY & REMOTE COMPONENTS

### Proxy System

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **ProxyDock** | `frontend/app/view/proxy/proxy-dock.tsx` | overlay | ACTIVE | Proxy connection status dock | AppInner | Shows proxy metrics/channels |
| **Proxy** | `frontend/app/view/proxy/proxy.tsx` | overlay | ACTIVE | Individual proxy connection UI | ProxyDock | Proxy channel display |
| **ProxyModel** | `frontend/app/view/proxy/proxy-model.tsx` | overlay | ACTIVE | Proxy state management | Proxy | Proxy connection state |
| **ProxyRPC** | `frontend/app/view/proxy/proxy-rpc.ts` | overlay | ACTIVE | Proxy RPC communication | ProxyModel | Network communication |
| **ChannelCard** | `frontend/app/view/proxy/channel-card.tsx` | overlay | ACTIVE | Display for single proxy channel | Proxy | Channel status card |
| **ChannelForm** | `frontend/app/view/proxy/channel-form.tsx` | overlay | ACTIVE | Channel configuration form | SettingsFloatingWindow | Configure proxy channels |
| **HistoryList** | `frontend/app/view/proxy/history-list.tsx` | overlay | ACTIVE | Proxy connection history | ProxyDock | Shows past connections |
| **MetricsChart** | `frontend/app/view/proxy/metrics-chart.tsx` | overlay | ACTIVE | Proxy metrics visualization | ProxyDock | Shows network metrics |
| **StatusBadge** | `frontend/app/view/proxy/status-badge.tsx` | overlay | ACTIVE | Status indicator badge | ProxyDock | Connection status display |
| **ProxyDockModel** | `frontend/app/view/proxy/proxy-dock-model.ts` | overlay | ACTIVE | Proxy dock state | ProxyDock | Manages dock visibility |

### Remote Preferences

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **RemotePreference** | `frontend/app/tab/remote-preference.ts` | remote | ACTIVE | Remote connection preferences | TabContent | Connection selection logic |

---

## LAYOUT & BUILDER COMPONENTS

### Layout System

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **LayoutLib** | `frontend/layout/index.ts` | layout | ACTIVE | Layout model factory | various | Creates layout state objects |
| **BlockUtil** | `frontend/app/block/blockutil.tsx` | layout | ACTIVE | Block utilities | Block, BlockFrame | Block layout helpers |
| **BlockTypes** | `frontend/app/block/blocktypes.ts` | layout | ACTIVE | Block type definitions | Block | Enum/constants for block types |

### Builder App (WaveApp Builder)

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **BuilderApp** | `frontend/builder/builder-app.tsx` | layout | ACTIVE | WaveApp builder root | wave.ts (builder mode) | Separate app for building apps |
| **BuilderRouting** | `frontend/builder/` (various) | layout | ACTIVE | Builder routing/navigation | BuilderApp | Builder UI structure |

---

## RUNTIME & API INTEGRATION

### API Facades & RPC

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **RpcApi** | `frontend/app/store/wshclientapi.ts` | runtime | ACTIVE | Main RPC API client | wave.ts, components | Command execution |
| **TabRpcClient** | `frontend/app/store/wshrpcutil.ts` | runtime | ACTIVE | Tab-specific RPC client | wave.ts, RpcApi | Per-tab RPC routing |
| **CompatApiFacade** | `frontend/compat/index.ts` | runtime | ACTIVE-BUT-LEGACY-SHAPED | Compat mode API facade | initLegacyBrowserCompatRuntime | Legacy API bridge |
| **ConnectionsFacade** | `frontend/compat/connections.ts` | runtime | ACTIVE-BUT-LEGACY-SHAPED | Connection API bridge | Workspace (compat) | Legacy connections |

### Terminal API

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **TerminalCompat** | `frontend/compat/terminal.ts` | runtime | ACTIVE-BUT-LEGACY-SHAPED | Terminal API for compat mode | TermWSH (compat) | Legacy terminal access |

### AI/Agent API

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **AgentCompat** | `frontend/compat/agent.ts` | runtime | ACTIVE-BUT-LEGACY-SHAPED | Agent API for compat mode | AIPanel (compat) | Legacy AI access |
| **ConversationCompat** | `frontend/compat/conversation.ts` | runtime | ACTIVE-BUT-LEGACY-SHAPED | Conversation API for compat | AIPanel (compat) | Legacy conversation |
| **ExecutionCompat** | `frontend/compat/execution.ts` | runtime | ACTIVE-BUT-LEGACY-SHAPED | Execution API for compat | AIPanel (compat) | Legacy tool execution |

### File/Workspace APIs

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **WorkspaceCompat** | `frontend/compat/workspace.ts` | runtime | ACTIVE-BUT-LEGACY-SHAPED | Workspace API for compat | Workspace (compat) | Legacy workspace access |
| **FilesCompat** | `frontend/compat/fs.ts` | runtime | ACTIVE-BUT-LEGACY-SHAPED | File system API for compat | PreviewDirectory (compat) | Legacy file operations |

### Tools/Plugins APIs

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **ToolsCompat** | `frontend/compat/tools.ts` | runtime | ACTIVE-BUT-LEGACY-SHAPED | Tools API for compat | ToolsFloatingWindow (compat) | Legacy tools access |
| **QuickActionsCompat** | `frontend/compat/quickactions.ts` | runtime | ACTIVE-BUT-LEGACY-SHAPED | Quick actions API for compat | QuickActionsFloatingWindow (compat) | Legacy quick actions |
| **MCPCompat** | `frontend/compat/mcp.ts` | runtime | ACTIVE-BUT-LEGACY-SHAPED | MCP API for compat | ToolsFloatingWindow (compat) | Legacy MCP support |

### Audit API

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **AuditCompat** | `frontend/compat/audit.ts` | runtime | ACTIVE-BUT-LEGACY-SHAPED | Audit API for compat | AuditFloatingWindow (compat) | Legacy audit access |

---

## KEYBOARD & INPUT HANDLING

### Key Management

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **KeyModel** | `frontend/app/store/keymodel.ts` | runtime | ACTIVE | Global keyboard event handlers | app.tsx, wave.ts | Chord mode, global shortcuts |
| **KeyUtil** | `frontend/util/keyutil.ts` | runtime | ACTIVE | Key/modifier parsing | keyModel, components | Key event utilities |

---

## I18N & LOCALIZATION

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **I18nCore** | `frontend/app/i18n/i18n-core.ts` | shared | ACTIVE | Translation engine | i18n hook | Core i18n logic |
| **useT** | `frontend/app/i18n/i18n.ts` | shared | ACTIVE | Translation hook | Components | Per-component translation |
| **SettingsAtom** | `frontend/store/global.ts` | shared | ACTIVE | Settings atom (includes language) | AppSettingsUpdater | Language selection |

---

## THEME & STYLING

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **AppSettings** | `frontend/app/app.tsx` | theme | ACTIVE | Window settings updater | AppInner | Applies CSS variables for theme |
| **app.scss** | `frontend/app/app.scss` | theme | ACTIVE | Main app styles | (imported in app.tsx) | Global styles |
| **tailwindsetup.css** | `frontend/tailwindsetup.css` | theme | ACTIVE | Tailwind CSS setup | (imported in app.tsx) | Utility classes |
| **TermTheme** | `frontend/app/view/term/termtheme.ts` | theme | ACTIVE | xterm color scheme | Term | Terminal colors |

---

## UTILITIES & HELPERS

### Common Utilities

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **FocusUtil** | `frontend/util/focusutil.ts` | shared | ACTIVE | Focus management utilities | app.tsx, components | Element selection helpers |
| **PlatformUtil** | `frontend/util/platformutil.ts` | shared | ACTIVE | Platform detection | app.tsx, components | OS-specific handling |
| **KeyUtil** | `frontend/util/keyutil.ts` | shared | ACTIVE | Key event utilities | keyModel, components | Key parsing |
| **Util** | `frontend/util/util.ts` | shared | ACTIVE | General utilities | various | Common helper functions |
| **FontUtil** | `frontend/util/fontutil.ts` | shared | ACTIVE | Font loading | wave.ts | System font loader |

### Advanced Utilities

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **WaveAIFocusUtils** | `frontend/app/aipanel/waveai-focus-utils.ts` | shared | ACTIVE | AI panel focus management | AIPanel | Focus lifecycle |
| **RunCommandUtils** | `frontend/app/aipanel/run-command.ts` | shared | ACTIVE | Command execution utilities | AIMessage | Command parsing |
| **CompatPaneHelpers** | `frontend/app/workspace/widget-helpers.ts` | shared | ACTIVE-BUT-LEGACY-SHAPED | Compat pane utilities | Widgets (compat) | Widget display logic |

---

## ENTRYPOINTS & BOOTSTRAP

| Component | Path | Type | Status | Purpose | Parents | Notes |
|-----------|------|------|--------|---------|---------|-------|
| **wave.ts** | `frontend/wave.ts` | entrypoint | ACTIVE | Main bootstrap file | HTML index | Initializes App or BuilderApp |
| **index.html** | `frontend/index.html` | entrypoint | ACTIVE | HTML root | browser | `<div id="main">` |

---

## SUMMARY BY DOMAIN

### Active Primary Path (Shell, Terminal, Core UI)
- **Shell**: App → AppInner → Workspace
- **Tabs**: TabBar → Tab → TabContent
- **Terminal**: Block → BlockFrame → Term/TermWSH
- **Panels**: AI, Preview, CodeEditor, etc.
- **Overlays**: Widgets, Modals, Floating Windows

### Active-But-Legacy-Shaped (Compatibility Layers)
- **Compat mode**: CompatAppInner → Workspace (compat) → compat widgets
- **Terminal compat**: CompatTerminal (widget-based)
- **AI compat**: AIPanelCompat, CompatConversation
- **API bridges**: compat/* facade layers

### Fallback/Unused (Not in Current Render Path)
- WorkspaceEditor (replaced by UI)
- WorkspaceSwitcher (unused)
- IJSONView (rarely used format)

---

## CRITICAL OBSERVATIONS

1. **Clear Separation**: Shell chrome (App/Workspace) cleanly separated from content (Block/Term)
2. **Compat Mode**: Full fallback path using TideTerm widget system via `compatMode` prop
3. **Floating Windows**: UI surfaces managed through Widgets + floating window system, not legacy panes
4. **AI Integration**: Dedicated AIPanel with proper state management (WaveAIModel)
5. **Modals**: Centralized modal system via ModalsRenderer + queue
6. **State**: Mix of Jotai atoms (global) + local React state + custom models (WorkspaceStore for compat)
7. **Styling**: Tailwind + custom SCSS, CSS variables for theming
8. **i18n**: Centralized translation system with language preference in settings


