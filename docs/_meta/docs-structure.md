# Documentation Structure Plan

Date: `2026-04-17`

## Target hierarchy

```text
docs/
  README.md
  architecture/
  execution/
  workspace/
  remote/
  mcp/
  plugins/
  ui/
  workflow/
  parity/
  validation/
  _meta/
```

## Mapping rules

1. Place each doc in exactly one primary domain directory.
2. Keep ADRs under `docs/architecture/adr/`.
3. Keep release-control and planning docs under `docs/workflow/`.
4. Keep parity artifacts only in `docs/parity/`.
5. Keep validation evidence and domain validation docs only in `docs/validation/`.
6. Move baseline/result historical slices into `domain/history/` and keep them readable.
7. Use `OUTDATED — DO NOT USE` header on historical docs that no longer define current behavior.
8. Preserve content during moves; do not rewrite behavior during the hierarchy pass.

## Naming conventions

1. Canonical docs use stable names:
   - `system.md`, `*-model.md`, `*-runtime.md`, `surfaces.md`, `operator-workflow.md`.
2. Validation docs use domain names:
   - `execution.md`, `workspace.md`, `remote.md`, `mcp.md`, `plugins.md`, `workflow.md`, `ui.md`.
3. Parity docs use:
   - `parity-matrix.md`, `gap-summary.md`.
4. Historical snapshots use:
   - `history/<topic>-baseline.md`
   - `history/<topic>-result.md`
5. Avoid ambiguous prefixes like `frontend-` unless the domain is specifically UI behavior.

## Canonical document rule

Each domain has exactly one canonical entrypoint that reflects current truth and links to supporting docs:

- `architecture/system.md`
- `execution/execution-model.md`
- `workspace/workspace-model.md`
- `remote/remote-model.md`
- `mcp/mcp-model.md`
- `plugins/plugin-runtime.md`
- `ui/surfaces.md`
- `workflow/operator-workflow.md`
- `parity/parity-matrix.md`
- `validation/<domain>.md` (domain-specific validation truth)

Supporting docs may exist, but canonical docs are the primary source for current behavior and release decisions.
