# ui/style

Shared visual primitives and reusable styling utilities.

## Purpose

`ui/style` is the common style layer below all components and primitives. It provides:
- CSS utilities and mixins
- Base element resets
- Layout helpers
- Responsive design utilities
- Shared animations/transitions

## Constraints

The `ui/style` layer must:
- ✗ Not make runtime API calls
- ✗ Not import React or use React state
- ✗ Not import from ui/components, ui/widgets, ui/layout, or app
- ✗ Not serve as a dumping ground for component-specific styles
- ✓ Only import from ui/css_tokens

## What Belongs Here

- `.scss` mixins and functions for reuse across components
- Base styles and normalization
- Layout utilities (flexbox, grid, positioning helpers)
- Animation/transition definitions
- Responsive breakpoint utilities
- Typography base styles

## What Does NOT Belong Here

- Component-specific styling (belongs in `<Component>.style.scss`)
- Application layout orchestration (belongs in ui/layout)
- Widget behavior logic (belongs in widgets)
- Runtime integrations (belongs in components/widgets that consume the API)

## Current State

This directory is new and being populated as components are migrated to the four-file structure.
