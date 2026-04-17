# Full UI Parity Reference

Date: `2026-04-17`
Phase: `1.0.0-rc1` hardening

This document uses the repo-root Tide sources as the primary reference for the remaining UI parity work in this batch.

The goal here is not a redesign. The goal is to capture the exact Tide shell/UI structure that still materially affects release feel in the active compat shell.

## Exact Tide source files inspected

Shell chrome and shell framing:
- `tideterm/frontend/app/tab/tabbar.tsx`
- `tideterm/frontend/app/tab/tabbar.scss`
- `tideterm/frontend/app/tab/tab.tsx`
- `tideterm/frontend/app/tab/tab.scss`
- `tideterm/frontend/app/tab/workspaceswitcher.tsx`
- `tideterm/frontend/app/tab/workspaceswitcher.scss`
- `tideterm/frontend/app/workspace/workspace.tsx`
- `tideterm/frontend/app/workspace/widgets.tsx`
- `tideterm/frontend/layout/lib/TileLayout.tsx`
- `tideterm/frontend/layout/lib/tilelayout.scss`

Generic block chrome and header behavior:
- `tideterm/frontend/app/block/block.tsx`
- `tideterm/frontend/app/block/blockframe.tsx`
- `tideterm/frontend/app/block/block.scss`

Terminal header, status, and drag-related behavior:
- `tideterm/frontend/app/view/term/term-model.ts`
- `tideterm/frontend/app/view/term/term.tsx`
- `tideterm/frontend/app/view/term/term.scss`
- `tideterm/frontend/app/view/term/termwrap.ts`

Popovers and compact icon controls:
- `tideterm/frontend/app/element/popover.tsx`
- `tideterm/frontend/app/element/popover.scss`
- `tideterm/frontend/app/element/iconbutton.tsx`
- `tideterm/frontend/app/element/iconbutton.scss`

Settings, secrets, help, and utility surfaces:
- `tideterm/frontend/app/view/waveconfig/waveconfig-model.ts`
- `tideterm/frontend/app/view/waveconfig/waveconfig.tsx`
- `tideterm/frontend/app/view/waveconfig/settingscontent.tsx`
- `tideterm/frontend/app/view/waveconfig/secretscontent.tsx`
- `tideterm/frontend/app/view/helpview/helpview.tsx`
- `tideterm/frontend/app/view/launcher/launcher.tsx`

## Which files inform which UI behavior

### Terminal header composition

- `blockframe.tsx`
  - Tide block header structure
  - icon/title zone
  - connection button placement
  - header text element rendering
  - end-icon zone
  - drag handle placement on the header itself
- `block.scss`
  - header height (`var(--header-height)` => `30px`)
  - compact header padding and gap
  - border rhythm between header and body
  - compact end-icon sizing
- `term-model.ts`
  - terminal-specific header text and status elements
  - shell integration icon states
  - restart icon semantics
  - command success/error icon semantics
  - multi-session add/list icons
- `term.tsx`
  - terminal body stays focused on terminal content
  - terminal view itself does not render a big custom top overlay for routine controls
- `term.scss`
  - terminal body fill/stretch and internal content structure

### Drag affordances

- `blockframe.tsx`
  - drag affordance is the compact block header zone via `dragHandleRef`
- `block.scss`
  - header is a clear top strip distinct from body content
- `tabbar.tsx` / `tabbar.scss`
  - shell drag space is deliberate and separated from interactive controls

### Header and status icons

- `term-model.ts`
  - sparkles icon shows shell integration state
  - restart control is a compact header icon
  - command completion state is icon-based, not a large prose banner
- `iconbutton.tsx` / `iconbutton.scss`
  - header actions are low-chrome icon buttons, borderless by default
- `blockframe.tsx`
  - end icons sit in a compact right-edge cluster

### Popover anchoring and bounds

- `popover.tsx`
  - default offset is `3`
  - popovers attach to existing shell controls, not free-floating arbitrary positions
- `popover.scss`
  - compact padding, radius, border, and shadow
- `workspaceswitcher.tsx` / `workspaceswitcher.scss`
  - concrete example of Tide-sized bounded popover content (`256px` wide)

### Settings and utility surfaces

- `widgets.tsx`
  - settings/help entry remains a slim right-utility action, secondary to the main shell
- `waveconfig-model.ts`
  - settings and secrets are dedicated surfaces with real backing state
- `waveconfig.tsx`
  - settings surfaces are structured with a dedicated navigation/sidebar and content pane
- `settingscontent.tsx`
  - settings content is explicit form UI, not placeholder prose
- `secretscontent.tsx`
  - secrets surface has real list/detail/add states
- `helpview.tsx`
  - help is a dedicated view, not a stub panel

### Spacing, density, hierarchy, and shell framing

- `tabbar.scss`
  - compact shell top-bar metrics (`33px`, `26px`, `27px`)
- `block.scss`
  - compact block header metrics (`30px`, `4px 5px 4px 10px`, `8px` gap)
  - content padding defaults to `5px` unless a view opts out
  - inner block frame uses `var(--block-border-radius)` and a single border rhythm
- `workspace.tsx`
  - shell order is top chrome first, working surfaces second
- `widgets.tsx`
  - right utility rail is slim and visually secondary
- `TileLayout.tsx` / `tilelayout.scss`
  - working surfaces stretch to bounds without decorative outer framing

## Extracted Tide reference behavior

### Terminal header composition

- Tide terminals inherit the generic block header instead of drawing their own large custom in-content controls.
- The header is compact and fixed-height:
  - `30px` tall
  - light border under the header
  - icon/title on the left
  - connection pill next
  - header text/status in the middle
  - compact end icons on the right
- Term-specific content inside that header comes from `term-model.ts`:
  - app switch icon when a terminal can switch into a vdom app
  - command text for `cmd` controllers
  - success / failure / restarting status icons for command controllers
  - multi-input badge when relevant
  - add-session, session-list, remote tmux, shell-integration, and restart icons in the end-icon zone when relevant

### Drag affordances

- Tide uses the block header itself as the pane drag handle.
- The drag affordance is structural, not a large floating button inside the body.
- Body content remains reserved for the working surface itself.

### Header and status icons

- Tide favors compact icon indicators over persistent prose banners:
  - shell integration states use muted / accent / warning sparkles
  - command completion uses check or error icons
  - restart is a compact refresh-style action
- Icon controls stay borderless and quiet until hover.

### Popover anchoring and bounds

- Tide popovers are tightly anchored to shell controls.
- Popover rhythm is compact:
  - `offset: 3`
  - `padding: 2px`
  - `gap: 1px`
  - `border-radius: 4px`
- Workspace-switcher content proves the expected boundedness:
  - `256px` width
  - compact title, menu rows, and action row

### Settings and utility surfaces

- Tide keeps the right-side utility entry point slim.
- The utility surface is an entry layer, not a giant dashboard.
- Full settings and secrets live in dedicated settings surfaces with real structure:
  - sidebar/navigation
  - explicit selected view
  - real content
- Help is also a dedicated surface.

### Spacing, density, hierarchy, and shell framing

- Tide shell rhythm is consistently compact across shell chrome and block chrome.
- The shell remains tab-first and content-first:
  - top shell stays compact
  - utility rail stays secondary
  - block headers provide local chrome for individual surfaces
- Block chrome provides the key visual hierarchy inside the content area:
  - rounded block frame
  - compact 30px header
  - padded content area beneath
  - connection or error overlays appear below the header, not instead of it

## Ambiguities found in source

- The inspected Tide terminal header behavior is defined by the generic block frame plus terminal model atoms, not by a standalone `TerminalHeader` component. The compat shell therefore needs a structural adaptation rather than a direct component import.
- Tide includes multi-session terminal controls and remote tmux affordances in terminal header icons. Those are not all part of the active compat release path, so only the user-visible header grammar and currently supported icon semantics are in scope here.
- Tide settings breadth is larger than the active compat shell utility adaptation. For this batch, the required parity target is the structure, density, boundedness, and operator-visible reality of settings/help/trust/secret surfaces, not wholesale import of the full Tide settings universe.

## Reference note

The repo-root Tide source files listed above were inspected directly and used as the primary reference for this batch.
