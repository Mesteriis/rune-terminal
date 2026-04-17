# UI System Parity Gap Map

Date: `2026-04-18`
Phase: `1.0.0-rc1` hardening
Status: `baseline plus post-fix closure check`

This document records the release-blocking UI-system gaps using:

- repo-root Tide source files
- current RunaTerminal source files
- Tide screenshots in the repository
- current RunaTerminal screenshots captured from the live compat shell

This is not a redesign brief. It records the pre-fix parity baseline and the final post-fix closure check for the UI-system correction batch.

## Post-fix closure check

Resolved in this batch:

- overlay model corrected to a true floating, draggable, bounded utility overlay
- font/icon path unified to the reference-consistent Font Awesome + `Inter` / `Hack` stack
- terminal/files pane chrome compacted into one compat header grammar
- shell chrome density reduced in the right rail and content-stage spacing
- static/token drift reduced by moving affected surfaces onto shared chrome variables

Still visibly mismatched after final desktop + headed validation:

- terminal status badges remain heavier and more detached than Tide’s quieter inline header treatment
- the settings overlay remains darker and more form-heavy than the Tide screenshot family
- the whole-window composition still differs from the Tide screenshot family because the compat shell keeps the left AI panel and a different pane mix

Current truth:

- improved enough to remove the original release-blocking implementation gaps
- not visually identical enough to claim `FULL` UI-system closure against the screenshot reference
- use [docs/ui-system-parity-validation.md](./ui-system-parity-validation.md) as the current screenshot-backed validation source of truth

## Tide source files inspected

Shell chrome and rail:
- `tideterm/frontend/app/app.tsx`
- `tideterm/frontend/app/app.scss`
- `tideterm/frontend/app/theme.scss`
- `tideterm/frontend/app/tab/tabbar.tsx`
- `tideterm/frontend/app/tab/tabbar.scss`
- `tideterm/frontend/app/tab/tab.tsx`
- `tideterm/frontend/app/tab/tab.scss`
- `tideterm/frontend/app/tab/workspaceswitcher.tsx`
- `tideterm/frontend/app/workspace/workspace.tsx`
- `tideterm/frontend/app/workspace/widgets.tsx`

Pane chrome and terminal header:
- `tideterm/frontend/app/block/blockframe.tsx`
- `tideterm/frontend/app/block/block.scss`
- `tideterm/frontend/app/view/term/term-model.ts`
- `tideterm/frontend/app/view/term/term.tsx`
- `tideterm/frontend/app/view/term/term.scss`

Settings/help and overlay-adjacent surfaces:
- `tideterm/frontend/app/view/waveconfig/waveconfig.tsx`
- `tideterm/frontend/app/view/waveconfig/settingscontent.tsx`
- `tideterm/frontend/app/view/waveconfig/secretscontent.tsx`
- `tideterm/frontend/app/view/helpview/helpview.tsx`
- `tideterm/frontend/app/element/popover.tsx`
- `tideterm/frontend/app/element/popover.scss`
- `tideterm/frontend/app/element/iconbutton.scss`

Fonts, icons, and static assets:
- `tideterm/frontend/wave.ts`
- `tideterm/frontend/util/fontutil.ts`
- `tideterm/frontend/util/util.ts`
- `tideterm/public/fontawesome/css/fontawesome.min.css`
- `tideterm/public/fontawesome/css/brands.min.css`
- `tideterm/public/fontawesome/css/solid.min.css`
- `tideterm/public/fontawesome/css/sharp-solid.min.css`
- `tideterm/public/fontawesome/css/sharp-regular.min.css`
- `tideterm/public/fontawesome/css/custom-icons.min.css`

## Current RunaTerminal files inspected

Shell chrome and rail:
- `frontend/app/app.scss`
- `frontend/app/theme.scss`
- `frontend/app/tab/tabbar.tsx`
- `frontend/app/tab/tabbar.scss`
- `frontend/app/tab/tab.tsx`
- `frontend/app/tab/tab.scss`
- `frontend/app/tab/tabcontent.tsx`
- `frontend/app/tab/compat-split-layout.tsx`
- `frontend/app/workspace/workspace.tsx`
- `frontend/app/workspace/widgets.tsx`
- `frontend/app/workspace/widget-action-button.tsx`
- `frontend/app/workspace/widget-item.tsx`

Overlay and utility surfaces:
- `frontend/app/workspace/settings-floating-window.tsx`
- `frontend/app/workspace/settings-utility-surface.tsx`
- `frontend/app/workspace/utility-surface-frame.tsx`
- `frontend/app/workspace/files-floating-window.tsx`
- `frontend/app/workspace/tools-floating-window.tsx`
- `frontend/app/workspace/audit-floating-window.tsx`
- `frontend/app/workspace/quick-actions-floating-window.tsx`

Pane chrome and terminal/files headers:
- `frontend/app/view/term/compat-terminal.tsx`
- `frontend/app/view/term/term.scss`
- `frontend/app/view/files/compat-files-view.tsx`

Fonts, icons, and static assets:
- `frontend/index.html`
- `frontend/wave.ts`
- `frontend/util/fontutil.ts`
- `frontend/util/util.ts`
- `frontend/public/fontawesome/css/fontawesome.min.css`
- `frontend/public/fontawesome/css/brands.min.css`
- `frontend/public/fontawesome/css/solid.min.css`
- `frontend/public/fontawesome/css/sharp-solid.min.css`
- `frontend/public/fontawesome/css/sharp-regular.min.css`
- `frontend/public/fontawesome/css/custom-icons.min.css`

## Screenshots compared

Tide reference screenshots used:
- `tideterm/docs/docs/img/wave-screenshot.webp`

Current RunaTerminal screenshots captured for this gap map:
- `current-before.png`
- `current-before-settings.png`

## Screenshot-by-screenshot comparison

### Tide `wave-screenshot.webp` vs current `current-before.png`

Observed Tide traits:
- block headers are thinner and quieter than the compat pane header
- the right utility rail reads slimmer and the icon stack is less visually dominant
- chrome hierarchy is tab-first and block-header-first, with less emphasis on pill badges and labeled action buttons

Observed current RunaTerminal traits:
- the compat terminal header is structurally separate from Tide block chrome and still reads as a custom header bar
- the `LOCAL`, `RESTORED`, and `AI IDLE` badges are larger and more detached than Tide’s compact status/header treatment
- the `Split`, `Restart`, and `Explain` controls consume more visual weight than Tide end-icon chrome
- the right rail icons and labels are slightly oversized relative to the active content stage

Parity conclusion:
- visible shell hierarchy is close, but header density and rail density are still off

### Tide `wave-screenshot.webp` vs current `current-before-settings.png`

Observed Tide traits from source plus screenshot family:
- utility entry is secondary shell chrome
- real settings/help content is structured like a dedicated surface, not a dashboard card dropped in the center of the app
- popover and overlay rhythm stays light and compact

Observed current RunaTerminal traits:
- settings opens as a centered modal with a strong blurred backdrop
- the surface is not draggable
- the surface reads as a modal dialog, not a floating Tide-style utility overlay
- overview content is still card-heavy, accent-heavy, and more dashboard-like than Tide’s disciplined settings framing

Parity conclusion:
- overlay model and settings/help surface feel are still visibly incorrect

## Exact gap list

### 1. Overlay model

Current:
- `frontend/app/workspace/settings-floating-window.tsx` mounts a centered modal overlay with a full-window backdrop blur
- movement is not supported
- the surface does not open near the utility rail and does not behave like a floating tool window

Reference:
- Tide utility entry stays secondary to the shell and real settings/help surfaces feel structurally separate from layout content
- the user-provided parity requirement for this batch is stricter than the existing docs: settings/help/trusted-tools/secret-shield must behave as true floating overlays

Required correction:
- draggable overlay
- bounded movement within the window
- independent of split layout bounds
- lighter backdrop/layering
- no centered heavy-modal feel

### 2. Settings/help/trusted-tools/secret-shield surfaces

Current:
- `frontend/app/workspace/settings-utility-surface.tsx` renders dense card stacks and broad accent treatment
- overview/help/trusted/secret states still look like one compatibility dashboard

Reference:
- Tide `waveconfig` and `helpview` are structured surfaces with clearer navigation/content hierarchy

Required correction:
- keep the current release-scope content, but restyle/restructure it as a compact floating settings surface
- reduce dashboard-card feel
- make trusted/secret/help feel like real adjacent views inside one utility overlay

### 3. Fonts and icons

Current:
- runtime assets already load from `frontend/public/fontawesome/...`, which matches Tide
- active mismatch is in presentation: compat UI surfaces mix raw icon classes and ad hoc size classes, producing inconsistent scale across pane headers, settings nav, and rail buttons
- live font loading still includes an unused `JetBrains Mono` path alongside the active `Hack` terminal family, which increases ambiguity in the UI system audit

Reference:
- Tide uses the same Font Awesome asset family and `Inter`/`Hack` typography tokens, but the visible result is more consistent because icon sizing and chrome typography are more disciplined

Required correction:
- keep one reference-consistent icon pipeline for parity surfaces
- normalize icon sizing/weight in compat headers, settings chrome, and rail controls
- remove or stop using font loads that are not part of the visible parity path if they create conflicting runtime behavior

### 4. Terminal header / block chrome

Current:
- `frontend/app/view/term/compat-terminal.tsx` renders a custom two-row header/message stack
- header actions are text buttons rather than compact Tide-like end icons
- status pills are too large and visually detached

Reference:
- Tide block chrome comes from `blockframe.tsx` + `block.scss`
- terminal-specific state is compressed into the header text/icon zones from `term-model.ts`

Required correction:
- move compat terminal chrome closer to the Tide block-header grammar
- reduce padding and vertical weight
- tighten action sizing and badge integration
- make drag affordance feel like pane chrome, not like a separate instrumented layer

### 5. Shell chrome density

Current:
- top bar metrics largely match Tide source, but the visible compat shell still drifts because the right rail is too heavy and the content-stage headers are too pronounced

Reference:
- Tide reads as compact end-to-end, not only in the tab bar SCSS

Required correction:
- reduce right-rail icon/button scale
- keep the rail visually secondary to tabs and pane content
- tighten content-stage chrome so the top bar and pane chrome feel like one system

### 6. Static/style drift

Current:
- compat utility and pane surfaces use several ad hoc `bg-black/10`, `bg-black/20`, broad green accents, and rounded-card patterns that do not read like Tide block/popover surfaces
- existing parity docs claim the domain is already closed, which is not supported by the current screenshots

Reference:
- Tide uses a tighter token rhythm:
  - compact header height
  - compact popover padding/radius
  - quieter icon buttons
  - more disciplined accent usage

Required correction:
- replace ad hoc surface styling on the affected compat surfaces with shared tokens/variables
- reduce broad green fills
- align borders, shadows, and background weights with Tide’s lighter chrome

## Doc correction note

At slice 1, these documents over-claimed `FULL` or “none remaining” for UI-system parity despite the visible mismatches above:

- `docs/parity/parity-matrix.md`
- `docs/ui-parity-gap-map.md`
- `docs/ui-parity-validation.md`
- `docs/ui-system-validation.md`

Slice 7.2 corrects those documents. For current UI-system truth, use:

- `docs/ui-system-parity-gap-map.md`
- `docs/ui-system-parity-validation.md`
