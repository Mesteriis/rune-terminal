# Operator Workflow

Date: `2026-04-17`
Phase: stability hardening

## What this document is

This is the canonical workflow entrypoint for daily-driver operator flow and release controls.

## Active workflow chain

1. Open/focus terminal and workspace context.
2. Use explicit actions for file/path/context handoff (`Files -> AI` or `Files -> /run`).
3. Execute through explicit commands/tools (`/run`, tool execute, MCP invoke).
4. Confirm approvals when required (`safety.confirm` flow).
5. Verify outcomes through terminal output, execution blocks, and audit entries.

## Workflow principles

- Explicit action over hidden automation.
- Backend-owned execution/policy/audit truth.
- Explicit context handoff for files, widget target, and remote target.
- MCP results stay explicit/manual before conversation usage.

## Release control workflow

- Release gate command: `npm run validate`
- Desktop smoke: `npm run tauri:dev`
- Non-blocking debt remains tracked explicitly (for example full-frontend lint debt).

## Current limits

- Workflow automation remains intentionally narrow.
- Remote workflow confidence is still focused and not full controller parity.
- Some advanced shell flows remain post-`1.0.0` scope.

## Deep links

- Release truth: [release-1.0.md](./release-1.0.md)
- Release checklist: [release-checklist-1.0.md](./release-checklist-1.0.md)
- Known limitations: [known-limitations.md](./known-limitations.md)
- Quick actions validation: [quick-actions-browser-validation.md](./quick-actions-browser-validation.md)
- Workflow history: [history/operator-workflow-baseline.md](./history/operator-workflow-baseline.md), [history/operator-workflow-result.md](./history/operator-workflow-result.md)
