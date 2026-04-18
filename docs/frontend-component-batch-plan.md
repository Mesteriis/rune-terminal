# Frontend Component Layer Migration Batch Plan

## Scope

Migrate the `ui/components` layer to the strict four-file UI contract convention.

## Available Components

`frontend/ui/components` contains exactly two components:

| Component   | Active imports                                               | Status  |
|-------------|--------------------------------------------------------------|---------|
| RTPopover   | notificationpopover.tsx, workspaceswitcher.tsx, RTEmojiPalette.tsx | Active |
| RTModal     | None (WaveModal defined but not imported outside its dir)    | Dormant |

## Selected Batch

### RTModal
Migrated despite having no active import sites because:
- It is the only other component in the layer.
- It is a well-scoped, self-contained component (≈80 lines).
- Migrating it now avoids leaving an unmigrated legacy file that would fail a future broader checker sweep.
- No upward dependencies into widgets/layout/app.
- Uses `@/ui/primitives/RTButton` — acceptable (component → primitive direction).

### RTPopover
Selected because:
- Actively used by 3 import sites.
- Medium complexity (≈200 lines), uses `@floating-ui/react`.
- No upward dependencies into widgets/layout/app.
- Uses `@/ui/primitives/RTButton` — acceptable.

## Excluded Candidates

No other components exist in `frontend/ui/components` at this time.

## Layer Boundary Confirmation

Both components:
- depend on primitives (`@/ui/primitives/RTButton`, `@/ui/primitives/RTTooltip` if needed)
- depend on library packages (`@floating-ui/react`, `clsx`, `react`)
- do NOT import from `@/app/`, `@/ui/widgets/`, or `@/ui/layout/`

## Files to Create Per Component

For each `<Name>`:
- `<Name>.logic.ts` — types, interface definitions, pure helpers
- `<Name>.template.tsx` — React component(s), must import `./<Name>.style.scss`
- `<Name>.style.scss` — styles (moved from legacy `<Name>.scss`)
- `<Name>.story.tsx` — static demo, no Storybook runtime
- `index.ts` — barrel export, updated to point to new files

## Files to Remove Per Component

- `<Name>.tsx` (legacy)
- `<Name>.scss` (legacy)

## Out of Scope

- primitives (already partially migrated in previous batches)
- widgets, layout, app layers
- Storybook runtime or dependencies
- any backend, runtime API, Go core, or Tauri shell changes
