# Workspace Model

Date: `2026-04-25`
Phase: stability hardening

## What this document is

This is the canonical workspace entrypoint for tab/widget/layout behavior.

## Core model

- Workspace state is backend-owned and persisted (`state/workspace.json`).
- Tabs are primary navigation units.
- Widgets are runtime binding units (terminal/session/connection context).
- Active tab and active widget are explicit and synchronized.
- Tab layout is backend-owned (`window_layout` tree with `leaf` and `split` nodes).
- Widget-kind discovery is backend-owned through
  `GET /api/v1/workspace/widget-kinds`; the catalog intentionally separates
  available backend-owned kinds from frontend-local and planned kinds.

## Active capabilities

- Create/close/rename/pin/unpin/reorder tabs.
- Create split widgets with explicit side placement.
- Move widgets by explicit split direction (`left`, `right`, `top`, `bottom`, outer zones, `center` swap).
- Persist and restore layout composition presets (`split`/`focus`, active surfaces, focus surface).
- Keep widget `connection_id` binding stable across tab/layout operations.
- Expose the current widget-kind catalog with honest implementation status:
  `terminal` and `files` are available, `commander` is frontend-local, and
  `preview` / `editor` / `web` are planned.

## Contract rules

- Focusing a tab resolves active widget from visible layout leaves.
- Focusing a widget can update active tab when needed.
- Layout changes do not mutate terminal session identity.
- Closing a tab tears down its associated terminal/widget session mapping.

## Current limits

- Closing the last remaining tab leaves an explicit empty workspace state.
- Cross-group drag between pinned and regular tabs is rejected.
- Multi-session-in-one-terminal-block parity is not implemented on the active path.
- Dockview still does not consume the backend widget-kind catalog as its
  source of truth; that migration is the next workspace slice.

## Deep links

- Window behavior reference: [window-behavior-reference.md](./window-behavior-reference.md)
- Window gap map: [window-behavior-gap.md](./window-behavior-gap.md)
- Window validation notes: [window-behavior-validation.md](./window-behavior-validation.md)
- Prior workspace baseline history: [history/workspace-navigation-baseline.md](./history/workspace-navigation-baseline.md)
- Layout baseline history: [history/layout-composition-baseline.md](./history/layout-composition-baseline.md)
