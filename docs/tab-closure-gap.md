# Last-Tab Closure Gap

Date: `2026-04-17`
Phase: `1.0.0-rc1` hardening

This document maps the current repo behavior against the repo-root Tide last-tab closure reference in [tab-closure-reference.md](./tab-closure-reference.md).

## Current guard behavior

The current runtime explicitly blocks closing the final tab.

Source evidence:

- `core/app/workspace_actions.go`
  - `Runtime.CloseTab(...)` returns `workspace.ErrCannotCloseLastTab` when `len(snapshot.Tabs) <= 1`
- `core/workspace/service.go`
  - `Service.CloseTab(...)` returns `ErrCannotCloseLastTab` when `len(s.snapshot.Tabs) <= 1`
- `core/workspace/errors.go`
  - declares `ErrCannotCloseLastTab`
- `core/transport/httpapi/handlers_workspace_test.go`
  - `TestWorkspaceCloseLastTabReturnsBadRequest` currently asserts `400` for the final close

## Why the current behavior blocks parity

The Tide reference does not prevent the final close.

Instead, Tide:

- allows the final close request through
- leaves the workspace with no active tab
- avoids hidden fallback tab creation
- exposes an explicit empty-workspace surface

The current repo blocks that path before the empty-workspace state can exist.

## Additional mismatch beyond the close guard

Even if the current close guard were removed, persistence would still block parity.

Source evidence:

- `core/workspace/store.go`
  - `normalizeSnapshot(...)` currently falls back to `BootstrapDefault()` when `len(normalized.Tabs) == 0`
- `frontend/app/state/workspace.store.ts`
  - `setState(...)` only writes `atoms.staticTabId` when `nextActive.activetabid` is truthy, which would leave a stale active tab id after a valid empty-workspace transition

This means the current implementation is mismatched in two places:

1. it rejects the last close
2. it cannot preserve the resulting empty-workspace state correctly across UI updates and reload

## Expected behavior vs current behavior

Expected from Tide:

- closing the last tab succeeds
- `active_tab_id` becomes empty
- no hidden tab is created
- the shell shows an explicit `No Active Tab` state
- the operator can explicitly create a new tab again
- persisted state can remain tabless without being rewritten into a fallback workspace

Current repo behavior:

- closing the last tab fails with `cannot close last tab`
- the empty-workspace state cannot be reached
- persisted zero-tab snapshots are normalized back to `BootstrapDefault()`
- frontend static active-tab state would remain stale if an empty snapshot were ever delivered

## Release-blocking gap summary

This is a release-blocking parity gap because the active shell already contains the Tide-style `No Active Tab` rendering path, but the backend and persistence layers prevent the product from reaching it truthfully.
