# Main Screen Workbench UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the Rune Terminal main screen toward the approved `Commander-weighted Workbench` direction: quieter shell chrome, stronger active-widget hierarchy, an AI panel that behaves like a collapsible work panel, and a more operator-like AI presentation, without changing backend or runtime behavior.

**Architecture:** Keep the existing frontend layering intact. Limit changes to shell/AI/terminal widget styles, view-only shell state, and tests that validate the new default presentation. Reuse the shared interaction primitives already introduced in `frontend/src/index.css` and keep the collapse behavior in app/widget state only.

**Tech Stack:** React 18, TypeScript, Vite, inline style modules, shared UI primitives/components, Vitest, in-app browser split runtime

---

## File map

### Existing files to modify

- `frontend/src/app/App.tsx`
  - current shell composition and workspace panel sizing
  - likely place for AI panel collapsed-width/default-width wiring if shell-level width is needed
- `frontend/src/app/app-ai-sidebar.tsx`
  - owns AI shell/sidebar mounting and likely the best place for default collapsed/expanded shell state
- `frontend/src/widgets/ai/ai-panel-header-widget.tsx`
  - active-thread header framing and conversation-trigger presentation
- `frontend/src/widgets/ai/ai-composer-widget.tsx`
  - compact compose surface, collapsed-state affordances, operator-like composer summary
- `frontend/src/widgets/ai/ai-panel-widget.styles.ts`
  - AI chrome, message rhythm, composer layout, route block styling
- `frontend/src/widgets/shell/shell-topbar-widget.tsx`
  - workspace tab layout and shell actions
- `frontend/src/widgets/shell/shell-topbar-widget.styles.ts`
  - topbar visual weight, active tab treatment
- `frontend/src/widgets/terminal/terminal-widget.styles.ts`
  - stronger active terminal surface hierarchy
- `frontend/src/shared/ui/components/terminal-status-header.styles.ts`
  - calmer status badge vs action contrast
- `frontend/src/shared/ui/components/terminal-toolbar.styles.ts`
  - toolbar rhythm aligned with active-widget model
- `frontend/src/index.css`
  - shell-wide utility tokens/classes for any new collapsed-state marker styles if needed
- `frontend/docs/ui-architecture.md`
  - document the new main-screen shell/AI presentation rule
- `docs/validation/agent.md`
  - validation entry for AI panel presentation/collapse behavior
- `docs/validation/workspace.md`
  - validation entry for shell/topbar/terminal main-screen hierarchy

### Existing tests to modify

- `frontend/src/widgets/ai/ai-panel-header-widget.test.tsx`
- `frontend/src/widgets/ai/ai-composer-widget.test.tsx`
- `frontend/src/widgets/shell/shell-topbar-widget.test.tsx`
- `frontend/src/app/app-ai-sidebar.test.tsx`
- `frontend/src/shared/ui/components/accessibility-contracts.test.tsx`

### New tests that may be needed

- `frontend/src/widgets/ai/ai-panel-collapsible-state.test.tsx`
  - only create this file if the collapse behavior cannot be cleanly covered in `app-ai-sidebar.test.tsx`

---

### Task 1: Quiet the shell chrome and strengthen the active workspace tab

**Files:**
- Modify: `frontend/src/widgets/shell/shell-topbar-widget.styles.ts`
- Modify: `frontend/src/widgets/shell/shell-topbar-widget.tsx`
- Test: `frontend/src/widgets/shell/shell-topbar-widget.test.tsx`

- [ ] **Step 1: Write the failing test for the selected workspace tab contract**

```tsx
it('marks only the active workspace tab as selected', () => {
  render(
    <ShellTopbarWidget
      workspaces={[
        { id: 1, title: 'Workspace-1' },
        { id: 2, title: 'Workspace-2' },
      ]}
      activeWorkspaceId={2}
      onSelectWorkspace={() => {}}
      onCreateWorkspace={() => {}}
      onOpenWorkspaceMenu={() => {}}
      onCloseWindow={() => {}}
      onMinimizeWindow={() => {}}
      onToggleFullscreenWindow={() => {}}
    />,
  )

  expect(screen.getByRole('tab', { name: 'Workspace-2' })).toHaveAttribute('data-selected', 'true')
  expect(screen.getByRole('tab', { name: 'Workspace-1' })).toHaveAttribute('data-selected', 'false')
})
```

- [ ] **Step 2: Run the focused test to verify the baseline**

Run:

```bash
npm exec vitest run src/widgets/shell/shell-topbar-widget.test.tsx
```

Expected:

- the suite passes or exposes any assertion gap before style work

- [ ] **Step 3: Lower topbar visual weight and make the active tab read as navigation, not a button**

Update `frontend/src/widgets/shell/shell-topbar-widget.styles.ts` and keep the tab API stable:

```ts
export const shellTopbarRootStyle: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(12, 29, 25, 0.82), rgba(10, 24, 22, 0.68))',
  borderBottom: '1px solid rgba(120, 150, 136, 0.12)',
  boxShadow: 'none',
}

export const shellWorkspaceTabsRowStyle: CSSProperties = {
  gap: '6px',
  alignItems: 'center',
}

export const shellWorkspaceTabStyle: CSSProperties = {
  minHeight: '30px',
  borderColor: 'rgba(122, 148, 136, 0.14)',
  background: 'rgba(17, 34, 30, 0.44)',
}

export const shellWorkspaceTabActiveStyle: CSSProperties = {
  background: 'rgba(33, 55, 49, 0.88)',
  borderColor: 'rgba(154, 186, 169, 0.22)',
  boxShadow: 'inset 0 0 0 1px rgba(211, 231, 219, 0.04)',
}
```

- [ ] **Step 4: Keep the selected-state hook explicit in the widget markup**

Make sure `frontend/src/widgets/shell/shell-topbar-widget.tsx` keeps:

```tsx
<ClearBox
  as="button"
  role="tab"
  aria-selected={activeWorkspaceId === workspace.id}
  data-selected={activeWorkspaceId === workspace.id}
  className="runa-ui-tab"
  style={activeWorkspaceId === workspace.id ? shellWorkspaceTabActiveStyle : shellWorkspaceTabStyle}
>
```

- [ ] **Step 5: Run the focused shell tests**

Run:

```bash
npm exec vitest run src/widgets/shell/shell-topbar-widget.test.tsx src/shared/ui/components/accessibility-contracts.test.tsx
```

Expected:

- both suites pass

- [ ] **Step 6: Commit the shell chrome step**

```bash
git add frontend/src/widgets/shell/shell-topbar-widget.tsx frontend/src/widgets/shell/shell-topbar-widget.styles.ts frontend/src/widgets/shell/shell-topbar-widget.test.tsx frontend/src/shared/ui/components/accessibility-contracts.test.tsx
git commit -m "ui: quiet shell chrome and clarify active workspace tab"
```

### Task 2: Strengthen active-widget hierarchy in terminal surfaces

**Files:**
- Modify: `frontend/src/widgets/terminal/terminal-widget.styles.ts`
- Modify: `frontend/src/shared/ui/components/terminal-status-header.styles.ts`
- Modify: `frontend/src/shared/ui/components/terminal-toolbar.styles.ts`
- Test: `frontend/src/widgets/terminal/terminal-widget.test.tsx`

- [ ] **Step 1: Write a style-contract test for non-button status presentation if one is missing**

Add a focused assertion in `frontend/src/widgets/terminal/terminal-widget.test.tsx`:

```tsx
it('renders status badges separately from action buttons', () => {
  renderTerminalWidget()

  expect(screen.getByText('Local')).toBeVisible()
  expect(screen.getByText('Running')).toBeVisible()
  expect(screen.getByRole('button', { name: /новая сессия|new session/i })).toBeVisible()
})
```

- [ ] **Step 2: Run the terminal suite**

Run:

```bash
npm exec vitest run src/widgets/terminal/terminal-widget.test.tsx
```

Expected:

- the suite passes before restyling or reveals missing markup guarantees

- [ ] **Step 3: Increase cohesion of terminal header, toolbar, and body**

Update styles in the three terminal style files:

```ts
export const terminalWidgetChromeStyle: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(18, 38, 34, 0.98), rgba(15, 31, 28, 0.96))',
  borderColor: 'rgba(130, 160, 145, 0.18)',
}

export const terminalWidgetHeaderRowStyle: CSSProperties = {
  background: 'rgba(19, 38, 33, 0.78)',
  borderBottom: '1px solid rgba(130, 160, 145, 0.12)',
}

export const terminalToolbarSectionStyle: CSSProperties = {
  background: 'rgba(16, 32, 28, 0.74)',
  borderColor: 'rgba(126, 155, 141, 0.14)',
}

export const terminalStatusHeaderMetaItemStyle: CSSProperties = {
  '--runa-ui-bg': 'rgba(20, 40, 35, 0.62)',
  '--runa-ui-border': 'rgba(128, 158, 143, 0.14)',
  '--runa-ui-color': 'rgba(228, 239, 232, 0.82)',
} as CSSProperties
```

- [ ] **Step 4: Re-run the terminal suite**

Run:

```bash
npm exec vitest run src/widgets/terminal/terminal-widget.test.tsx
```

Expected:

- PASS

- [ ] **Step 5: Commit the active-widget hierarchy step**

```bash
git add frontend/src/widgets/terminal/terminal-widget.styles.ts frontend/src/shared/ui/components/terminal-status-header.styles.ts frontend/src/shared/ui/components/terminal-toolbar.styles.ts frontend/src/widgets/terminal/terminal-widget.test.tsx
git commit -m "ui: strengthen active terminal hierarchy"
```

### Task 3: Add AI collapsed-work-panel behavior without changing AI runtime semantics

**Files:**
- Modify: `frontend/src/app/app-ai-sidebar.tsx`
- Modify: `frontend/src/app/App.tsx`
- Test: `frontend/src/app/app-ai-sidebar.test.tsx`

- [ ] **Step 1: Write the failing test for collapsed default AI chrome**

Add a focused render test:

```tsx
it('starts with the AI shell in collapsed work-panel mode', () => {
  renderAppAiSidebar()

  expect(screen.getByRole('button', { name: /expand ai panel/i })).toBeVisible()
  expect(screen.queryByText('Recent route activity')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the sidebar suite to capture the baseline**

Run:

```bash
npm exec vitest run src/app/app-ai-sidebar.test.tsx
```

Expected:

- FAIL because the current AI sidebar always renders in expanded mode

- [ ] **Step 3: Add view-only collapsed state in the sidebar controller**

Implement a local shell state only, keeping all data and handlers intact:

```tsx
const [isAiPanelExpanded, setIsAiPanelExpanded] = useState(false)

const handleToggleAiPanel = useCallback(() => {
  startTransition(() => {
    setIsAiPanelExpanded((current) => !current)
  })
}, [])
```

Use `startTransition` because the width/layout change is a non-urgent view update.

- [ ] **Step 4: Wire collapsed vs expanded rendering without altering request handlers**

In `frontend/src/app/app-ai-sidebar.tsx` keep the data flow the same and branch only the shell presentation:

```tsx
<AiPanelHeaderWidget
  isCollapsed={!isAiPanelExpanded}
  onToggleCollapsed={handleToggleAiPanel}
  {...existingHeaderProps}
/>

{isAiPanelExpanded ? (
  <AiPanelBodyWidget {...existingBodyProps} />
) : (
  <AiPanelCollapsedSummary
    activeConversationTitle={activeConversationTitle}
    routeState={routeState}
    onExpand={handleToggleAiPanel}
  />
)}
```

If `AiPanelCollapsedSummary` does not exist, keep it local to `app-ai-sidebar.tsx` first instead of creating a broad new abstraction.

- [ ] **Step 5: Keep shell width controlled from the app layer**

In `frontend/src/app/App.tsx`, vary only width/layout tokens:

```tsx
const aiSidebarWidth = isAiPanelExpanded ? 'minmax(320px, 30vw)' : '72px'
```

Do not change workspace data shape or Dockview runtime contracts.

- [ ] **Step 6: Re-run the sidebar suite**

Run:

```bash
npm exec vitest run src/app/app-ai-sidebar.test.tsx
```

Expected:

- PASS with the new collapsed default behavior covered

- [ ] **Step 7: Commit the AI collapse step**

```bash
git add frontend/src/app/App.tsx frontend/src/app/app-ai-sidebar.tsx frontend/src/app/app-ai-sidebar.test.tsx
git commit -m "ui: collapse ai panel into workbench side rail by default"
```

### Task 4: Recast the AI panel as an operator notebook in expanded mode

**Files:**
- Modify: `frontend/src/widgets/ai/ai-panel-header-widget.tsx`
- Modify: `frontend/src/widgets/ai/ai-composer-widget.tsx`
- Modify: `frontend/src/widgets/ai/ai-panel-widget.styles.ts`
- Test: `frontend/src/widgets/ai/ai-panel-header-widget.test.tsx`
- Test: `frontend/src/widgets/ai/ai-composer-widget.test.tsx`

- [ ] **Step 1: Add a failing header/composer contract test for collapsed-aware controls**

Examples:

```tsx
it('shows a compact operator header when collapsed', () => {
  render(
    <AiPanelHeaderWidget
      isCollapsed
      onToggleCollapsed={() => {}}
      {...defaultProps}
    />,
  )

  expect(screen.getByRole('button', { name: /expand ai panel/i })).toBeVisible()
  expect(screen.queryByPlaceholderText('Search conversations')).not.toBeInTheDocument()
})
```

```tsx
it('keeps compose controls in a two-column operator grid when expanded', () => {
  render(<AiComposerWidget {...defaultProps} />)

  expect(screen.getByRole('combobox', { name: /provider/i })).toBeVisible()
  expect(screen.getByRole('button', { name: /workspace shell/i })).toBeVisible()
})
```

- [ ] **Step 2: Run the focused AI suites**

Run:

```bash
npm exec vitest run src/widgets/ai/ai-panel-header-widget.test.tsx src/widgets/ai/ai-composer-widget.test.tsx
```

Expected:

- current tests pass or reveal missing collapsed props

- [ ] **Step 3: Introduce collapsed-aware header rendering without changing conversation behavior**

In `frontend/src/widgets/ai/ai-panel-header-widget.tsx`:

```tsx
type AiPanelHeaderWidgetProps = {
  isCollapsed?: boolean
  onToggleCollapsed?: () => void
  // existing props unchanged
}

if (isCollapsed) {
  return (
    <Box style={aiHeaderCollapsedStyle}>
      <IconButton
        aria-label="Expand AI panel"
        onClick={onToggleCollapsed}
        className="runa-ui-button-primary"
      >
        <PanelLeftOpen />
      </IconButton>
    </Box>
  )
}
```

- [ ] **Step 4: Shift expanded AI styling toward notebook/log semantics**

Use `frontend/src/widgets/ai/ai-panel-widget.styles.ts` to:

```ts
export const aiPanelSurfaceStyle: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(10, 23, 20, 0.97), rgba(8, 19, 17, 0.98))',
}

export const aiMessageBlockStyle: CSSProperties = {
  borderColor: 'rgba(114, 145, 131, 0.12)',
  background: 'rgba(10, 21, 19, 0.72)',
}

export const aiComposerSurfaceStyle: CSSProperties = {
  background: 'rgba(9, 22, 20, 0.88)',
  borderColor: 'rgba(118, 149, 136, 0.14)',
}
```

Keep the two-column control grid and avoid widening the sidebar again.

- [ ] **Step 5: Re-run the focused AI suites**

Run:

```bash
npm exec vitest run src/widgets/ai/ai-panel-header-widget.test.tsx src/widgets/ai/ai-composer-widget.test.tsx
```

Expected:

- PASS

- [ ] **Step 6: Commit the AI operator-notebook step**

```bash
git add frontend/src/widgets/ai/ai-panel-header-widget.tsx frontend/src/widgets/ai/ai-panel-header-widget.test.tsx frontend/src/widgets/ai/ai-composer-widget.tsx frontend/src/widgets/ai/ai-composer-widget.test.tsx frontend/src/widgets/ai/ai-panel-widget.styles.ts
git commit -m "ui: restyle ai panel as operator notebook"
```

### Task 5: Documentation, regression validation, and browser verification

**Files:**
- Modify: `frontend/docs/ui-architecture.md`
- Modify: `docs/validation/agent.md`
- Modify: `docs/validation/workspace.md`

- [ ] **Step 1: Document the AI panel and active-widget hierarchy rules**

Add concise rules to `frontend/docs/ui-architecture.md`:

```md
- The main shell follows a workbench hierarchy: quiet shell chrome, strongest active-widget surface, and AI presented as a collapsible side work panel rather than a permanent primary column.
- Terminal and commander are first-class center widgets; AI remains a secondary operator layer even when expanded.
```

- [ ] **Step 2: Record focused validation in the validation docs**

Append entries describing:

- shell chrome hierarchy verification
- collapsed-default AI panel behavior
- operator-style expanded AI panel presentation
- targeted tests and browser smoke commands

- [ ] **Step 3: Run repo-level frontend validation**

Run:

```bash
npm run lint:frontend
npm run build:frontend
npm exec vitest run src/widgets/shell/shell-topbar-widget.test.tsx src/app/app-ai-sidebar.test.tsx src/widgets/ai/ai-panel-header-widget.test.tsx src/widgets/ai/ai-composer-widget.test.tsx src/shared/ui/components/accessibility-contracts.test.tsx src/widgets/terminal/terminal-widget.test.tsx
git diff --check
```

Expected:

- all commands pass

- [ ] **Step 4: Run the split-runtime browser smoke**

Use the existing dev loop and verify:

```text
http://127.0.0.1:5173/
```

Manual checklist:

- AI starts in collapsed mode
- expand/collapse works without data loss
- terminal remains the main visual center
- workspace tab active state is obvious
- status badges remain calmer than actions
- no clipped composer controls when AI is expanded
- `Prepare route`, `Clear route state`, `Show details`, terminal header actions, and send button still trigger their existing handlers

- [ ] **Step 5: Commit docs + validation**

```bash
git add frontend/docs/ui-architecture.md docs/validation/agent.md docs/validation/workspace.md
git commit -m "docs: validate workbench main screen ui direction"
```

## Self-review

### Spec coverage

- quiet shell chrome: covered in Task 1
- stronger active-widget hierarchy: covered in Task 2
- collapsible AI work panel: covered in Task 3
- AI notebook/operator presentation: covered in Task 4
- docs + verification: covered in Task 5

### Placeholder scan

- no `TBD`, `TODO`, or “implement later” markers remain
- each task lists concrete files, commands, and expected outcomes

### Type consistency

- `isAiPanelExpanded`, `handleToggleAiPanel`, `isCollapsed`, and `onToggleCollapsed` are used consistently
- no backend/runtime prop or request-shape changes are introduced in the plan

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-30-main-screen-workbench-ui-implementation.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
