# Frontend UI Layer Architecture

## Overview

The frontend UI is organized into clear, layered dependencies. Each layer serves a specific purpose and has defined import constraints to maintain clean architecture and testability.

## Dependency Direction

```
ui/css_tokens or future ui/tokens
  ↓
ui/style (shared visual primitives)
  ↓
ui/primitives (reusable building blocks)
  ↓
ui/components (composite UI elements)
  ↓
ui/widgets (page/workspace-scale features)
  ↓
ui/layout (structural containers)
  ↓
app (top-level routing and shell)
```

## Layer Definitions

### **ui/css_tokens**
- Current token implementation (CSS custom properties, color schemes, sizing constants)
- Single source of truth for design tokens
- No dependencies on other UI layers

### **ui/style**
- New shared style layer for visual primitives only
- Shared CSS utilities, mixins, and base styles
- Requirements:
  - No runtime API calls
  - No React state
  - No app imports
  - No widget imports
  - No component-specific CSS dumping ground
- May depend on: ui/css_tokens only

### **ui/primitives**
- Lowest-level reusable UI building blocks (e.g., Button, Input, Label)
- Focused on rendering and basic interactivity only
- File structure:
  - `<Name>.style.scss` — component styles only
  - `<Name>.logic.ts` — types, hooks, pure helpers, class resolution
  - `<Name>.template.tsx` — JSX/rendering only
  - `<Name>.story.tsx` — static isolated demo (no Storybook deps)
  - `index.ts` — public API export barrel
- May depend on: ui/style, ui/css_tokens only
- Must not depend on: components, widgets, layout, app

### **ui/components**
- Composite UI elements built from primitives
- Examples: TerminalHeader, TabBar, SearchPanel
- File structure: same as primitives
- May depend on: ui/primitives, ui/style, ui/css_tokens only
- Must not depend on: widgets, layout, app
- Component-local runtime/API adapters are allowed if they:
  - Are typed against runtime/api contracts only
  - Do not re-export app or widget types

### **ui/widgets**
- Feature-scale UI (full terminal, workspace controls, panels)
- May coordinate multiple components or manage local state
- May consume typed runtime/API adapters when required
- May depend on: ui/primitives, ui/components, ui/style, ui/css_tokens, typed runtime/api adapters only
- Must not depend on: layout, app

### **ui/layout**
- Structural containers (grid, flex wrappers, viewport containers)
- May depend on: ui/primitives, ui/components, ui/widgets, ui/style, ui/css_tokens

### **app**
- Top-level routing, shell, and orchestration
- May depend on: ui/layout, ui/widgets, ui/components, ui/primitives, ui/style, ui/css_tokens

## Component File Convention

For every newly migrated UI unit (starting with RTButton), the following four-file structure is required:

### **`<Name>.style.scss`**
- Component-local styles only
- No business logic
- Imports from ui/style and ui/css_tokens as needed

### **`<Name>.logic.ts`**
- Type definitions (Props, interfaces)
- Custom hooks
- Pure helper functions
- Class name resolution logic
- Example: ButtonProps, classNameResolver for RTButton

### **`<Name>.template.tsx`**
- React component implementation (JSX rendering)
- Imports "./&lt;Name&gt;.style.scss" to attach styles
- Imports types and helpers from "./&lt;Name&gt;.logic.ts"
- Props interface from logic file
- Ref forwarding, memoization, etc.

### **`<Name>.story.tsx`**
- Static isolated demo/story file
- Shows component in various states and variants
- No Storybook packages or dependencies
- Export a default story and named exports for variants
- Example:
  ```tsx
  export default function ButtonStory() {
    return <Button>Default</Button>;
  }
  
  export function ButtonVariants() {
    return (
      <>
        <Button>Solid Green (default)</Button>
        <Button className="outlined grey">Outlined Grey</Button>
      </>
    );
  }
  ```

### **`index.ts`**
- Public API export barrel
- Exports component from template file
- Exports public types from logic file
- Does not count toward the four-file requirement

## Import Rules

- **Primitives** may only import from style/tokens layers
- **Components** may only import from primitives, style, and tokens layers
- **Widgets** may import from components, primitives, style, tokens, and typed runtime adapters only
- **Layout** may import from any UI layer
- **App** may import from any UI layer
- **No layer may import from higher layers** (downward imports only)

## Current Reality

- `frontend/ui/css_tokens/` contains current token implementation (CSS variables, schemes, sizing)
- `frontend/ui/style/` is being created to consolidate shared visual primitives
- Legacy components in `ui/primitives/`, `ui/components/`, `ui/widgets/` are being gradually migrated to the four-file structure
- Component-local styles remain colocated for now
- Old single-file components (e.g., `Component.tsx` + `Component.scss`) are being refactored

## Migration Path

New components or refactored components **must** follow the four-file convention.
The first pilot component is **RTButton** in `ui/primitives/RTButton/`.

A contract checker (`frontend/scripts/check-ui-component-contract.mjs`) validates registered components and ensures the convention is followed.
