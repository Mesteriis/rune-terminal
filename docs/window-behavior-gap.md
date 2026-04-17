# Window Behavior Gap Map (Current vs Reference)

Date: `2026-04-17`  
Phase: `1.0.0-rc1` hardening

## Current behavior (this repo now)

- Compat workspace content path (`frontend/app/tab/tabcontent.tsx`) renders one terminal widget per active tab.
- `widget_ids` exists on tabs, but compat renderer selects only active/first widget and does not render split trees.
- No drop-zone split behavior exists in compat window surface.
- No per-tab window tree is persisted in backend workspace snapshot.
- Focus is tab/widget-level only (`active_tab_id`, `active_widget_id`) without window tree semantics.

## Reference behavior (required)

- Window layout is a tree (leaf/split group) with directional split semantics.
- Add-widget split behavior targets active/relevant leaf and inserts by side.
- Drag/drop over target window resolves drop side (`left/right/top/bottom` plus outer zones, center semantics).
- Focus is explicit node identity updated through layout actions.
- Layout + focus restore from persisted backend truth.

## Exact gaps

1. Layout tree gap:
- Missing backend-owned per-tab window tree (`leaf/split`) in workspace snapshot.

2. Split-on-add gap:
- Missing compat behavior to add a widget by splitting active/relevant area.

3. Drop-zone gap:
- Missing drag/drop split-side behavior in compat workspace window surface.

4. Focus model gap:
- Missing explicit window-node focus semantics tied to split/drop actions.

5. Restore gap:
- Missing persisted/rehydrated window tree and focused window identity.

## Release-blocking parity gaps

All five gaps above block release parity for window behavior.

Required for parity closure in this batch:
- backend-owned split tree per tab,
- split-on-add,
- drop-zone split behavior,
- focus correctness after split/drop,
- persistence/restore correctness.
