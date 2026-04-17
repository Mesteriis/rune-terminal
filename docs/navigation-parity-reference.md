# Navigation Parity Reference

Date: `2026-04-17`
Phase: `1.0.0-rc1` hardening

This document uses the repo-root Tide sources as the primary reference for navigation, launcher, and related shell-layer behavior in this batch.

## Exact Tide source files inspected

- `tideterm/frontend/app/tab/workspaceswitcher.tsx`
  - primary reference for workspace switcher button, list population, active/open indicators, switch action, save/create action, and inline edit behavior
- `tideterm/frontend/app/tab/workspaceswitcher.scss`
  - primary reference for switcher sizing, active-row emphasis, hover affordances, and compact popover styling
- `tideterm/frontend/app/view/launcher/launcher.tsx`
  - primary reference for launcher search, grid layout, keyboard navigation, selection, and replace-current-block behavior
- `tideterm/frontend/app/store/keymodel.ts`
  - primary reference for launcher entry/discoverability semantics from keyboard and default-new-block behavior
- `tideterm/frontend/app/workspace/widgets.tsx`
  - primary reference for right-utility-rail flyout anchoring and for the shell-level discoverability grammar around secondary actions
- `tideterm/frontend/app/workspace/workspace.tsx`
  - primary reference for shell composition, right-rail placement, and fill/stretch rules for the main workspace
- `tideterm/frontend/app/element/popover.tsx`
  - primary reference for popover portal/layer behavior and anchor placement semantics
- `tideterm/frontend/app/element/popover.scss`
  - primary reference for popover z-order and compact panel styling
- `tideterm/frontend/layout/lib/TileLayout.tsx`
  - primary reference for overlay container layering inside the shell layout
- `tideterm/frontend/layout/lib/tilelayout.scss`
  - primary reference for absolute overlay/display/placeholder stacking and full-size stretch behavior

## Feature mapping

### Workspace switcher

Primary files:
- `tideterm/frontend/app/tab/workspaceswitcher.tsx`
- `tideterm/frontend/app/tab/workspaceswitcher.scss`
- `tideterm/frontend/app/element/popover.tsx`
- `tideterm/frontend/app/element/popover.scss`

Extracted behavior:
- The switcher is a compact top-shell popover opened from a small button, not a full-width header surface.
- The button shows the active workspace icon when the workspace is saved; otherwise it shows the default workspace SVG.
- Opening the switcher refreshes the workspace list from backend workspace services.
- The switcher title is stateful:
  - `Open workspace` for an unsaved/current temporary workspace
  - `Switch workspace` for a saved workspace
- The list contains all known workspaces, not just the active workspace.
- Each row can show:
  - current workspace state
  - open-in-window state
  - inline edit affordance on hover
- Selecting a row switches workspace immediately and dismisses the popover.
- The bottom action is conditional:
  - `Save workspace` when the current workspace is unsaved
  - `Create new workspace` when the current workspace is already saved
- Inline editing expands inside the same popover entry rather than navigating to a separate screen.

### Launcher

Primary files:
- `tideterm/frontend/app/view/launcher/launcher.tsx`
- `tideterm/frontend/app/store/keymodel.ts`

Extracted behavior:
- The Tide launcher is a block view, not a right-rail flyout.
- It is a searchable, keyboard-driven grid of widgets/apps derived from widget config.
- Search is substring-based on widget label and excludes `display:hidden` entries.
- The launcher uses a hidden focused input to capture typing immediately.
- Grid layout is container-driven:
  - it recomputes column count to maximize tile size
  - labels are hidden when tiles are too short
  - the logo appears only when there is enough width
- Keyboard behavior:
  - arrow keys move the active selection
  - `Enter` launches the selected item
  - `Escape` clears search and resets selection
- Launching replaces the current block with the selected widget block definition.

### Discoverability / entry behavior

Primary files:
- `tideterm/frontend/app/store/keymodel.ts`
- `tideterm/frontend/app/workspace/widgets.tsx`

Extracted behavior:
- `Ctrl+Shift+K` replaces the current focused block with the launcher block.
- `Cmd+N` opens a new block using the `app:defaultnewblock` setting:
  - `launcher` opens a launcher block
  - otherwise a terminal block is created
- When the default new block is a terminal, Tide carries forward terminal context from the focused terminal block when available:
  - current working directory
  - connection
- The inspected Tide shell files do show right-rail discoverability for apps/settings/help through compact secondary flyouts.
- In the inspected Tide shell files, launcher discoverability is clearly present through keyboard entry and block replacement behavior.

### Relevant overlay / layer / position / stretch behavior

Primary files:
- `tideterm/frontend/app/element/popover.tsx`
- `tideterm/frontend/app/element/popover.scss`
- `tideterm/frontend/app/workspace/widgets.tsx`
- `tideterm/frontend/app/workspace/workspace.tsx`
- `tideterm/frontend/layout/lib/TileLayout.tsx`
- `tideterm/frontend/layout/lib/tilelayout.scss`

Extracted behavior:
- Popovers render through `FloatingPortal`, so they are not clipped by local overflow containers.
- The workspace switcher popover anchors `bottom-start` to its top-shell button.
- Right-rail flyouts anchor `left-start` to their rail buttons and use shift padding to stay inside the viewport.
- Popover/flyout surfaces are intentionally compact and top-most over the shell content.
- The main workspace is a flex column:
  - top tab bar
  - flex-growing center row
  - AI panel + main content split
  - right utility rail inside the main content row
- Main content wrappers use full-height flex sizing with `overflow: hidden` so the right rail and center content stretch together without leaking overflow.
- Layout display, placeholder, and overlay containers are absolutely positioned full-size siblings with explicit z-order.
- Tile layout overlay containers inherit full width/height from the layout root and are bounded by the same shell container.

## Ambiguities found in source

- The inspected Tide source clearly shows launcher keyboard entry and the launcher block itself, but it does not show a separate dedicated visible launcher button in the inspected shell files.
- The inspected Tide utility rail files show discoverability for apps/settings/help flyouts, but not a distinct launcher-specific flyout. For this batch, any visible compat-shell launcher entry must therefore be justified as an adaptation of Tide’s existing launcher plus utility-grammar behavior, not as an invented new navigation model.

## Reference note

The repo-root Tide source files listed above were inspected directly and used as the primary reference for this navigation / launcher / layer-system parity batch.
