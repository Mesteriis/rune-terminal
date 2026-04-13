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

Tabs are the primary shell-navigation unit.
Widgets are the workspace-side secondary inventory.

In the current parity slice, each tab owns one primary widget, so switching tabs also switches the active widget. This keeps the new model honest while moving toward TideTerm tabbar behavior.

Operations:

- list tabs
- get active tab
- focus tab
- create terminal tab
- close tab
- list widgets
- get active widget
- focus widget

## Why This Is Simpler Than TideTerm

The old stack mixed layout state, transport identifiers, block metadata and UI view-model state. RunaTerminal deliberately starts with the thinner invariant set needed for long-lived maintainability:

- tab inventory
- inventory
- focus
- typed widget descriptors

Once those contracts are stable, richer layout trees can be layered on top without making the workspace service aware of renderer internals.
