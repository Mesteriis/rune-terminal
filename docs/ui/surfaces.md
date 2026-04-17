# UI Surfaces

Date: `2026-04-17`
Phase: `1.0.0-rc1` hardening

## What this document is

This is the canonical UI entrypoint for active user-facing surfaces.

## Primary surfaces

- Top shell and tab bar (tab lifecycle, focus, pinning, reorder).
- Main terminal stage (snapshot + stream, focus, interrupt, clear, jump-to-latest).
- Left AI panel (conversation, explicit `/run`, explain integration).
- Right utility rail and flyouts (launcher, files, tools, audit, settings/help).

## Secondary/operator surfaces

- Files panel:
  - bounded listing and preview
  - explicit path handoff actions for AI and `/run`
- Tools panel:
  - explicit execution input helpers (`Use Selected File Path`, `Use Active Widget`)
  - explicit execute action (no auto-run)
- MCP controls and audit panels:
  - explicit lifecycle/invoke actions
  - no implicit context auto-injection

## UI boundary rules

- UI reads and writes explicit backend APIs; it does not own backend semantics.
- Approval, policy, audit, execution, and runtime truth remain backend-owned.
- Cross-surface handoffs are explicit action clicks, not hidden automation.

## Release-scope limits

- Shell/terminal parity remains practical but incomplete versus full TideTerm breadth.
- No broad redesign beyond parity/hardening slices.
- Some historical frontend migration docs are archived under `ui/history`.

## Deep links

- API/adapter docs: [frontend-api-contract.md](./frontend-api-contract.md), [frontend-runtime-adapter-usage.md](./frontend-runtime-adapter-usage.md)
- Terminal/runtime slice notes: [frontend-compat-terminal-runtime-slice.md](./frontend-compat-terminal-runtime-slice.md), [frontend-terminal-action-model.md](./frontend-terminal-action-model.md)
- UI recovery docs: [frontend-ui-recovery-confirmation.md](./frontend-ui-recovery-confirmation.md), [frontend-ui-recovery-state-flow.md](./frontend-ui-recovery-state-flow.md)
- Archived UI slices: [history/](./history)
