# UI Architecture

## Layer Rules

### Tokens

- CSS variables only
- No React code
- Shared visual values live in `src/shared/ui/tokens/index.css`

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

## Validation

### Commands

- `npm --prefix frontend run lint:active`
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
