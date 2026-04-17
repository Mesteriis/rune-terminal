# Frontend Parity Baseline

## Purpose

This document defines the canonical frontend baseline for the `1.0.0-rc1`
frontend parity correction pass.

This pass is **not** a feature expansion pass.
It is a release-candidate blocker focused on bringing the RunaTerminal shell
back toward TideTerm's actual user-visible layout, panel balance, and
interaction grammar.

The source of truth for parity is the live TideTerm frontend in:

- `/Users/avm/projects/Personal/tideterm/frontend/*`

The imported renderer snapshot in `frontend/tideterm-src/` remains useful as a
local reference, but the sibling TideTerm repository is the canonical visual and
interaction baseline for this pass.

## Canonical baseline by zone

### Shell and layout frame

Primary files:

- `frontend/app/workspace/workspace.tsx`
- `frontend/app/workspace/workspace-layout-model.ts`
- `frontend/app/tab/tabbar.tsx`
- `frontend/app/tab/tabbar.scss`
- `frontend/app/tab/workspaceswitcher.tsx`
- `frontend/layout/index.ts`
- `frontend/layout/lib/TileLayout.tsx`
- `frontend/layout/lib/tilelayout.scss`
- `frontend/wave.ts`

Baseline requirements:

- top shell is compact and tab-driven, not a large editorial header
- workspace is the primary product container
- left AI panel is a real first-class shell column
- center content is the main visual focus
- right utility/widgets rail stays slim and secondary
- AI open/close uses familiar shell placement and not a novel control grammar

### Terminal surface and terminal chrome

Primary files:

- `frontend/app/view/term/term.tsx`
- `frontend/app/view/term/term.scss`
- `frontend/app/view/term/xterm.css`

Baseline requirements:

- terminal is visually dominant inside the center stage
- terminal header and toolbars are compact and dense
- terminal chrome sits directly around the viewport without extra invented
  framing
- terminal input happens in the terminal surface, not in a newly invented shell
  footer UX
- scrollback, follow state, and focus state remain visible but secondary to the
  viewport itself

### AI panel and AI interaction grammar

Primary files:

- `frontend/app/aipanel/aipanel.tsx`
- `frontend/app/aipanel/aipanelheader.tsx`
- `frontend/app/aipanel/aipanelmessages.tsx`
- `frontend/app/aipanel/aipanelinput.tsx`
- `frontend/app/view/waveai/waveai.tsx`
- `frontend/app/view/waveai/waveai.scss`

Baseline requirements:

- AI panel is left-aligned and persistent in the shell grammar
- AI header, transcript, and composer read as one coherent vertical column
- AI controls are compact and embedded in the panel header/footer, not spread
  into unrelated shell zones
- terminal remains center-primary even when AI is open

### Right-side widgets and utility rail

Primary files:

- `frontend/app/workspace/widgets.tsx`

Baseline requirements:

- right rail is narrow and visually quiet
- widgets/apps/settings/help live in the right utility rail, not as a large
  narrative sidebar
- bottom utility actions stay icon-first and secondary
- right rail should not out-weigh the terminal or AI panel

## Required parity behaviors for `1.0.0-rc1`

### Top shell and tab strip

Must match TideTerm in spirit and placement:

- compact tab bar height and density
- workspace switcher as a shell affordance, not a dominant title block
- scrollable tab strip as the primary top-bar content
- AI toggle in the right-side control zone
- add-tab control in the same compact action area
- no heavy top-row repo/status storytelling that steals attention from tabs

### Main shell balance

Must match TideTerm in feel:

- left AI panel is a real shell column
- center terminal stage is the dominant surface
- right rail is slim and secondary
- panel resize grammar follows TideTerm's left-AI / center-content split

### Terminal stage

Must match TideTerm in hierarchy:

- minimal outer padding around the terminal stage
- no large card framing around the viewport
- compact header / toolbar / status strip
- no invented bottom command composer row

### Utility and settings placement

Must match TideTerm-like placement:

- launcher/settings/help access belongs in the right utility rail or compact
  shell controls
- settings/help surfaces remain secondary to terminal and AI
- shell should not read as "operator console first"

## Current RunaTerminal divergences found in this pass

### Top shell drift

Current files:

- `frontend/src/components/WorkspaceRail.tsx`
- `frontend/src/components/WorkspaceSwitcher.tsx`
- `frontend/src/components/WorkspaceTab.tsx`
- `frontend/src/App.css`

Found divergences:

- top shell is taller and heavier than TideTerm's compact tab bar
- workspace switcher is a labeled pill and visually over-weighted
- repo root and active tab metadata occupy prime top-shell attention
- add-tab control lives inside the strip instead of the compact right action
  zone
- tab surfaces are taller and more card-like than TideTerm's tighter chrome

### Right rail drift

Current files:

- `frontend/src/components/WidgetDock.tsx`
- `frontend/src/App.css`

Found divergences:

- right rail is materially wider than TideTerm's utility rail
- dock starts with an invented `RT` brand block
- dock footer includes narrative copy and active-surface text
- dock buttons visually compete with the main terminal stage

### Terminal-stage drift

Current files:

- `frontend/src/App.tsx`
- `frontend/src/components/TerminalSurface.tsx`
- `frontend/src/App.css`

Found divergences:

- stage padding creates an invented outer frame around the terminal
- terminal includes a bottom `Paste command` / `Send` row that is not part of
  TideTerm shell grammar
- terminal chrome is broadly correct but still too separated from the viewport
  by extra framing

### Panel-balance drift

Current files:

- `frontend/src/App.tsx`
- `frontend/src/hooks/useWorkspaceLayout.ts`
- `frontend/src/components/AgentSidebar.tsx`

Found divergences:

- shell attention is split too strongly across top rail, center stage, and right
  dock
- AI panel is structurally present, but its visual role is undercut by the
  over-weighted top shell and utility dock
- panel balance feels "re-laid-out" rather than recognizably TideTerm-derived

## Acceptable divergences

These differences are acceptable in `1.0.0-rc1` for architectural reasons, as
long as the visible UX stays close to TideTerm:

- Go core remains runtime truth
- transport remains adapter-owned, not UI-owned
- old TideTerm frontend store graph is not reintroduced
- widget/app catalog breadth remains intentionally reduced
- multi-workspace backend parity remains out of scope
- settings breadth remains reduced so long as shell placement stays familiar
- AI/runtime/policy backend semantics stay new-architecture native

## Release-blocking divergences

The following are release-candidate blockers for this pass:

1. top shell still reads as custom Runa chrome instead of TideTerm-derived tab
   chrome
2. right utility rail is too wide and too visually loud
3. terminal stage keeps invented framing and bottom command UX
4. panel balance still gives secondary surfaces too much visual weight
5. launcher/settings/help placement is not yet close enough to TideTerm's
   utility grammar

## Non-goals for this pass

This pass does **not** include:

- builder parity
- proxy parity
- code editor parity
- preview zoo parity
- plugin ecosystem work
- remote workspace breadth
- broad settings universe expansion
- new AI product ideas
- backend architecture experimentation

## Correction strategy for this pass

The correction order for this pass is:

1. baseline docs and parity findings
2. top shell and tab chrome correction
3. AI / terminal / center-stage balance correction
4. right utility rail correction
5. terminal chrome cleanup
6. validation and honest documentation of residual gaps
