# Latest: Frontend Primitive Batch Migration

**Date:** 2026-04-18  
**Scope:** Migrate RTMagnify, RTInput, RTTooltip to four-file contract; register all with strict checker

## Summary

Three additional primitives (RTMagnify, RTInput, RTTooltip) successfully migrated to four-file convention. All four registered primitives now pass strict contract enforcement.

## Migrated Primitives

### RTMagnify (Very Low Complexity)
- **Files created:**
  - RTMagnify.logic.ts (MagnifyIconProps type)
  - RTMagnify.template.tsx (MagnifyIcon component with clsx)
  - RTMagnify.style.scss (SVG icon rotation animation)
  - RTMagnify.story.tsx (enabled/disabled state demo)
  - index.ts (barrel export)
- **Files removed:** RTMagnify.tsx, RTMagnify.scss
- **Dependencies:** None (pure component)
- **Imports:** Updated 4 usage sites automatically via barrel

### RTInput (Medium Complexity)
- **Files created:**
  - RTInput.logic.ts (InputProps, InputGroupProps, InputLeftElementProps, InputRightElementProps types)
  - RTInput.template.tsx (Input, InputGroup, InputLeftElement, InputRightElement components)
  - RTInput.style.scss (complete form styling with focus/disabled states)
  - RTInput.story.tsx (multiple state and configuration demos)
  - index.ts (barrel export)
- **Files removed:** RTInput.tsx, RTInput.scss
- **Dependencies:** None (pure React hooks)
- **Imports:** Used by RTSearch, RTEmojiPalette, workspaceeditor, preview, modals (5 sites)

### RTTooltip (Medium Complexity)
- **Files created:**
  - RTTooltip.logic.ts (TooltipProps type)
  - RTTooltip.template.tsx (Tooltip and TooltipInner components with @floating-ui/react)
  - RTTooltip.style.scss (placeholder; styling via tailwind classes)
  - RTTooltip.story.tsx (placement and state demos)
  - index.ts (barrel export)
- **Files removed:** RTTooltip.tsx
- **Dependencies:** @floating-ui/react library only (not app coupling)
- **Imports:** Used by builder, workspace, waveconfig, aipanel (5 sites)

## Contract Manifest Registration

**File:** frontend/ui/component-contract.json

All four primitives now registered:
```json
{
  "components": [
    { "name": "RTButton", "layer": "primitive", "dir": "ui/primitives/RTButton" },
    { "name": "RTMagnify", "layer": "primitive", "dir": "ui/primitives/RTMagnify" },
    { "name": "RTInput", "layer": "primitive", "dir": "ui/primitives/RTInput" },
    { "name": "RTTooltip", "layer": "primitive", "dir": "ui/primitives/RTTooltip" }
  ]
}
```

## Validation Commands and Results

### Strict Contract Checker
```bash
node frontend/scripts/check-ui-component-contract.mjs
✓ RTButton has all required files
✓ RTMagnify has all required files
✓ RTInput has all required files
✓ RTTooltip has all required files
```

### TypeScript
```bash
npx tsc -p frontend/tsconfig.json --noEmit
✓ No errors
```

### ESLint (active scope)
```bash
npm --prefix frontend run lint:active
✓ 15 pre-existing warnings (unchanged)
```

### Frontend Build
```bash
npm --prefix frontend run build
✓ Built in 3.31s
```

### Backend Service
```bash
RTERM_AUTH_TOKEN=ui-primitive-batch-token \
  apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:52761 \
  --workspace-root "$PWD" \
  --state-dir /tmp/runa-ui-primitive-batch-state
✓ Running
```

### Frontend Dev Server
```bash
VITE_RTERM_API_BASE=http://127.0.0.1:52761 \
  VITE_RTERM_AUTH_TOKEN=ui-primitive-batch-token \
  npm --prefix frontend run dev -- --host 127.0.0.1 --port 4181 --strictPort
✓ Running in 229ms
```

### Smoke Tests
```bash
curl -sf http://127.0.0.1:52761/healthz
✓ Backend healthy

curl -sf http://127.0.0.1:52761/api/v1/workspace
✓ Workspace API accessible

curl -sf http://127.0.0.1:52761/api/v1/terminal/term-main?from=0
✓ Terminal API accessible

curl -s http://127.0.0.1:4181/
✓ Frontend HTML serving correctly
```

## Key Points

- **No API renames:** All public exports remain as-is (MagnifyIcon, Input/InputGroup/InputLeftElement/InputRightElement, Tooltip)
- **Strict enforcement:** Contract checker now fails on any old-style files (.tsx, .scss) for registered components
- **Pure primitives:** All three have zero coupling to app/runtime/api layers
- **Barrel imports working:** All existing usage sites continue to work without changes
- **Storybook NOT added:** Static .story.tsx files created without any Storybook runtime dependency
- **Only registered components checked:** Checker still only inspects RTButton, RTMagnify, RTInput, RTTooltip; unregistered primitives are free to keep legacy structure

## Scope Adherence

- ✓ Only 3 primitives migrated (not 5+)
- ✓ No components/widgets/layout touched
- ✓ No public API renames
- ✓ No Storybook runtime added
- ✓ No app/runtime coupling introduced
- ✓ Strict checker scope unchanged (manifest-only)
- ✓ No opportunistic cleanup
- ✓ Backend unchanged

## Known Limitations

None. All four registered primitives pass strict validation.

---

# Frontend RTButton Contract Completion Validation

**Date:** 2026-04-18  
**Scope:** RTButton four-file convention migration and strict UI component contract enforcement

## Summary

RTButton has been successfully migrated to the four-file component convention and the UI component contract checker has been made strict for registered components.

## Changes

### RTButton File Structure
- ✓ `RTButton.style.scss` — All CSS moved from legacy RTButton.scss
- ✓ `RTButton.logic.ts` — ButtonProps type and helper functions (normalizeButtonClassName)
- ✓ `RTButton.template.tsx` — React render component with memo/forwardRef
- ✓ `RTButton.story.tsx` — Static demo component (no Storybook runtime)
- ✓ `index.ts` — Barrel export for public API

### Old Files Removed
- ✓ RTButton.tsx (removed)
- ✓ RTButton.scss (removed)

### Imports Normalized
- ✓ All RTButton imports use barrel path `@/ui/primitives/RTButton`
- ✓ No direct imports from old files found

### Contract Checker Updated
- ✓ `check-ui-component-contract.mjs` now enforces strict validation
- ✓ Old-style files (.tsx, .scss) now cause **error** (not warning) for registered components
- ✓ Error messages are clear and actionable

### Component Registration
- ✓ RTButton registered in `component-contract.json`
- ✓ Only RTButton registered (strict scope enforcement)

## Validation Commands Run

```bash
# Contract checker
node frontend/scripts/check-ui-component-contract.mjs
✓ RTButton has all required files

# From frontend directory
npm run lint:ui-contract
✓ lint:ui-contract passed

# TypeScript
npx tsc -p frontend/tsconfig.json --noEmit
✓ No errors

# Frontend build
npm --prefix frontend run build
✓ Built in 3.27s

# Build core
npm run build:core
✓ Completed

# Backend service
RTERM_AUTH_TOKEN=ui-contract-token \
  apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:52760 \
  --workspace-root "$PWD" \
  --state-dir /tmp/runa-ui-contract-state
✓ Running

# Frontend dev server
VITE_RTERM_API_BASE=http://127.0.0.1:52760 \
  VITE_RTERM_AUTH_TOKEN=ui-contract-token \
  npm --prefix frontend run dev -- --host 127.0.0.1 --port 4180 --strictPort
✓ Running and serving HTML

# Smoke tests
curl -sf http://127.0.0.1:52760/healthz
✓ Backend health check passed

curl -sf http://127.0.0.1:52760/api/v1/workspace
✓ Workspace API accessible

curl -sf http://127.0.0.1:52760/api/v1/terminal/term-main?from=0
✓ Terminal API accessible

curl -s http://127.0.0.1:4180/
✓ Frontend serves HTML without errors
```

## Validation Results

| Check | Result | Notes |
|-------|--------|-------|
| Contract checker (strict mode) | ✓ PASS | RTButton has all required files, no old files found |
| TypeScript compilation | ✓ PASS | No type errors |
| Frontend build | ✓ PASS | 3.27s build time |
| Backend service startup | ✓ PASS | Healthz and API endpoints responsive |
| Frontend dev server | ✓ PASS | Vite ready in 233ms, HTML serving correctly |
| API smoke tests | ✓ PASS | Workspace and terminal endpoints working |

## Public API Preservation

- ✓ Button component name preserved (not renamed to RTButton)
- ✓ ButtonProps type exported from public barrel
- ✓ forwardRef behavior maintained
- ✓ memo optimization maintained
- ✓ disabled and tabIndex behavior unchanged
- ✓ Default category (solid) preserved
- ✓ Default color (green) preserved
- ✓ className normalization logic unchanged

## Known Limitations

None. RTButton migration is complete and strict enforcement is active.

## Scope Adherence

- ✓ Only RTButton migrated (no other primitives)
- ✓ Only RTButton registered in contract manifest
- ✓ No Storybook runtime added
- ✓ No backend/runtime changes
- ✓ No widget/layout changes
- ✓ All existing imports working
