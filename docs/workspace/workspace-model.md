# RunaTerminal Workspace Model

## Principles

- workspace structure is backend-owned
- frontend receives normalized snapshots
- tabs and widgets are separate domain entities
- widget focus is explicit and auditable
- widget type does not determine transport

## MVP Semantics

A workspace contains:

- a stable set of tabs
- a stable set of widgets
- exactly one active tab
- exactly one active widget
- exactly one active layout

Tabs are the primary shell-navigation unit.
Widgets are the workspace-side secondary inventory.

Each tab owns:
- `widget_ids` inventory
- `window_layout` tree (`leaf` / binary `split` with `horizontal`/`vertical` axis)

Switching tabs synchronizes active widget to the first visible leaf in the target tab layout.

Operations:

- list tabs
- get active tab
- focus tab
- move tab inside its current group
- rename tab
- pin or unpin tab
- create terminal tab
- create split terminal widget in active/target tab area
- move existing widget by explicit split side (`left/right/top/bottom`)
- close tab
- list widgets
- get active widget
- focus widget
- update active layout composition
- save current layout as a reusable preset
- switch active layout preset

## Persistent Snapshot Model

Workspace persistence is file-backed by backend state (`state/workspace.json`) and uses an explicit snapshot envelope:

- `version`: schema version for snapshot format
- `workspace`: normalized workspace snapshot

Persisted fields are intentionally limited to restore-critical metadata:

- workspace id/name
- tab ordering, pinned state, title, tab-widget linkage
- tab window layout tree
- widget inventory and terminal/connection linkage
- active tab and active widget ids
- layout composition metadata (layout id, mode, active surfaces/regions, active focus surface)
- saved layout preset list and active layout preset id

Live PTY runtime state is not persisted in the workspace snapshot.

## Why This Is Simpler Than TideTerm

The old stack mixed layout state, transport identifiers, block metadata and UI view-model state. RunaTerminal deliberately starts with the thinner invariant set needed for long-lived maintainability:

- tab inventory
- tab title and pinned state
- tab order inside pinned and regular groups
- inventory
- focus
- typed widget descriptors

The model now includes a minimal backend-owned split tree while still avoiding renderer-owned semantics in the backend.
