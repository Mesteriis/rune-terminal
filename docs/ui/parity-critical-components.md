# Parity-Critical Frontend Components

**Identifies components whose visual/behavioral parity with TideTerm is release-blocking.**

Last updated: 2026-04-18

---

## Overview

This document lists ONLY components that materially affect visual or behavioral parity with TideTerm for the v1.0.0 release.

Cross-reference:
- [shell-chrome-reference.md](./shell-chrome-reference.md) — Tide shell chrome baseline
- [terminal-parity-reference.md](./terminal-parity-reference.md) — Tide terminal baseline
- [ui-parity-reference.md](./ui-parity-reference.md) — Tide UI baseline
- [ui-system-parity-gap-map.md](./ui-system-parity-gap-map.md) — Current gaps
- [shell-chrome-validation.md](./shell-chrome-validation.md) — Shell chrome validation

---

## SHELL CHROME PARITY

### 1. TabBar + Tab Components

**File path:** `frontend/app/tab/tabbar.tsx`, `frontend/app/tab/tab.tsx`

**Why parity-critical:**
- Top shell bar density and control placement directly visible to user
- Tab width, height, padding, and active state affect shell "feel"
- Tab separator visibility affects readability
- Workspace switcher and AI toggle placement set shell hierarchy

**Tide reference files:**
- `tideterm/frontend/app/tab/tabbar.tsx`
- `tideterm/frontend/app/tab/tab.tsx`
- `tideterm/frontend/app/tab/tabbar.scss`
- `tideterm/frontend/app/tab/tab.scss`

**Current status:** PARTIAL
- Tab bar exists and functions
- Height and density roughly match Tide
- ⚠️ Tab separator weight may differ
- ⚠️ Hover states may need refinement

**Linked validation:**
- [shell-chrome-validation.md](./shell-chrome-validation.md) — Current tab bar validation

### 2. App Shell Layout (App + AppInner)

**File path:** `frontend/app/app.tsx`, `frontend/app/app-bg.tsx`

**Why parity-critical:**
- Full-window framing and root flex sizing
- Background color/transparency settings
- No invented outer shell padding above tab bar
- Zoom factor application

**Tide reference files:**
- `tideterm/frontend/app/app.tsx`
- `tideterm/frontend/app/app.scss`

**Current status:** MATCHES
- Shell structure matches Tide
- Zoom factor applied correctly
- Transparency settings work

### 3. Workspace Layout (Workspace Container)

**File path:** `frontend/app/workspace/workspace.tsx`

**Why parity-critical:**
- Overall layout grid: top bar → main content row
- AI panel placement as true shell column (left of main)
- Utility rail inside main content (right side)
- Split proportions and collapsibility

**Tide reference files:**
- `tideterm/frontend/app/workspace/workspace.tsx`
- `tideterm/frontend/app/workspace/widgets.tsx`

**Current status:** MATCHES
- Layout structure matches Tide
- react-resizable-panels integration mirrors Tide's split behavior
- AI panel toggles properly
- Utility rail placement correct

### 4. Widgets/Utility Rail (Right-Side Bar)

**File path:** `frontend/app/workspace/widgets.tsx`, `frontend/app/workspace/widget-item.tsx`

**Why parity-critical:**
- Icon sizing and spacing in utility rail
- Button hover/active states
- Floating window positioning and sizing
- Secondary/tertiary visual weight vs main content

**Tide reference files:**
- `tideterm/frontend/app/workspace/widgets.tsx`
- `tideterm/frontend/app/element/iconbutton.tsx`
- `tideterm/frontend/app/element/iconbutton.scss`

**Current status:** PARTIAL
- Widget bar exists and functions
- Floating windows render
- ⚠️ Icon sizing may need refinement
- ⚠️ Floating window z-index/stacking may need review

---

## TERMINAL PARITY

### 1. Term + TermWSH (Terminal Renderer)

**File path:** `frontend/app/view/term/term.tsx`, `frontend/app/view/term/term-wsh.tsx`

**Why parity-critical:**
- xterm.js instance lifecycle and scrollback hydration
- Copy/paste keyboard shortcuts (Ctrl+Shift+V, Ctrl+Shift+C)
- Drag-drop path insertion
- Jump-to-latest scroll behavior
- Clipboard handling (text + image blobs)

**Tide reference files:**
- `tideterm/frontend/app/view/term/termwrap.ts`
- `tideterm/frontend/app/view/term/term.tsx`
- `tideterm/frontend/app/view/term/term-model.ts`

**Current status:** PARTIAL
- xterm.js instance works
- Basic scrollback works
- ✅ Copy/paste shortcuts implemented
- ✅ Drag-drop path insertion works
- ⚠️ Image blob handling may differ from Tide
- ⚠️ Jump-to-latest behavior needs validation

**Linked validation:**
- [terminal-parity-reference.md](./terminal-parity-reference.md) — Terminal behavior baseline
- [terminal-parity-validation.md](./terminal-parity-validation.md) — Current terminal validation

### 2. TermModel (Terminal State Management)

**File path:** `frontend/app/view/term/term-model.ts`

**Why parity-critical:**
- xterm add-on registration (FitAddon, etc)
- Keyboard shortcut binding
- Selection and copy behavior
- Theme application

**Tide reference files:**
- `tideterm/frontend/app/view/term/term-model.ts`

**Current status:** MATCHES
- xterm instance initialized correctly
- Keyboard shortcuts bound
- Theme colors set

### 3. BlockFrame (Terminal Container Chrome)

**File path:** `frontend/app/block/blockframe.tsx`

**Why parity-critical:**
- Block header chrome (30px strip)
- Connection indicator/pill
- Block status and actions (restart, explain)
- Drag affordance for splits
- Title/icon zone

**Tide reference files:**
- `tideterm/frontend/app/block/blockframe.tsx`
- `tideterm/frontend/app/block/block.scss`

**Current status:** DIVERGED ⚠️
- Missing compact block header chrome in compat mode
- Status overlays are large in-content overlays instead of header indicators
- Drag affordance not visible as pane chrome
- Connection pill missing
- **This is the largest remaining structural mismatch** per [ui-parity-gap-map.md](./ui-parity-gap-map.md)

**Gap issue:**
- See [ui-parity-gap-map.md](./ui-parity-gap-map.md) **Gap #1: Compat split panes do not use Tide-like block header chrome**

### 4. TermTheme (Terminal Colors)

**File path:** `frontend/app/view/term/termtheme.ts`

**Why parity-critical:**
- xterm color scheme matches Tide
- Syntax highlighting consistency
- Dark/light mode support
- Color variable naming

**Tide reference files:**
- `tideterm/frontend/app/view/term/termtheme.ts`

**Current status:** MATCHES
- Color palette set correctly
- Theme switching works

---

## PANEL PARITY

### 1. AIPanel (AI Chat Interface)

**File path:** `frontend/app/aipanel/aipanel.tsx`

**Why parity-critical:**
- AI panel placement as shell column (toggleable)
- Panel header controls (close, mode selector)
- Message history display
- Input field and send button
- Tool use approval UI

**Tide reference files:**
- `tideterm/frontend/app/aipanel/aipanel.tsx`
- (Tide and RunaTerminal diverge here; Tide has basic AI, RunaTerminal has full WaveAI)

**Current status:** DIVERGED (by design)
- RunaTerminal has more sophisticated AI panel
- Parity requirement: panel must be toggleable, positioned as left shell column
- ✅ Toggle works
- ✅ Positioning correct

**Note:** WaveAI is RunaTerminal enhancement, not Tide parity item

### 2. Preview (File/Directory View)

**File path:** `frontend/app/view/preview/preview.tsx`

**Why parity-critical:**
- Preview dispatching based on file type
- Directory tree rendering
- Markdown rendering
- CSV table rendering
- Search/filter in directory
- File operations (open, edit, rename)

**Tide reference files:**
- `tideterm/frontend/app/view/preview/preview.tsx`

**Current status:** PARTIAL
- Multi-format preview works
- Directory tree works
- Markdown renders
- CSV renders
- ⚠️ File operations may differ
- ⚠️ Search performance with large directories

---

## MODAL & OVERLAY PARITY

### 1. ModalsRenderer + Modal Components

**File path:** `frontend/app/modals/modalsrenderer.tsx`, `frontend/app/modals/modal.tsx`

**Why parity-critical:**
- Modal stacking and z-index
- Modal backdrop behavior
- Modal positioning (centered, etc)
- Modal content accessibility

**Tide reference files:**
- `tideterm/frontend/app/modals/modalsrenderer.tsx`
- `tideterm/frontend/app/modals/modal.tsx`

**Current status:** PARTIAL
- Modals render and work
- ⚠️ Backdrop behavior may differ (blur/opacity)
- ⚠️ Modal animations may not match Tide

### 2. TypeaheadModal (Command/Symbol Search)

**File path:** `frontend/app/modals/typeaheadmodal.tsx`

**Why parity-critical:**
- Command palette search functionality
- Fuzzy matching performance
- Keyboard navigation (up/down/enter)
- Item rendering and icons

**Tide reference files:**
- `tideterm/frontend/app/modals/typeaheadmodal.tsx`

**Current status:** PARTIAL
- Typeahead works
- ⚠️ Fuzzy matching may differ
- ⚠️ Performance with large lists untested

---

## CONTEXT MENU PARITY

### 1. App Context Menu (Right-Click)

**File path:** `frontend/app/app.tsx` (handleContextMenu function)

**Why parity-critical:**
- Right-click context menu triggers
- Menu item list (cut/copy/paste/open in block)
- Open current directory from terminal
- Open clipboard URL
- Context detection (terminal vs file vs generic)

**Tide reference files:**
- `tideterm/frontend/app/app.tsx` (handleContextMenu)

**Current status:** MATCHES
- Context menu works
- Items display correctly
- Terminal directory detection works

---

## KEYBOARD & SHORTCUTS PARITY

### 1. Global Keyboard Handlers

**File path:** `frontend/app/store/keymodel.ts`

**Why parity-critical:**
- Global shortcuts (Cmd+T, Cmd+W, Cmd+N, etc)
- Chord mode (Ctrl+K sequences)
- Key event routing to active element
- Terminal focus behavior

**Tide reference files:**
- `tideterm/frontend/app/store/keymodel.ts`

**Current status:** PARTIAL
- Basic shortcuts work
- ⚠️ Chord mode implementation differs
- ⚠️ Focus routing edge cases untested

### 2. Terminal Keyboard Shortcuts

**File path:** `frontend/app/view/term/term-model.ts`

**Why parity-critical:**
- Copy (Ctrl+Shift+C)
- Paste (Ctrl+Shift+V)
- Jump to latest (Shift+End)
- Scroll up/down (Shift+PageUp/Down)

**Tide reference files:**
- `tideterm/frontend/app/view/term/term-model.ts`

**Current status:** PARTIAL
- Copy/paste work
- ⚠️ Jump-to-latest needs validation
- ⚠️ Scroll behavior edge cases

---

## STYLING & THEMING PARITY

### 1. AppBackground + CSS Variables

**File path:** `frontend/app/app-bg.tsx`

**Why parity-critical:**
- Transparency/blur window settings
- Background color application
- CSS variable --main-bg-color
- Zoom factor CSS variables (--zoomfactor, --zoomfactor-inv)

**Tide reference files:**
- `tideterm/frontend/app/app-bg.tsx`
- `tideterm/frontend/app/app.scss`

**Current status:** MATCHES
- Settings applied correctly
- CSS variables work
- Transparency works

### 2. Typography & Density

**File path:** `frontend/app/app.scss`

**Why parity-critical:**
- Font family and sizes
- Line heights and spacing
- Padding and margin rhythm
- Hover/focus state weights

**Tide reference files:**
- `tideterm/frontend/app/app.scss`
- Individual component `.scss` files

**Current status:** PARTIAL
- Basic typography matches
- ⚠️ Density in some components may need refinement
- ⚠️ Hover/focus states may differ

---

## SUMMARY TABLE

| Component | File | Parity Status | Gap Severity | Release Blocker |
|-----------|------|-------------|-------|---------|
| TabBar + Tab | tab/tabbar.tsx | PARTIAL | Low | No |
| App Shell | app/app.tsx | MATCHES | — | No |
| Workspace Layout | workspace/workspace.tsx | MATCHES | — | No |
| Widgets Rail | workspace/widgets.tsx | PARTIAL | Low | No |
| Term + TermWSH | view/term/term.tsx | PARTIAL | Low | No |
| TermModel | view/term/term-model.ts | MATCHES | — | No |
| BlockFrame | block/blockframe.tsx | DIVERGED | HIGH | Yes ⚠️ |
| TermTheme | view/term/termtheme.ts | MATCHES | — | No |
| AIPanel | aipanel/aipanel.tsx | DIVERGED | — | No (by design) |
| Preview | view/preview/preview.tsx | PARTIAL | Low | No |
| ModalsRenderer | modals/modalsrenderer.tsx | PARTIAL | Low | No |
| TypeaheadModal | modals/typeaheadmodal.tsx | PARTIAL | Low | No |
| Context Menu | app/app.tsx | MATCHES | — | No |
| Global Keys | store/keymodel.ts | PARTIAL | Low | No |
| Terminal Keys | view/term/term-model.ts | PARTIAL | Low | No |
| AppBackground | app/app-bg.tsx | MATCHES | — | No |
| Typography | app/app.scss | PARTIAL | Low | No |

---

## HIGH-PRIORITY GAPS (Release Blocking)

### Gap #1: BlockFrame Missing Tide-Like Header Chrome ⚠️

**Issue:** Compat split panes do not use Tide-like block header chrome

**Current behavior:**
- Compat panes render as rounded bordered regions with content filling full pane
- No compact 30px header strip at top of terminal or files panes
- No icon/title zone, no connection pill, no compact end-icon cluster

**Tide behavior:**
- Compact block headers from `blockframe.tsx` and `block.scss`
- Header establishes pane identity and hierarchy
- Connection pill in header
- Actions (restart, explain) in header, not body overlays

**Why release-blocking:**
- Largest remaining structural mismatch in active UI
- Shell reads as "custom compat panes" instead of "consistently Tide-like"
- Affects parity dimensions: structure, density, spacing, shell feel

**Linked docs:**
- [ui-parity-gap-map.md](./ui-parity-gap-map.md#1-compat-split-panes-do-not-use-tide-like-block-header-chrome) — Full gap analysis
- [compat-pane-header.tsx](../app/workspace/compat-pane-header.tsx) — Current compat header

### Gap #2: Terminal Status Overlays vs Header Indicators ⚠️

**Issue:** Terminal status and actions rendered as large in-content overlays instead of compact header indicators

**Current behavior:**
- Compat terminals show lifecycle text in top-left of terminal body
- Restart and explain are large bordered buttons floating in top-right
- Status detail/error text stacked under overlays

**Tide behavior:**
- Status and actions in compact block header
- Routine status uses icons and short header text, not persistent body overlays
- Connection issues can appear below header as special case

**Why important:**
- Current overlays make terminal body feel heavier, less Tide-like
- Compete visually with terminal output
- Affects parity dimensions: structure, iconography, density, bounds/anchoring

**Linked docs:**
- [ui-parity-gap-map.md](./ui-parity-gap-map.md#2-terminal-status-and-actions-are-rendered-as-large-in-content-overlays) — Full gap analysis

### Gap #3: Drag Affordance Not Visible in Pane Chrome ⚠️

**Issue:** Drag affordance for split moves not visible as pane chrome

**Current behavior:**
- Whole compat pane is draggable for split moves
- No distinct header zone or obvious chrome-level drag affordance
- Split Right action is absolute button floating over pane body

**Tide behavior:**
- Drag behavior associated with block header via `dragHandleRef`
- Pane actions and pane movement grouped in header, not floating over working surface

**Linked docs:**
- [ui-parity-gap-map.md](./ui-parity-gap-map.md#3-drag-affordance-is-not-visible-as-pane-chrome) — Full gap analysis

---

## RECOMMENDATIONS FOR PARITY WORK

1. **Priority: High** — Add block header chrome to compat panes (BlockFrame refinement)
2. **Priority: High** — Move terminal status/actions from body overlays to header indicators
3. **Priority: High** — Make drag affordance visible in pane headers
4. **Priority: Medium** — Refine tab bar hover/separator states
5. **Priority: Medium** — Validate typeahead fuzzy matching performance
6. **Priority: Low** — Test modal animations and backdrop behavior
7. **Priority: Low** — Refine typography density in components

---

## VALIDATION CHECKLIST

Before 1.0.0 release:

- [ ] BlockFrame header chrome matches Tide in compat mode
- [ ] Terminal status moved to header, body overlays removed
- [ ] Drag affordance visible in block headers
- [ ] Tab bar visual weight and separators match Tide
- [ ] Terminal copy/paste shortcuts work on all platforms
- [ ] Context menu appears on right-click with correct items
- [ ] Modals stack and layer correctly
- [ ] Keyboard shortcuts route correctly to focused elements
- [ ] Zoom factor applies to all UI elements
- [ ] Transparency/blur settings work as expected
- [ ] Shell chrome feels consistent with Tide


