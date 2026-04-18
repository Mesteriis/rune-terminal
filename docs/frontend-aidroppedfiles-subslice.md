# Frontend `aidroppedfiles` Sub-Slice

**Date:** 2026-04-18  
**Scope:** Select the next local leaf-only `RTAIPanelWidget` child imported by `frontend/ui/widgets/RTAIPanelWidget/aipanel.tsx` for four-file contract migration.

## Inputs inspected

- `frontend/ui/widgets/RTAIPanelWidget/aipanel.tsx`
- Direct local imports from `aipanel.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aidroppedfiles.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aimode.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aipanelheader.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aipanelinput.tsx`
- Existing repo-local assessment trail in `docs/frontend-widget-single-item-assessment.md`

## Direct local import classification from `aipanel.tsx`

- Already split and therefore not candidates:
  - `airatelimitstrip`
  - `byokannouncement`
  - `telemetryrequired`
- Not leaf candidates for this sub-slice:
  - `aipanelmessages` because it imports `aimessage` and `aimode`
  - `aipanel-compat` because it orchestrates multiple local children
  - `ai-utils`, `compat-context`, `aitypes`, `waveai-model` because they are shared utility/state modules, not local child leaf components
- Remaining unsplit local child leaf candidates in `aipanel.tsx` import order:
  1. `aidroppedfiles`
  2. `aimode`
  3. `aipanelheader`
  4. `aipanelinput`

## Selection

- Selected target: `frontend/ui/widgets/RTAIPanelWidget/aidroppedfiles.tsx`
- Why this is the next correct slice:
  - It is directly imported by `aipanel.tsx` via the stable local path `./aidroppedfiles`.
  - It remains monolithic: there is no existing `aidroppedfiles.logic.ts`, `aidroppedfiles.template.tsx`, `aidroppedfiles.style.scss`, or `aidroppedfiles.story.tsx`.
  - It is a local child leaf component for this workflow: the file does not import any sibling UI component from `RTAIPanelWidget`.
  - It is the first remaining unsplit local child leaf in `aipanel.tsx` import order, which provides a clean deterministic ordering for the next sub-slice.
  - It is not independently manifest-registered; preserving `./aidroppedfiles` keeps both current local parents (`aipanel.tsx` and `aipanel-compat.tsx`) stable without widening the slice.

## Boundary

- In scope:
  - `frontend/ui/widgets/RTAIPanelWidget/aidroppedfiles.tsx`
  - New local contract files for `aidroppedfiles`
- Allowed:
  - Converting `aidroppedfiles.tsx` into a stable entry barrel that preserves `./aidroppedfiles`
- Out of scope:
  - `aipanel.tsx`
  - `aipanel-compat.tsx`
  - `aimode.tsx`
  - `aipanelheader.tsx`
  - `aipanelinput.tsx`
  - manifest changes
  - checker changes
  - sibling widget migrations

## Phase 1 verification result

- `aipanel.tsx` imports `AIDroppedFiles` from `./aidroppedfiles`.
- `aidroppedfiles.tsx` is local to `RTAIPanelWidget`.
- `aidroppedfiles.tsx` is not already fully split.
- No phase-1 stop condition was hit.
