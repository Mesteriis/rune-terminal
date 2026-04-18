# Component Relationships by Domain

**Maps component groupings, overlaps, and drift points by functional domain.**

Last updated: 2026-04-18

---

## SHELL CHROME DOMAIN

### Canonical Components
- **App** ← root
- **AppInner** ← main shell layout
- **Workspace** ← workspace container
- **TabBar** + **Tab** ← tab navigation
- **WindowTitleManager** ← title updates
- **AppBackground** ← background/theme

### Overlapping/Similar
- `AppInner` vs `Workspace`: Should be one? AppInner handles global context, Workspace handles layout. Clear separation.
- `TabBar` vs tab management in `WorkspaceStore`: TabBar renders UI, WorkspaceStore manages state. Separate concerns.

### Drift Points
⚠️ **Potential issue**: `AppInner` not memoized but subscribes to all global atoms → full app re-renders on any atom change
- Fix: Consider memoizing AppInner or splitting into smaller provider components
- Impact: Performance on settings changes, modal queue changes, etc

⚠️ **Potential issue**: Keyboard/focus handlers registered in multiple places (AppKeyHandlers + KeyModel)
- Centralized in AppKeyHandlers via wave.ts
- Clean separation

### Dependencies
- AppInner → Workspace (direct child)
- Workspace → TabBar, TabContent, AIPanel, Widgets, ModalsRenderer
- TabBar → TabBarModel (state)
- Tab → ContextMenuModel

---

## TERMINAL DOMAIN

### Canonical Components
- **Term** ← primary terminal UI
- **TermWSH** ← WSH-connected terminal
- **TermModel** ← terminal state
- **Block** ← terminal container
- **BlockFrame** ← block wrapper

### xterm Integration
- **xterm.js**: Managed by TermModel
- **FitAddon**: TermModel wrapper
- **TermTheme**: Color scheme configuration
- **TermUtil**: Parsing utilities

### Terminal-Specific Overlays
- **TermSticker**: Session info label
- **ShellBlocking**: Command approval integration
- **ExplainHandoff**: AI integration point

### Overlapping/Similar
- `Term` vs `TermWSH`: TermWSH is backend connector, Term is renderer. TermWSH ← wraps Term.
- `TermModel` vs `Block` state: TermModel manages xterm instance, Block manages visibility/layout. Separate.

### Compat Path
- **CompatTerminal** ← fallback terminal (widget-based)
  - Only in compat mode
  - Uses WorkspaceStore widget system
  - Connected via compat/terminal.ts facade

### Drift Points
⚠️ **Potential issue**: Multiple terminal types (Term, TermWSH, CompatTerminal) but single render path
- Normal mode: Term → TermWSH
- Compat mode: CompatTerminal
- Clear branching

⚠️ **Potential issue**: Terminal state spread across Block, TermModel, WorkspaceStore (compat)
- Normal: TermModel + TermWSH for state
- Compat: WorkspaceStore.widgets[id].snapshot
- Acceptable split (compat is fallback)

### Dependencies
- Block → Term (when view=="term")
- Term → TermWSH, TermModel, TermTheme, ShellBlocking, ExplainHandoff
- TermWSH → TerminalCompat (compat facade)

---

## PANELS DOMAIN

### Canonical Panel Types

#### AI Panel
- **AIPanel** ← root
- **AIPanelHeader** → AIModeModel, AgentSelectionStrip
- **AIPanelInput** → MultilineInput
- **AIPanelMessages** → AIMessage
- **AIMessage** → Markdown, AIToolUse, ExecutionBlockList, AIFeedbackButtons
- **WaveAIModel** ← state management

#### Preview/Files Panel
- **Preview** ← root
- **PreviewDirectory** ← directory view
- **PreviewMarkdown** ← markdown view
- **CSVView** ← CSV view
- **PreviewEdit** ← text editor
- **PreviewStreaming** ← live output
- **PreviewModel** ← state

#### Code Panel
- **CodeEditor** ← root
- **DiffViewer** ← diff view
- **Monaco** ← backing library

#### Other Panels
- **HelpView** ← help
- **WebView** ← web content
- **VDOMView** + **VDOMModel** + **VDOMUtils** ← tree viewer
- **SysInfoView** ← system info
- **AIFileDiff** ← AI diffs
- **WaveAIView** ← legacy AI view
- **IJSONView** ← JSON output (rarely used)

### Overlapping/Shared
- **Markdown** component used by: AIMessage, PreviewMarkdown, CodeEditor (diff), HelpView
- **AnsiLine** used by: TermOutput (via ijson), SysInfoView
- **Streamdown** vs **Markdown**: Streamdown for real-time, Markdown for static. Clear use cases.

### Compat Path
- **AIPanelCompat** ← fallback AI interface
- **CompatFilesView** ← fallback file browser
- Both use `compatMode` prop and compat/* facades

### Drift Points
⚠️ **Preview has multiple sub-types** (Directory, Markdown, CSV, etc) but single component
- Pattern: Conditional rendering inside Preview component
- Alternative would be separate components or plugin system
- Current approach is acceptable for current scope

⚠️ **Markdown plugin system** (remark plugins) may grow
- Current plugins: content-block, mermaid
- Could become maintenance burden if uncontrolled
- Watch: MarkdownContentBlockPlugin, RemarkMermaidToTag

⚠️ **VDOMView + VDOMModel + VDOMUtils**: Three files, could be consolidated
- Not critical, each has specific responsibility
- Consider consolidation if file grows

### Dependencies
- Block → Preview, CodeEditor, WebView, VDOMView, HelpView, SysInfoView, AIFileDiff, WaveAIView, IJSONView
- Preview → PreviewDirectory, PreviewMarkdown, CSVView, PreviewEdit, PreviewStreaming, PreviewModel
- AIPanel → AIPanelHeader, AIPanelInput, AIPanelMessages, WaveAIModel, AIFeedbackButtons, RunCommandApproval

---

## OVERLAYS & MODALS DOMAIN

### Modals System
- **ModalsRenderer** ← root
- **ModalRegistry** ← modal type definitions
- **Modal** ← base container
- Specific modals: About, MessageModal, TypeaheadModal, UserInputModal, RenameWindowModal, TMuxSessions, RemoteProfilesModal, ConnTypeahead

### Floating Windows
- **Widgets** ← coordinates open/close
- **WidgetItem** ← individual button
- **WidgetActionButton** ← special button
- **UtilitySurfaceFrame** ← floating container
- Specific windows: AppsFloatingWindow, AuditFloatingWindow, FilesFloatingWindow, QuickActionsFloatingWindow, SettingsFloatingWindow, ToolsFloatingWindow

### Other Overlays
- **QuickTipsView** ← contextual tips
- **ProxyDock** ← proxy metrics
- **FlashError** ← error notifications

### Overlapping/Similar
- `Widgets` + `FloatingWindows` vs `Modals`: Clear distinction
  - Widgets: Long-lived, pinned to bottom-right, reusable
  - Modals: Transient, modal (blocks interaction), stacking
  - FloatingWindows: Quasi-modal, can stay open, positioned

- `AppsFloatingWindow` vs `QuickActionsFloatingWindow`: Both are command/app launchers
  - Apps: WaveApp instances
  - QuickActions: User-configured commands
  - Different content, similar UX

### Drift Points
⚠️ **Modal queue management** (ModalsRenderer) uses Zustand (modalsModel)
- Works fine, but separate from main Jotai store
- Could be unified into globalStore
- Current split is acceptable (encapsulation)

⚠️ **Floating windows all have similar open/close logic**
  - Each has: isXxxOpen, xxxButtonRef, toggleXxx()
  - Pattern repetition but not critical
  - Could be extracted to useFloatingWindow() hook

### Dependencies
- Workspace → ModalsRenderer, Widgets
- Widgets → AppsFloatingWindow, AuditFloatingWindow, FilesFloatingWindow, QuickActionsFloatingWindow, SettingsFloatingWindow, ToolsFloatingWindow
- ModalsRenderer → Modal, ModalRegistry

---

## LAYOUT/SPLIT DOMAIN

### Layout System
- **TileLayout** ← main block layout
- **Block** ← individual block container
- **BlockFrame** ← block wrapper
- **LayoutLib** ← layout model factory
- **BlockUtil** ← layout utilities

### Panel Split System
- **WorkspaceLayoutModel** ← split state (AI panel %)
- **react-resizable-panels** ← backing library
  - Group, Panel, Separator
- **Workspace** ← integrates panels

### Compat Layout
- **CompatSplitLayout** ← fallback layout (widget-based)

### Overlapping/Similar
- `TileLayout` vs `react-resizable-panels`: Different purposes
  - TileLayout: Block grid layout
  - react-resizable-panels: Top-level AI/Main split
  - No overlap

- `BlockFrame` vs `Block`: BlockFrame wraps Block
  - BlockFrame: Rendering wrapper
  - Block: Content dispatch
  - Clear hierarchy

### Drift Points
⚠️ **TileLayout complexity**: Handles splits, resizes, deletion
  - Large component, could be split:
    - TileLayout (render)
    - TileLayoutModel (state)
    - TileLayoutDragDrop (drag/drop)
  - Current scope acceptable for 1.0

⚠️ **BlockFrame conditional rendering**: Dispatches based on block.meta.view
  - 10+ different view types handled
  - Could become fragile if new views keep appearing
  - Consider registering view renderers (plugin system)

### Dependencies
- Workspace → TileLayout (via TabContent)
- TileLayout → Block → BlockFrame → (Term/Preview/CodeEditor/etc)
- WorkspaceLayoutModel ← used by Workspace

---

## FILES/NAVIGATION DOMAIN

### Directory/File Components
- **PreviewDirectory** ← directory tree view
- **EntryManager** ← individual file entry
- **PreviewDirectoryUtils** ← directory utilities

### File Browser Windows
- **FilesFloatingWindow** ← quick file access
- **SettingsFloatingWindow** (includes file browser)

### Compat Path
- **CompatFilesView** ← fallback file browser

### Overlapping/Similar
- `PreviewDirectory` vs `FilesFloatingWindow`: Both show files
  - PreviewDirectory: Main content area, full view
  - FilesFloatingWindow: Quick access, minimal
  - Different purposes

### Drift Points
⚠️ **Directory handling**: Both compat and modern paths
- Modern: fs.ts API + PreviewDirectory
- Compat: compat/fs.ts + CompatFilesView
- Acceptable split

⚠️ **Search in directories**: PreviewDirectory supports search
- Works but could be extracted to shared SearchableList component
- Low priority

### Dependencies
- Preview → PreviewDirectory, EntryManager
- FilesFloatingWindow → (custom file list)
- WorkspaceStore → widgets (compat files)

---

## AI & AGENT DOMAIN

### Core AI Components
- **AIPanel** ← main interface
- **WaveAIModel** ← state management
- **AIPanelHeader** → AIModeModel, AgentSelectionStrip
- **AIPanelInput** ← user prompt
- **AIPanelMessages** ← message history
- **AIMessage** ← individual message
- **AIToolUse** ← tool invocation

### AI Integration Points
- **RunCommandApproval** ← shell command approval
- **RunCommandUtils** ← command utilities
- **AIFeedbackButtons** ← user feedback
- **ExplainHandoff** ← terminal → AI

### Compat Path
- **AIPanelCompat** ← fallback AI
- **CompatConversation** ← conversation bridge
- **AgentCompat**, **ConversationCompat**, **ExecutionCompat** ← API facades

### Overlapping/Similar
- `WaveAIModel` vs `CompatConversation`: Two state paths
  - WaveAIModel: Modern state (Jotai-like)
  - CompatConversation: Legacy bridge
  - Acceptable split

- `RunCommandApproval` vs `ShellBlocking`: Both about approval
  - RunCommandApproval: AI-initiated commands (UI in AIToolUse)
  - ShellBlocking: Terminal-initiated commands (UI in Term)
  - Clear separation

### Drift Points
⚠️ **AI state management complex**: WaveAIModel manages:
- Conversation messages
- Current mode
- Tool execution state
- Rate limiting
- Feedback

Consider breaking into smaller models if it grows.

⚠️ **Multiple approval layers**: Commands can be approved in:
- AIToolUse (AI-generated)
- Term (shell-blocking)
- Settings (global)

Interaction between layers should be tested.

### Dependencies
- Workspace → AIPanel
- AIPanel → WaveAIModel, AIPanelHeader, AIPanelInput, AIPanelMessages
- AIMessage → AIToolUse, RunCommandApproval
- Widgets → ExplainHandoff (for Explain in AI button)

---

## MCP & TOOLS DOMAIN

### Tools/MCP Display
- **ToolsFloatingWindow** ← tools browser
- **MCPCompat** ← MCP API bridge (compat)

### Quick Actions
- **QuickActionsFloatingWindow** ← launcher
- **QuickActionsCompat** ← API bridge (compat)

### Audit
- **AuditFloatingWindow** ← audit log
- **AuditCompat** ← API bridge (compat)

### Overlapping/Similar
- `ToolsFloatingWindow` vs `QuickActionsFloatingWindow`: Different sources
  - Tools: System tools/MCP
  - QuickActions: User-configured commands
  - No overlap

### Drift Points
⚠️ **Compat layer needed** for all: tools, MCP, audit
- Normal path: RPC API calls (TabRpcClient)
- Compat path: compat/* facades
- Acceptable split but increases surface area

⚠️ **Tools discovery**: How tools are listed/discovered
- Should be stable, watch for changes

### Dependencies
- Widgets → ToolsFloatingWindow, QuickActionsFloatingWindow, AuditFloatingWindow
- ToolsFloatingWindow → MCPCompat (compat)
- QuickActionsFloatingWindow → QuickActionsCompat (compat)
- AuditFloatingWindow → AuditCompat (compat)

---

## REMOTE & PROXY DOMAIN

### Proxy System
- **ProxyDock** ← metrics display
- **Proxy** ← individual connection
- **ProxyModel** ← connection state
- **ProxyRPC** ← network communication
- **ChannelCard** ← channel display
- **ChannelForm** ← channel config
- **HistoryList** ← history display
- **MetricsChart** ← metrics viz
- **StatusBadge** ← status indicator
- **ProxyDockModel** ← dock state

### Remote Preferences
- **RemotePreference** ← connection preference logic
- **RemoteProfilesModal** ← profile selector

### Overlapping/Similar
- `ProxyDock` vs `Proxy` vs `ProxyModel`: Clear hierarchy
  - ProxyDock: Container
  - Proxy: Individual display
  - ProxyModel: State
  - Clean separation

### Drift Points
⚠️ **Proxy system complexity**: Many sub-components
- ProxyDock, Proxy, ChannelCard, ChannelForm, HistoryList, MetricsChart, StatusBadge
- Well-organized but could be extracted to proxy/index.ts module
- Not critical for current release

### Dependencies
- AppInner → ProxyDock (overlay)
- ProxyDock → Proxy, ChannelCard, HistoryList, MetricsChart, StatusBadge
- SettingsFloatingWindow → ChannelForm

---

## SETTINGS/HELP/TRUST DOMAIN

### Settings
- **SettingsFloatingWindow** ← main settings UI
- **AppSettingsUpdater** ← applies settings

### Help
- **HelpView** ← help content view
- **QuickTipsView** ← contextual tips

### About/Info
- **About** ← about modal

### Overlapping/Similar
- `SettingsFloatingWindow` vs `AppSettingsUpdater`: Different roles
  - SettingsFloatingWindow: UI to change settings
  - AppSettingsUpdater: Hook that applies settings
  - Clean separation

### Drift Points
⚠️ **Settings applied via AppSettingsUpdater hook**
- Works but could be more reactive
- Currently watches `settingsAtom` and applies CSS
- Acceptable for now

### Dependencies
- Widgets → SettingsFloatingWindow
- AppInner → AppSettingsUpdater
- Block → HelpView (when view=="help")
- Workspace → QuickTipsView

---

## SHARED UI PRIMITIVES DOMAIN

### Button Family
- **Button**, **IconButton**, **LinkButton**, **MenuButton** (core)
- **CopyButton**, **EmojiButton** (specialized)

### Menu Family
- **ExpandableMenu**, **FlyoutMenu** (containers)
- **MenuButton** (trigger)

### Input Family
- **Input**, **MultilineInput**, **Search** (text inputs)
- **Toggle** (boolean input)

### Display Family
- **ProgressBar**, **TypingIndicator** (feedback)
- **Markdown**, **Streamdown**, **AnsiLine** (content)

### Utility Components
- **ErrorBoundary** ← error handling
- **Tooltip**, **Popover** ← positioning
- **Magnify** ← zoom control
- **CenteredDiv** ← layout helper

### Overlapping/Similar
- `Button` vs `IconButton` vs `LinkButton`: Different semantics
  - Button: Standard button
  - IconButton: Icon-only
  - LinkButton: Styled as link
  - No overlap

- `Markdown` vs `Streamdown`: Different use cases
  - Markdown: Static markdown rendering
  - Streamdown: Real-time streaming
  - Clear separation

### Drift Points
⚠️ **Button variants could use CSS-in-JS or styled-components**
- Currently: className-based styling
- Works but could be more maintainable
- Not critical for 1.0

⚠️ **Emoji palette**: Hardcoded emoji list
- Could become maintenance burden
- Consider external library if grows

### Dependencies
- Various components → Button, IconButton, Input, etc (highly used)

---

## MARKDOWN & CONTENT DOMAIN

### Markdown Processing
- **Markdown** ← renderer (uses remark)
- **Streamdown** ← real-time renderer
- **AnsiLine** ← ANSI coloring

### Remark Plugins
- **MarkdownContentBlockPlugin** ← content block renderer
- **RemarkMermaidToTag** ← Mermaid diagram support
- **MarkdownUtil** ← utilities

### Overlapping/Similar
- `Markdown` vs `Streamdown`: Processing approach
  - Markdown: Full parse → render
  - Streamdown: Incremental parse → render
  - No overlap

### Drift Points
⚠️ **Plugin system may grow**: Currently hardcoded plugins
- MarkdownContentBlockPlugin
- RemarkMermaidToTag
- Could become harder to maintain if uncontrolled

### Dependencies
- AIMessage → Markdown, AnsiLine
- PreviewMarkdown → Markdown
- PreviewStreaming → Streamdown
- HelpView → Markdown

---

## STATE MANAGEMENT DOMAIN

### Global State (Jotai)
- **GlobalStore** ← provider
- **atoms** ← atom definitions (40+)
- **GlobalModel**, **ClientModel**, **TabModelContext** ← complex atoms

### Local Models
- **BlockModel** ← block state
- **TermModel** ← terminal state
- **PreviewModel** ← preview state
- **ProxyModel** ← proxy state
- **ProxyDockModel** ← dock state

### Compat State (Zustand)
- **WorkspaceStore** ← compat workspace state
- **TerminalStore** ← terminal snapshots

### Menu/Modal State (Zustand)
- **ContextMenuModel** ← context menu queue
- **ModalModel** ← modal queue

### Other State Managers
- **WorkspaceLayoutModel** ← split layout state

### Overlapping/Similar
- `Jotai atoms` vs `Zustand stores`: Different libraries
  - Atoms: Lightweight, functional
  - Zustand: Full store management
  - Used for different purposes (acceptable)

- `GlobalModel` vs `ClientModel` vs `TabModelContext`: Three sources
  - GlobalModel: Window/workspace level
  - ClientModel: Client level
  - TabModelContext: Tab-specific
  - Clear hierarchy

### Drift Points
⚠️ **Multiple state management libraries**:
- Jotai (global)
- Zustand (models, compat)
- React.useState (local components)
- Works but increases cognitive load

⚠️ **Compat state (WorkspaceStore) shadowing new state**
- In compat mode, WorkspaceStore provides primary state
- Normal mode uses WOS + Jotai atoms
- Acceptable split

### Dependencies
- App → GlobalStore (Provider)
- Various components → useAtomValue(atoms.xxx)

---

## KEYBOARD & INPUT DOMAIN

### Key Handling
- **KeyModel** ← global handlers
- **AppKeyHandlers** ← keyboard setup
- **KeyUtil** ← key parsing
- **registerGlobalKeys()** ← registration

### Terminal-Specific
- **TermModel** ← terminal keybindings
- **ShellBlocking** ← shell integration
- **CompatTerminalKeydown** ← compat keybinding

### Overlapping/Similar
- `KeyModel` vs `TermModel` keybindings: Different scopes
  - KeyModel: Global shell shortcuts
  - TermModel: Terminal-specific keybindings
  - No overlap

### Drift Points
⚠️ **Keyboard event registration centralized**
- AppKeyHandlers (global document listeners)
- Term (terminal-specific listeners)
- Clean separation but watch for conflicts

### Dependencies
- App → AppKeyHandlers
- KeyModel → KeyUtil
- Term → TermModel (keybindings)

---

## I18N DOMAIN

### Translation System
- **i18nCore** ← translation engine
- **useT** ← translation hook
- **SettingsAtom** ← language preference

### Overlapping/Similar
- None identified; simple system

### Drift Points
⚠️ **Limited localization**: Currently i18n-core and basic hook
- May need expansion if supporting many languages
- Currently acceptable

### Dependencies
- Components → useT() hook

---

## BUILDER/APPS DOMAIN

### Builder App
- **BuilderApp** ← root (separate from Wave)
- **BuilderRouting** ← builder UI

### Apps System
- **AppsFloatingWindow** ← app launcher

### Note
- Builder is separate initialization path (initBuilder vs initWave)
- Not part of primary Wave render tree
- Wave-level Apps system is different from Builder

### Dependencies
- wave.ts → BuilderApp (separate render)
- Widgets → AppsFloatingWindow

---

## RUNTIME & API DOMAIN

### API Clients
- **RpcApi** ← main API client
- **TabRpcClient** ← tab-specific RPC
- **TabRpcUtil** ← RPC utilities

### Compat Facades
- **CompatApiFacade** ← main compat bridge
- **AgentCompat**, **ConversationCompat**, **ExecutionCompat** ← domain facades
- **TerminalCompat**, **FilesCompat**, **WorkspaceCompat** ← domain facades
- **ToolsCompat**, **QuickActionsCompat**, **MCPCompat**, **AuditCompat** ← domain facades

### Overlapping/Similar
- `RpcApi` vs `CompatApiFacade`: Two API systems
  - RpcApi: Modern direct RPC
  - CompatApiFacade: Legacy wrapper
  - No overlap, intentional split

### Drift Points
⚠️ **API surface area expanding**: Each domain has compat facade
- 8+ compat facades currently
- Watch for maintenance burden

### Dependencies
- wave.ts → RpcApi, TabRpcClient
- Components → RpcApi (for commands)
- Compat components → compat/* facades

---

## UTILITIES & HELPERS DOMAIN

### Common Utilities
- **FocusUtil** ← focus management
- **PlatformUtil** ← OS detection
- **KeyUtil** ← key parsing
- **Util** ← general helpers
- **FontUtil** ← font loading

### Advanced Utilities
- **WaveAIFocusUtils** ← AI-specific focus
- **RunCommandUtils** ← command utilities
- **WidgetHelpers** ← widget utilities

### Overlapping/Similar
- None identified; clear responsibilities

### Drift Points
⚠️ **General Util module**: Could become dumping ground
- Currently reasonable size
- Watch for unrelated functions

### Dependencies
- wave.ts → FontUtil
- Components → FocusUtil, PlatformUtil, KeyUtil, Util

---

## SUMMARY: DRIFT POINTS BY PRIORITY

### 🔴 HIGH PRIORITY (Architectural)
1. **AppInner not memoized** → causes full re-renders on any atom change
2. **Multiple state systems** (Jotai + Zustand + useState) → cognitive load
3. **AI state growing** (WaveAIModel) → consider splitting
4. **TileLayout complexity** → consider module extraction
5. **Modal queue separate from main store** → consider unification

### 🟡 MEDIUM PRIORITY (Maintenance)
6. **Floating window repetition** (isXxxOpen pattern) → consider hook extraction
7. **Markdown plugin system** → watch for growth
8. **API facade surface area** (8+ compat facades) → track maintenance load
9. **BlockFrame conditional dispatch** → watch for new view types
10. **Directory navigation** → some duplication between modern/compat

### 🟢 LOW PRIORITY (Nice-to-have)
11. Button styling could use CSS-in-JS
12. Emoji palette could be external library
13. ProxyDock sub-components could be module
14. VDOM module could be consolidated (3 files)

---

## RECOMMENDATIONS FOR PHASE 2.0

If scope expands beyond 1.0:

1. **Extract TileLayoutModel** from TileLayout component
2. **Create useFloatingWindow() hook** for Widgets consistency
3. **Unify state**: Evaluate moving Zustand models to Jotai atoms
4. **Memoize AppInner** or split into smaller providers
5. **Plugin registry** for view types (not hardcoded in BlockFrame)

---

## COMPONENT REUSE SCORECARD

| Category | Reuse | Consolidation Opportunity |
|----------|-------|--------------------------|
| Buttons | High | ✅ Consolidated in element/ |
| Inputs | High | ✅ Consolidated in element/ |
| Markdown | Medium | ⚠️ Two renderers (Markdown, Streamdown) - by design |
| Preview types | Medium | ❌ Could extract, but acceptable in Preview.tsx |
| Modals | Low | ✅ Each modal type unique |
| Floating Windows | Low | ⚠️ Similar pattern but different content |
| Layout | Medium | ⚠️ TileLayout + react-resizable-panels (different concerns) |
| AI Components | Low | ✅ Specific to AI domain |
| Panels | Low | ✅ Each panel unique |


