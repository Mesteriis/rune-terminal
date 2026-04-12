# RunaTerminal Workspace Model

## Principles

- workspace structure is backend-owned
- frontend receives normalized snapshots
- widget focus is explicit and auditable
- widget type does not determine transport

## MVP Semantics

A workspace contains a small set of widgets and exactly one active widget. Widgets are listed in stable order so the UI can render a predictable navigation rail.

Operations:

- list widgets
- get active widget
- focus widget

## Why This Is Simpler Than TideTerm

The old stack mixed layout state, transport identifiers, block metadata and UI view-model state. RunaTerminal deliberately starts with the thinner invariant set needed for long-lived maintainability:

- inventory
- focus
- typed widget descriptors

Once those contracts are stable, richer layout trees can be layered on top without making the workspace service aware of renderer internals.

