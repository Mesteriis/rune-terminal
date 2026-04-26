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
  `terminal`, `files`, and path-handoff `preview` are available, `commander`
  is frontend-local, and `editor` / `web` are planned.
- Seed the rewritten Dockview shell and right-rail widget menu from that
  catalog: `terminal` remains the only right-rail-created runtime widget,
  `files` opens through an explicit backend directory path handoff,
  `commander` may still appear as an explicit frontend-local default panel,
  and future widget kinds stay visible but disabled until their frontend
  runtime path exists.

## Contract rules

- Focusing a tab resolves active widget from visible layout leaves.
- Focusing a widget can update active tab when needed.
- Layout changes do not mutate terminal session identity.
- Closing a tab tears down its associated terminal/widget session mapping.

## Current limits

- Closing the last remaining tab leaves an explicit empty workspace state.
- Cross-group drag between pinned and regular tabs is rejected.
- Multi-session-in-one-terminal-block parity is not implemented on the active path.
- Dockview persistence is still frontend-local `localStorage`; the current
  catalog migration covers initial seeding and right-rail discoverability,
  not backend-owned Dockview layout persistence.
- Closing a backend-owned files widget goes through
  `DELETE /api/v1/workspace/widgets/{widgetID}` before the Dockview panel is
  removed, so the runtime workspace snapshot collapses the split layout and
  removes the widget record.
- The files widget currently renders a narrow directory list for the
  handed-off path, with refresh, local kind/name/size/modified sorting,
  visible/total entry count, hidden-file toggle, direct path jump, filename
  filtering, child-directory open, and parent navigation. Current-directory
  and file-row external-open handoffs dispatch to the existing backend
  external-opener route. TideTerm-style rich file preview, drag/copy, media
  preview, and editor handoff remain future slices.
- The backend preview widget path now exists as a workspace-owned file handoff:
  `POST /api/v1/workspace/widgets/open-preview` validates an existing file and
  splits a `preview` widget into the target tab. The frontend preview panel
  renders bounded text/hex previews through `GET /api/v1/fs/read`; file-row
  handoff into that widget remains a separate slice.

## Deep links

- Window behavior reference: [window-behavior-reference.md](./window-behavior-reference.md)
- Window gap map: [window-behavior-gap.md](./window-behavior-gap.md)
- Window validation notes: [window-behavior-validation.md](./window-behavior-validation.md)
- Prior workspace baseline history: [history/workspace-navigation-baseline.md](./history/workspace-navigation-baseline.md)
- Layout baseline history: [history/layout-composition-baseline.md](./history/layout-composition-baseline.md)
