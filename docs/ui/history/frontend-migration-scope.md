OUTDATED — DO NOT USE

# Frontend Migration Scope

## Migration Goal

- Adapt the frontend runtime wiring to the Go backend.
- Keep the existing UI unchanged while making the bootstrap and transport path truthful.

## Frozen Rules

- No UI rewrite.
- No style changes.
- No component redesign.

## Migration Plan (Locked)

- Slice 1: truth & bootstrap
- Slice 2: typed API client
- Slice 3: tauri runtime adapter
- Slice 4: compatibility facade
- Slice 5: terminal migration
- Slice 6: workspace migration

## Explicit Non-Goals

- IDE features
- Redesign
- Plugin system
- Visual refactor
