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

### Primitives

- Wrap native HTML elements
- Use tokens only
- Must be typed with native HTML props
- No business logic

Current primitives:

- `Box`
- `Button`
- `Checkbox`
- `Input`
- `Label`
- `Radio`
- `Select`
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

### Widgets

- Compose primitives and components
- Represent UI blocks
- Stay above shared UI layers

## Dependency Direction

The dependency direction is one-way:

`tokens -> primitives -> components -> widgets`

Higher layers can depend on lower layers.
Lower layers must not depend on higher layers.

## Allowed Imports

- `primitives -> tokens`
- `components -> primitives`
- `widgets -> components + primitives`

## Public API

- `src/shared/ui/primitives/index.ts`
- `src/shared/ui/components/index.ts`
- `src/widgets/index.ts`

## Current Shell Mapping

The active frontend shell example now consumes the UI layers instead of rendering
its visible shell blocks as raw HTML inside `App.tsx`.

- `App.tsx` owns Dockview wiring and UI state only.
- `ShellTopbarWidget` renders the top header block.
- `RightActionRailWidget` renders the full-height right rail.
- `DialogPopup` provides the stateless shared dialog surface, including the wide settings-dialog variant.
- `Notify` provides the stateless shared notification surface.
- `ModalHostWidget` renders body-scoped and widget-scoped modal layers.
- `PanelModalActionsWidget` exposes a widget-level demo path for modal opening.
- `DockviewPanelWidget` and `AiPanelWidget` render Dockview panel bodies.
- `AiGroupActionsWidget` renders the AI-group header action.

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
- Primitives contain native elements only and use CSS variable styles.
- The new form-control components added in this slice import primitives only.
- Widgets import components and primitives only.
- `input-field.tsx` contains no raw HTML.
- `demo-widget.tsx` composes `InputField`, `Box`, `Text`, and `Button`.
- Barrel imports are active in `components` and `widgets`.
- `Button` supports `onClick` through `React.ButtonHTMLAttributes<HTMLButtonElement>`.
- `Box` now forwards refs, which allows `ExpandableTextArea` to measure and stretch against its parent or a selected host element.
- `SearchableMultiSelect` provides a query-filtered multiselect surface on top of primitives only.
- `Tabs` supports both horizontal and vertical layouts through a single shared component.
- `RadioControl` and `RadioGroup` cover single and grouped radio selection.
- `SwitcherControl` and `SwitcherGroup` cover single and grouped boolean toggles.
- `ExpandableTextArea` keeps inline behavior by default and can expand to the parent bounds or to a selector target without introducing modal semantics.
- The current shell example routes its visible shell blocks through widgets and primitives instead of raw HTML in `App.tsx`.
- `App.tsx` remains responsible for Dockview API orchestration and Effector state wiring.
- Modal state now lives in a dedicated `shared/model/modal.ts` store instead of being hidden inside widget-local React state.
- Tokens now cover dark canvas, glass surfaces, accent hues, spacing, radii, shell sizes, blur, and shadow.
- Shared primitives consume only semantic tokens instead of hardcoded `#111/#fff/#333` values.
- Shared components now include stateless `Notify` plus a reusable `DialogPopup` surface built primarily from shared primitives.
- The new form-control components added in this slice compose shared primitives only. The existing `DialogPopup` close glyph remains the current icon exception from the earlier shell slice.
- Live localhost smoke confirmed tokenized shell values in the DOM: `body/root` background `rgb(6, 17, 15)`, `AI` button backdrop `blur(10px)`, right rail width `40px`, and right rail glass background `rgba(11, 24, 22, 0.72)`.
