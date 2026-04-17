# Workspace Navigation Baseline

Date: `2026-04-16`
Phase: `1.0.0-rc1` release hardening

This document captures the current workspace/file-navigation baseline for the active compat runtime.

## What exists today

- Workspace truth is backend-owned and exposed via `GET /api/v1/workspace` and `GET /api/v1/bootstrap`.
- Workspace navigation is tab/widget-focused:
  - focus tab/widget
  - create/close/rename/pin/move tabs
  - terminal-first session workflows
- Bootstrap includes `repo_root`, and runtime tools receive execution context (`workspace_id`, `active_widget_id`, `repo_root`).
- AI conversation supports explicit local attachment references through:
  - `POST /api/v1/agent/conversation/attachments/references`
  - `POST /api/v1/agent/conversation/messages` with `attachments`
- Attachment context is backend-bounded and explicit in current behavior:
  - no automatic import into app storage
  - bounded content extraction for text-like files
  - metadata-only handling for binary/non-text references

## What is missing today

- No backend file-navigation endpoint for directory listing in the active `/api/v1/*` surface.
- No minimal workspace file navigator in the active right-rail utility grammar.
- No explicit shell flow to browse directories and select a file path from backend truth.
- No direct bridge from workspace file navigation to AI attachment references.
- No active “open/reveal path” UX for files in the current compat shell.

## Intentionally out of scope for this batch

- Full IDE/editor implementation.
- Recursive indexing/search engine or background crawler.
- Drag/drop filesystem management, rename/move/delete flows.
- Large shell/workspace layout redesign.
- Broad refactor of terminal, MCP, remote, or plugin architecture.

## Slice intent

This batch adds a minimal navigation support layer for execution workflows:

- backend-owned filesystem listing within workspace boundaries
- lightweight UI for browse/select/reveal
- explicit user-driven file-to-AI context attachment

It does not change workspace ownership boundaries or expand into full file-management parity.
