# Frontend Migration Finish Gate

## Completed slices

- Slice 1: truth & bootstrap baseline — completed.
- Slice 2: typed API contract layer — completed.
- Slice 3: Tauri runtime adapter — completed.
- Slice 4: compatibility facade — completed.
- Slice 5: terminal migration — completed.
- Slice 6: workspace migration — completed.

## Finish criteria checklist

- truthful toolchain/bootstrap: done
- isolated typed api layer: done
- isolated runtime adapter: done
- isolated compat seam: done
- terminal migrated: done
- workspace migrated: done
- visual layer preserved: done
- old_front not used as runtime source: done
- migration docs present: done
- broad cleanup intentionally deferred: done

## Remaining legacy after finish

- Workspace list/switch/update flows (`workspaceswitcher`, `workspaceeditor`) still use legacy `WorkspaceService`.
- Core runtime assumptions in `frontend/wave.ts`, `frontend/store/global.ts`, and `frontend/util/fetchutil.ts` remain in place for non-migrated paths.
- Legacy websocket/store and WOS orchestration remain untouched beyond required migration seams.
- Non-terminal workspace-related cleanup in `app/store` is still pending.

## Finish rule

This migration cycle is considered closed after Slice 6. Further cleanup, feature work, or architectural shifts must start as separate, explicitly scoped tasks and must not be treated as implicit continuation of this migration sequence.

## Immediate next-step recommendations

1. Targeted cleanup only for legacy workspace switcher/editor seams that still call old services.
2. Broader runtime adoption for any remaining migrated-adjacent UI surfaces (outside active tab/path flows).
3. Focused feature work only after explicitly opening a new slice.
