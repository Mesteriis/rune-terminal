# MCP UI Baseline

Date: `2026-04-16`
Phase: `1.0.0-rc1` hardening

## Chosen surface

Use the existing `Tools` floating window from the right utility rail as the MCP operator surface.

## Why this fits current UI

- It already exists in the active shell and is designed for explicit operator actions.
- It already shows runtime-backed execution metadata and response payloads.
- It avoids adding a new navigation entry or changing shell layout.
- It keeps MCP control close to other controlled execution surfaces.

## Scope for this batch

- Add a minimal MCP section inside the `Tools` floating window.
- Show MCP server state and last-used runtime data.
- Add explicit lifecycle actions and explicit manual invoke.

## Explicitly not added

- No new MCP dashboard.
- No shell redesign or utility-rail redesign.
- No MCP discovery or integration catalog UI.
- No auto-start or auto-load toggles.
- No implicit agent/context integration behavior.
