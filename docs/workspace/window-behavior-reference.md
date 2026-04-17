# Window Behavior Reference (Release-Blocking)

Date: `2026-04-17`  
Phase: `1.0.0-rc1` hardening  
Scope: window/layout behavior parity from existing TideTerm behavior, adapted to current architecture

## 1) Exact required behaviors from reference code

Reference extraction source:
- `tideterm/frontend/layout/lib/{TileLayout.tsx,layoutTree.ts,utils.ts,types.ts}`
- `tideterm/frontend/app/store/global.ts` (split/create actions)
- `tideterm/pkg/wshrpc/wshserver/wshserver.go` (`createblock` target split actions)
- `tideterm/pkg/wcore/layout.go` (queued layout actions and restore path)

Required behavior:

1. Add widget with explicit split target:
- split-right / split-left map to horizontal split with new node inserted `after` / `before` target.
- split-down / split-up map to vertical split with new node inserted `after` / `before` target.
- if parent already matches split direction, new leaf is spliced directly next to target.
- if parent direction differs, target is wrapped into a new split group of the required direction.

2. Drag/drop split side by drop zone:
- drop direction is computed from pointer position over target leaf (`determineDropDirection`).
- inner zones resolve to `top/right/bottom/left`.
- outer edge zones resolve to `outerTop/outerRight/outerBottom/outerLeft`.
- center zone resolves to `center` (swap semantics in reference model).
- pending move action is committed on drop.

3. Active/focus behavior:
- split/insert/replace actions can mark the new node as focused.
- focus is explicit node identity (`focusedNodeId`) and is updated by actions, not inferred heuristically.
- focus navigation and explicit focus action target node identity directly.

4. Visible layout rules:
- layout is a tree of `leaf` and `split-group` nodes.
- split groups are directioned (`row`/`column` equivalent to horizontal/vertical behavior).
- rendering and drop overlays are leaf-driven over the current tree truth.

5. Restore/persistence expectations:
- layout actions are queued backend-side and applied to the persisted layout state.
- persisted state includes tree structure and focused identity.
- restore rehydrates the same tree/focus model; behavior is not frontend-only ephemeral state.

## 2) Mandatory for release in this batch

- split-on-add behavior with direction fidelity (`left/right/top/bottom` semantics).
- drop-zone-based split/move behavior on existing windows/widgets.
- explicit focus/active correctness after split and drop operations.
- persisted and restored layout/focus truth (restart-safe).

These are release-blocking parity behaviors, not optional polish.

## 3) Not targeted in this batch

- full visual layout editor
- advanced resize/animation parity work
- broad non-window feature domains
- unrelated shell redesign

## 4) Adaptation note (mandatory)

This batch is adaptation of existing TideTerm behavior into the current backend-owned workspace architecture.  
It is not a new invented window model and not a reduced “MVP replacement.”
