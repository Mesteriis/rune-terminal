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
- `CommanderWidget` renders the static Total Commander-style dual-pane demo surface from local JSON-backed mock data only.
- `TerminalWidget` renders the terminal-specific body composition for terminal panels.
- `CommanderDemoLayout` mounts `CommanderWidget` into the isolated `tool` panel demo surface.
- `DialogPopup` provides the stateless shared dialog surface, including the wide settings-dialog variant.
- `Notify` provides the stateless shared notification surface.
- `ModalHostWidget` renders body-scoped and widget-scoped modal layers.
- `PanelModalActionsWidget` exposes a widget-level demo path for modal opening.
- `DockviewPanelWidget` renders Dockview panel bodies.
- `AiPanelWidget` renders the shell-managed AI panel body inside the left shell pane.
- `App.tsx` now uses `motion` only at the app shell boundary to animate the shell-managed AI panel width; the AI body itself remains a normal widget.

## Validation

### Commands

- `npm --prefix frontend run lint:active`
- `npm --prefix frontend run build`
- `curl -sf http://127.0.0.1:4193`
- `node --input-type=module -e "<headless Playwright localhost computed-style smoke for tokenized shell surfaces>"`
- `rg -n "React\.(HTMLAttributes|ButtonHTMLAttributes|InputHTMLAttributes|LabelHTMLAttributes|SelectHTMLAttributes|TextareaHTMLAttributes)" frontend/src/shared/ui/primitives`
- `rg -n "from '../primitives'|from '../shared/ui/primitives'|from '../shared/ui/components'" frontend/src/shared/ui/components frontend/src/widgets`
- `rg -n "export \* from './(expandable-textarea|radio-control|radio-group|searchable-multi-select|switcher-control|switcher-group|tabs)'" frontend/src/shared/ui/components/index.ts`

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
- `CommanderWidget` stays in the widget layer, renders from local JSON-backed mock state only, and does not introduce filesystem behavior, backend calls, or operation dialogs.
- `CommanderDemoLayout` keeps the demo mount in a layout layer instead of wiring the commander surface directly into app orchestration.
- `WidgetBusyOverlayWidget` stays in the widget layer and uses `@tsparticles/react` directly for the busy-field rendering instead of pushing imperative particle code into shared components.
- `TerminalWidget` stays in the widget layer and composes the terminal status header plus the terminal renderer surface for terminal panels.
- The current shell example routes its visible shell blocks through widgets and primitives instead of raw HTML in `App.tsx`.
- `App.tsx` remains responsible for Dockview API orchestration and Effector state wiring.
- Modal state now lives in a dedicated `shared/model/modal.ts` store instead of being hidden inside widget-local React state.
- Tokens now cover dark canvas, glass surfaces, accent hues, spacing, radii, shell sizes, blur, and shadow.
- Shared primitives consume only semantic tokens instead of hardcoded `#111/#fff/#333` values.
- Shared components now include stateless `Notify` plus a reusable `DialogPopup` surface built primarily from shared primitives.
- Shared components now also include the terminal renderer slice: a status header, toolbar, and xterm-based surface wrapped by `TerminalViewport`.
- The new form-control components added in this slice compose shared primitives only. The existing `DialogPopup` close glyph remains the current icon exception from the earlier shell slice.
- Live localhost smoke confirmed tokenized shell values in the DOM: `body/root` background `rgb(6, 17, 15)`, `AI` button backdrop `blur(10px)`, right rail width `40px`, and right rail glass background `rgba(11, 24, 22, 0.72)`.
- The shell-managed AI panel animation now uses `motion` at the app layer instead of CSS width transitions or manual `requestAnimationFrame`, keeping the animation concern at the shell boundary without pushing animation logic down into widgets or primitives.
