# UI Architecture

## Layer Rules

### Tokens

- CSS variables only
- No React code
- Shared visual values live in `src/shared/ui/tokens/index.css`

Current token families:

- dark canvas and glass surface colors
- accent colors for dark emerald and cold-tea tones
- text and border tiers
- spacing, gap, padding, and margin scales
- radii, control sizes, and shell sizes
- glass blur and shadow values

### Styles

- Style modules keep presentational constants separate from rendering logic
- Style modules use CSS variables and plain style objects only
- Style modules must not import app state, backend contracts, or widget runtime logic

Current isolated style modules:

- `CommanderWidget` local dense-surface styles in `src/widgets/commander-widget.styles.ts`

### Primitives

- Wrap native HTML elements
- Use tokens only
- Must be typed with native HTML props
- No business logic

Current primitives:

- `Box`
- `Badge`
- `Button`
- `Checkbox`
- `Input`
- `Label`
- `Radio`
- `ScrollArea`
- `Select`
- `Separator`
- `Surface`
- `TerminalViewport`
- `Text`
- `TextArea`

### Components

- Compose primitives only
- Must not use raw HTML elements
- Provide reusable UI combinations

Current reusable controls:

- `InputField`
- `IconButton`
- `SearchableMultiSelect`
- `Tabs` with `horizontal` and `vertical` orientations
- `RadioControl`
- `RadioGroup`
- `SwitcherControl`
- `SwitcherGroup`
- `ExpandableTextArea` with expansion to the parent bounds or to a selected DOM target
- `DialogPopup`
- `Notify`
- `TerminalStatusHeader`
- `TerminalSurface`
- `TerminalToolbar`

### Widgets

- Compose primitives and components
- Represent UI blocks
- Stay above shared UI layers

### Layouts

- Compose widgets into isolated demo or shell surfaces
- Must not own backend semantics
- Must stay thinner than widgets and app orchestration

Current layouts:

- `CommanderDemoLayout`

## Dependency Direction

The dependency direction is one-way:

`tokens -> styles -> primitives -> components -> widgets -> layouts -> app`

Higher layers can depend on lower layers.
Lower layers must not depend on higher layers.

## Allowed Imports

- `styles -> tokens`
- `primitives -> tokens`
- `components -> primitives`
- `widgets -> styles + components + primitives`
- `layouts -> widgets`

## Public API

- `src/shared/ui/primitives/index.ts`
- `src/shared/ui/components/index.ts`
- `src/widgets/index.ts`
- `src/layouts/index.ts`

## Current Shell Mapping

The active frontend shell example now consumes the UI layers instead of rendering
its visible shell blocks as raw HTML inside `App.tsx`.

- `App.tsx` owns Dockview wiring and UI state only.
- `ShellTopbarWidget` renders the top header block.
- `RightActionRailWidget` renders the full-height right rail.
- `WidgetBusyOverlayWidget` renders a widget-body busy state overlay with a centered AI marker and a `tsParticles` node-edge field.
- `CommanderWidget` renders the frontend-only Total Commander-style dual-pane surface from a per-widget commander model backed by a local fake filesystem client.
- The fake commander client now supports widget-local `copy/move/delete/mkdir` mutations between the left and right panes of the same widget instance, without backend calls or cross-widget filesystem sharing.
- Commander operations now pass through a widget-local pending confirm/cancel layer before mutating the fake filesystem, so the UI can expose classic operator review flows without backend approvals yet.
- Commander pane navigation now also keeps independent per-pane history stacks, exposed through active-pane back/forward header controls and `Alt+Left` / `Alt+Right`.
- Commander pending operations now also cover `rename` with an inline input prompt plus overwrite warnings for `copy/move/rename`, but they still stay entirely inside the local fake client and a single widget instance.
- Commander runtime state and fake filesystem state now persist per `widgetId` in `localStorage`, so reload restores pane paths, history stacks, cursor/selection, view toggles, and fake-client mutations for each commander widget without introducing backend state.
- Commander selection semantics now also follow the frontend-only Total Commander contract more closely: `Shift+Arrow`, `Shift+PageUp/PageDown`, `Shift+Home/End`, and `Shift+click` extend selection ranges from a stable pane-local anchor, while `Space` and `Insert` still toggle the focused row with the existing fake-client cursor flow.
- Commander keyboard handling now also includes type-to-jump within the active pane: printable key presses search the current pane by filename prefix and move the commander cursor without introducing backend search state.
- Commander rename flows now also support frontend-only batch templates on the fake client: `Shift+F6` opens a mass-rename prompt, `Ctrl+PgDn` opens the focused entry from the keyboard, template tokens (`[N]`, `[E]`, `[F]`, `[C]`, `[C:n]`) drive rename previews, and duplicate target names are blocked before mutation.
- Commander transfer conflicts now also stay frontend-only but explicit: when `copy` or `move` finds target-name collisions inside the same widget, the pending bar switches into `Overwrite`, `Skip`, `Overwrite all`, and `Skip all` actions instead of silently applying overwrite semantics.
- `TerminalWidget` renders the terminal-specific body composition for terminal panels.
- `TerminalDockviewTabWidget` renders terminal-specific Dockview tab chrome for terminal panels.
- `CommanderDemoLayout` mounts `CommanderWidget` into the isolated `tool` panel demo surface.
- `DialogPopup` provides the stateless shared dialog surface, including the wide settings-dialog variant.
- `Notify` provides the stateless shared notification surface.
- `ModalHostWidget` renders body-scoped and widget-scoped modal layers.
- `PanelModalActionsWidget` exposes a widget-level demo path for modal opening.
- `DockviewPanelWidget` renders Dockview panel bodies.
- `AiPanelWidget` renders the shell-managed AI panel body inside the left shell pane.
- `AiPanelHeaderWidget` renders the AI shell header strip.
- `AiPromptCardWidget` renders the prompt tiles inside the AI panel.
- `AiComposerWidget` renders the AI toolbar plus textarea composer block.
- `App.tsx` now uses `motion` only at the app shell boundary to animate the shell-managed AI panel width; the AI body itself remains a normal widget.

## DOM Identity

The frontend now uses a shared DOM identity contract from
`src/shared/ui/dom-id.tsx`.

- Every repo-owned frontend element should resolve to a readable DOM `id`.
- The canonical semantic locator is `data-runa-node`.
- The identity format is:
  - `<layout>-<widget>-<component>-<short-uid>` for `id`
  - `<layout>-<widget>-<component>` for `data-runa-node`
- Scope is inherited through `RunaDomScopeProvider`.
- Native primitives generate ids and semantic attrs automatically.
- Widget/layout roots may also opt into subtree auto-tagging so raw DOM and
  third-party descendants inside that subtree also receive ids and
  `data-runa-*` attrs.

Lookup helpers exported from `src/shared/ui/dom-id.tsx`:

- `buildRunaNodeKey`
- `buildRunaNodeSelector`
- `findRunaNode`
- `findRunaNodes`

## Validation

### Commands

- `npm --prefix frontend run lint:active`
- `npm --prefix frontend run build`
- `curl -sf http://127.0.0.1:4193`
- `node --input-type=module -e "<headless Playwright localhost computed-style smoke for tokenized shell surfaces>"`
- `rg -n "React\.(HTMLAttributes|ButtonHTMLAttributes|InputHTMLAttributes|LabelHTMLAttributes|SelectHTMLAttributes|TextareaHTMLAttributes)" frontend/src/shared/ui/primitives`
- `rg -n "from '../primitives'|from '../shared/ui/primitives'|from '../shared/ui/components'" frontend/src/shared/ui/components frontend/src/widgets`
- `rg -n "export \* from './(expandable-textarea|radio-control|radio-group|searchable-multi-select|switcher-control|switcher-group|tabs)'" frontend/src/shared/ui/components/index.ts`
- `node --input-type=module -e "<headless Playwright DOM identity smoke against http://127.0.0.1:5173>"`

### Results

- Primitives are typed with native HTML prop types.
- Primitive coverage now includes `Label`, `Select`, `TextArea`, `Radio`, and `Checkbox` in addition to the original `Box`, `Button`, `Input`, and `Text`.
- Primitive coverage now also includes `Badge`, `ScrollArea`, `Separator`, and `Surface` for dense built-in tool surfaces.
- Primitives contain native elements only and use CSS variable styles.
- The new form-control components added in this slice import primitives only.
- Widgets import shared components/primitives and may consume local style modules without reaching into app orchestration.
- `input-field.tsx` contains no raw HTML.
- `demo-widget.tsx` composes `InputField`, `Box`, `Text`, and `Button`.
- Barrel imports are active in `components` and `widgets`.
- `Button` supports `onClick` through `React.ButtonHTMLAttributes<HTMLButtonElement>`.
- `Box` now forwards refs, which allows `ExpandableTextArea` to measure and stretch against its parent or a selected host element.
- `TerminalViewport` keeps the terminal mount point as a typed primitive instead of letting widgets mount xterm into raw HTML.
- `SearchableMultiSelect` provides a query-filtered multiselect surface on top of primitives only.
- `Tabs` supports both horizontal and vertical layouts through a single shared component.
- `RadioControl` and `RadioGroup` cover single and grouped radio selection.
- `SwitcherControl` and `SwitcherGroup` cover single and grouped boolean toggles.
- `ExpandableTextArea` keeps inline behavior by default and can expand to the parent bounds or to a selector target without introducing modal semantics.
- `TerminalStatusHeader` and `TerminalSurface` add the terminal renderer slice in the component layer, with `TerminalSurface` owning the frontend-only xterm mock session.
- `TerminalToolbar` adds the terminal-local addon controls layer for search, clipboard actions, and renderer status.
- `CommanderWidget` stays in the widget layer, renders from a widget-scoped commander store plus a fake filesystem client, and still does not introduce backend calls or real filesystem behavior.
- Commander write operations remain intentionally local to one widget instance: source and target panes can mutate against the same fake client, but different commander widgets do not share mutations or copy paths.
- Commander write operations now also expose a frontend-only pending confirmation contract: `F5/F6/F7/F8` open a pending bar first, `Enter` confirms, and `Escape` cancels without mutating the fake client.
- Commander widget state is now persisted per `widgetId`, which keeps pane paths, history, view toggles, cursor/selection, and local fake-client mutations stable across hard reloads while still avoiding cross-widget state sharing.
- Commander pane history is widget-local and pane-local: each pane keeps its own back/forward stack, and switching panes preserves the other pane's navigation state.
- Commander selection range semantics are now also widget-local and pane-local: each pane keeps its own selection anchor so `Shift`-extended keyboard movement and `Shift+click` ranges can be rebuilt without leaking state into the opposite pane or another commander widget.
- Commander row focus chrome now uses an inset highlight ring instead of row borders, so keyboard navigation keeps the focused entry readable without leaving pale border artifacts on adjacent rows.
- Commander batch rename now stays frontend-only but behaves like a real tool flow: `Shift+F6` opens mass rename, `Ctrl+PgDn` opens the focused entry, template tokens (`[N]`, `[E]`, `[F]`, `[C]`, `[C:n]`) generate live previews, and duplicate target names block confirmation before the fake client mutates the pane.
- Commander transfer conflict handling now also stays explicit at the widget model layer: `copy/move` pending ops with name collisions no longer have a silent generic confirm path, and the shared pending bar exposes dedicated `Overwrite`, `Skip`, `Overwrite all`, and `Skip all` actions instead.
- `CommanderDemoLayout` keeps the demo mount in a layout layer instead of wiring the commander surface directly into app orchestration.
- `WidgetBusyOverlayWidget` stays in the widget layer and uses `@tsparticles/react` directly for the busy-field rendering instead of pushing imperative particle code into shared components.
- `TerminalWidget` stays in the widget layer and now owns the terminal body only: toolbar, panel actions, and renderer surface.
- `TerminalDockviewTabWidget` keeps terminal-specific Dockview tab composition in the widget layer, reusing `TerminalStatusHeader` in a compact mode instead of duplicating terminal chrome inside the body.
- Terminal Dockview tabs now use `cwd` as the primary visible label, while only the active terminal tab exposes connection/session/shell pills plus the local `+` action for adding another terminal tab into the same group.
- The current shell example routes its visible shell blocks through widgets and primitives instead of raw HTML in `App.tsx`.
- `App.tsx` remains responsible for Dockview API orchestration and Effector state wiring.
- Modal state now lives in a dedicated `shared/model/modal.ts` store instead of being hidden inside widget-local React state.
- Tokens now cover dark canvas, glass surfaces, accent hues, spacing, radii, shell sizes, blur, and shadow.
- Shared primitives consume only semantic tokens instead of hardcoded `#111/#fff/#333` values.
- Shared components now include stateless `Notify` plus a reusable `DialogPopup` surface built primarily from shared primitives.
- Shared components now also include `IconButton`, a generic square icon-only control composed from the shared `Button` primitive.
- Shared components now also include the terminal renderer slice: a status header, toolbar, and xterm-based surface wrapped by `TerminalViewport`.
- The new form-control components added in this slice compose shared primitives only. The existing `DialogPopup` close glyph remains the current icon exception from the earlier shell slice.
- Live localhost smoke confirmed tokenized shell values in the DOM: `body/root` background `rgb(6, 17, 15)`, `AI` button backdrop `blur(10px)`, right rail width `40px`, and right rail glass background `rgba(11, 24, 22, 0.72)`.
- The shell-managed AI panel animation now uses `motion` at the app layer instead of CSS width transitions or manual `requestAnimationFrame`, keeping the animation concern at the shell boundary without pushing animation logic down into widgets or primitives.
- The shared DOM identity layer now provides readable ids plus semantic
  selectors through `data-runa-node`, backed by `RunaDomScopeProvider`,
  primitive-level auto identity, and subtree auto-tagging at widget/layout
  roots.
- Terminal panels now pass `params` as the local source of truth for title and session metadata, which allows the same terminal config to be reused by both the body widget and the custom Dockview tab widget.
- A fresh headless DOM smoke on `http://127.0.0.1:5173` confirmed `509`
  elements resolving both `id` and `data-runa-node`, including semantic roots
  like `shell-tool-commander-root`, `shell-terminal-header-terminal-widget-root`,
  `shell-workspace-shell-topbar-toggle-ai-panel`, and an xterm-managed
  descendant resolving as `shell-global-terminal-input`.
