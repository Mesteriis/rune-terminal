# Shell Chrome Parity Reference

Date: `2026-04-17`
Phase: `1.0.0-rc1` hardening

This document uses the repo-root Tide sources as the primary reference for shell chrome parity in this batch.

## Exact Tide source files inspected

- `tideterm/frontend/app/tab/tabbar.tsx`
  - primary reference for the top-shell control order, tab-strip composition, add-tab placement, drag spacers, AI toggle placement, and right-edge status/control zone
- `tideterm/frontend/app/tab/tabbar.scss`
  - primary reference for top-bar height, compact density, control gap, top padding, and tab-strip sizing
- `tideterm/frontend/app/tab/tab.tsx`
  - primary reference for per-tab hierarchy, active/inactive actions, rename affordance, and pin/close interaction placement
- `tideterm/frontend/app/tab/tab.scss`
  - primary reference for tab width, height, internal padding, separator treatment, active background weight, and compact label density
- `tideterm/frontend/app/tab/workspaceswitcher.tsx`
  - primary reference for the workspace-switcher button as a compact shell affordance and for its placement in the top chrome
- `tideterm/frontend/app/tab/workspaceswitcher.scss`
  - primary reference for workspace-switcher button size, popover compactness, padding, and hover weight
- `tideterm/frontend/app/workspace/workspace.tsx`
  - primary reference for overall shell composition: top bar first, center row second, AI panel as a true shell column, and utility rail inside the main content row
- `tideterm/frontend/app/workspace/widgets.tsx`
  - primary reference for the right utility rail being slim, secondary, and icon-first relative to the tab bar and main content
- `tideterm/frontend/app/app.tsx`
  - primary reference for app-shell composition and the lack of any extra editorial top-shell layer above the tab bar
- `tideterm/frontend/app/app.scss`
  - primary reference for full-window framing, root flex sizing, and the absence of invented outer shell padding
- `tideterm/frontend/app/element/iconbutton.tsx`
  - primary reference for compact icon-only top-bar actions
- `tideterm/frontend/app/element/iconbutton.scss`
  - primary reference for icon-action visual weight, hover behavior, and the absence of extra chrome around icon controls
- `tideterm/frontend/app/element/popover.tsx`
  - primary reference for compact shell popovers anchored off existing chrome controls
- `tideterm/frontend/app/element/popover.scss`
  - primary reference for popover padding, radius, border weight, and drop-shadow behavior
- `tideterm/frontend/app/window/windowtitle.tsx`
  - reference for the shell staying tab-and-content driven rather than introducing a large visible title/header strip
- `tideterm/frontend/layout/lib/TileLayout.tsx`
  - reference for content filling the shell body without extra wrapper framing
- `tideterm/frontend/layout/lib/tilelayout.scss`
  - reference for full-size layout containers and content-aligned shell framing

## Shell-chrome behavior extracted from Tide source

### Shell top bar density

- The top shell is compact, not hero-like:
  - `.tab-bar-wrapper` uses `padding-top: 6px`
  - wrapper height is `max(33px, calc(33px * var(--zoomfactor-inv)))`
  - `.tabs-wrapper` height is `26px`
  - `.tab-bar` height is `27px`
- Primary controls are small and icon-first:
  - AI toggle uses `h-[26px]` with `px-1.5`
  - workspace switcher button uses `height: 26px` and `padding: 0 12px`
  - add-tab button uses `height: 27px` with `padding: 0 10px`
- There is no extra title band, repo banner, or descriptive shell row above the tab strip.

### Header / tab hierarchy

- Tide’s top bar hierarchy is:
  1. window-drag space / platform affordances
  2. optional app-menu button
  3. AI toggle
  4. workspace switcher
  5. scrollable tab strip as the dominant top-bar content
  6. add-tab button
  7. right-edge status / config / drag space
- The tab strip is the primary visual object in the header, not the workspace switcher and not the right-side controls.
- Tabs themselves are compact chips inside the strip:
  - fixed baseline width `130px`
  - internal width `calc(100% - 6px)`
  - active state is a light background fill, not a heavy card
  - separators are 14px vertical rules that disappear around active/hovered tabs

### Spacing / padding rhythm

- The top bar rhythm is consistently tight:
  - 6px wrapper top padding
  - 6px gap in `.tab-bar-right`
  - 6px radii on active tabs and switcher button
  - 10px horizontal padding on add-tab
  - 12px horizontal padding on workspace switcher
- Tab labels use `font-size: 11px` and stay centered with minimal internal padding.
- Popover surfaces stay compact:
  - default popover offset is `3`
  - popover content uses `padding: 2px`, `gap: 1px`, `border-radius: 4px`
  - workspace switcher content width is `256px`, with small title/action spacing

### Alignment and framing

- The workspace shell is a simple flex column:
  - tab bar at the top
  - flex-growing center row below
  - AI panel and main content share the center row
  - right utility rail lives inside the main content row, not as a second top-shell cluster
- Root app framing is flush to the window:
  - `#main` fills width and height
  - no extra shell-level outer padding is introduced in `app.scss`
- Content containers are full-height and overflow-bounded; Tide does not add large decorative frame margins around the active shell body.

### Shell visual compactness

- Tide keeps shell controls visually quiet:
  - icon buttons are borderless, low-opacity by default, and only brighten on hover
  - workspace switcher is a compact icon affordance, not a labeled title pill
  - utility rail buttons are secondary to the tab strip and content stage
- The shell reads as tab-first and content-first:
  - tabs are the obvious navigation layer
  - the AI toggle and workspace switcher are secondary entry affordances
  - right-rail utilities do not outweigh the top bar or center content

## Ambiguities found in source

- The inspected Tide shell files do not show a separate visible launcher button in the top chrome. Launcher entry exists in Tide through launcher block behavior and keyboard paths, but not as a dedicated extra top-bar control in the inspected source.
- The inspected Tide shell files do not include direct remote-shell controls in the top tab bar. Any current compat-shell remote affordance kept in that zone must therefore be treated as an adaptation, not baseline Tide chrome.
- Tide’s shell composition is multi-window aware in surrounding architecture, but the visible shell-chrome reference here is judged by the inspected top-shell and workspace files, not by cross-window behavior.

## Reference note

The repo-root Tide source files listed above were inspected directly and used as the primary reference for this shell chrome parity batch.
