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

### Components

- Compose primitives only
- Must not use raw HTML elements
- Provide reusable UI combinations

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
- `ModalWindow` provides the stateless shared modal surface.
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
- `rg --pcre2 -n "<(?!/?(Box|Text|Input|Button|InputField)\b)[A-Za-z]" frontend/src/shared/ui/components frontend/src/widgets`
- `rg -n "React\.(HTMLAttributes|ButtonHTMLAttributes|InputHTMLAttributes)" frontend/src/shared/ui/primitives`
- `rg -n "from '../primitives'|from '../shared/ui/primitives'|from '../shared/ui/components'" frontend/src/shared/ui/components frontend/src/widgets`

### Results

- Primitives are typed with native HTML prop types.
- Primitives contain native elements only and use CSS variable styles.
- Components import primitives only.
- Widgets import components and primitives only.
- `input-field.tsx` contains no raw HTML.
- `demo-widget.tsx` composes `InputField`, `Box`, `Text`, and `Button`.
- Barrel imports are active in `components` and `widgets`.
- `Button` supports `onClick` through `React.ButtonHTMLAttributes<HTMLButtonElement>`.
- The current shell example routes its visible shell blocks through widgets and primitives instead of raw HTML in `App.tsx`.
- `App.tsx` remains responsible for Dockview API orchestration and Effector state wiring.
- Modal state now lives in a dedicated `shared/model/modal.ts` store instead of being hidden inside widget-local React state.
- Tokens now cover dark canvas, glass surfaces, accent hues, spacing, radii, shell sizes, blur, and shadow.
- Shared primitives consume only semantic tokens instead of hardcoded `#111/#fff/#333` values.
- Shared components now include a stateless `ModalWindow` surface that composes `Box`, `Text`, and `Button` only.
- Live localhost smoke confirmed tokenized shell values in the DOM: `body/root` background `rgb(6, 17, 15)`, `AI` button backdrop `blur(10px)`, right rail width `40px`, and right rail glass background `rgba(11, 24, 22, 0.72)`.
