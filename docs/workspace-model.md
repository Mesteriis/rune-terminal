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

In the current parity slice, each tab owns one primary widget, so switching tabs also switches the active widget. This keeps the new model honest while moving toward TideTerm tabbar behavior.

Operations:

- list tabs
- get active tab
- focus tab
- move tab inside its current group
- rename tab
- pin or unpin tab
- create terminal tab
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

Once those contracts are stable, richer layout trees can be layered on top without making the workspace service aware of renderer internals.
