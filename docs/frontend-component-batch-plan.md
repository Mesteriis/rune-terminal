# Frontend Component Layer Migration Batch Plan

## Correction Note (2026-04-18)

The initial component batch assumption was wrong.

- `RTModal` is currently inactive (no active import sites outside its own component/story files).
- `RTPopover` is the only active component candidate in `ui/components`.
- Because fewer than 2 active candidates exist, the original component batch should have stopped.
- This repair slice brings repository state back into alignment by unregistering `RTModal` rather than expanding scope.

The sections below capture the original planning context and are superseded by this correction where they conflict.

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
