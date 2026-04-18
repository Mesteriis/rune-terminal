# Frontend Primitive Batch Migration Plan

**Scope:** Extend the strict four-file UI component contract from RTButton pilot to 3 additional active primitives.

## Selected Primitives

### 1. RTMagnify (4 imports, 18 lines)
- **Status:** Legacy .tsx and .scss files
- **Complexity:** Very low
- **Dependencies:** None (pure component)
- **Used by:** onboarding, blockframe, preview
- **Reason:** Simple pure component, no app/runtime coupling, actively used

### 2. RTInput (5 imports, 155 lines)
- **Status:** Legacy .tsx and .scss files
- **Complexity:** Medium
- **Dependencies:** None (pure React hooks)
- **Used by:** workspaceeditor, preview, typeaheadmodal, RTSearch, RTEmojiPalette
- **Reason:** Actively used, self-contained, no app dependencies despite size

### 3. RTTooltip (5 imports, 172 lines)
- **Status:** Legacy .tsx file (no .scss)
- **Complexity:** Medium
- **Dependencies:** @floating-ui/react only (library, not app)
- **Used by:** builder-secrettab, workspace, waveconfig, aipanel
- **Reason:** Actively used, clean library dependency, no app coupling

## Excluded Primitives (and Why)

### RTIconButton
- **Reason:** Depends on `@/app/hook/useLongClick` — not a true primitive; couples to app layer
- **Scope:** Out

### RTMarkdown
- **Reason:** 1800+ lines, has internal plugin system, complex coupling to app modal logic
- **Scope:** Out

### RTSearch
- **Reason:** Composes RTIconButton and RTInput (app-coupled dependencies)
- **Scope:** Out

### RTFlyoutMenu, RTExpandableMenu, RTMenuButton
- **Reason:** Hierarchical composition, would require migrating dependencies first
- **Scope:** Out

### RTCopyButton, RTEmojiButton, RTEmojiPalette
- **Reason:** Composed of already-complex primitives or derive specific behavior
- **Scope:** Out (defer to next batch if needed)

## Migration Strategy

1. Migrate RTMagnify first (simplest, lowest risk)
2. Migrate RTInput (medium complexity, widely used, good validation)
3. Migrate RTTooltip (medium complexity, clean library deps)
4. Register all three in contract manifest
5. Validate with strict checker
6. Runtime smoke test
7. Document results

## Success Criteria

- All three primitives migrated to four-file convention
- No public API renames required
- All imports updated or use barrel correctly
- Strict checker passes
- Frontend build succeeds
- Runtime smoke validation passes
