# Active Path API Guardrails (Slice 3.1)

## Guardrail choice

Added a small grep-based check targeting only the active UI slices:

- `scripts/check-active-path-api-imports.sh`

## Rule

- For `frontend/app/tab`, `frontend/app/workspace`, `frontend/app/view/term`, fail if any file imports:
  - `rterm-api/http/client`
  - `compat/api`

## Enforcement

- Script command:

```bash
npm run check:active-path-api
```

- Script output on pass:

```bash
Active UI API import guard passed: no direct rterm-api/http/client or compat/api imports in app/tab, app/workspace, app/view/term
```

## Why this guardrail

- Keeps active UI flow aligned with the store-first terminal/bootstrap and workspace boundaries used in Slice 3.
- Prevents accidental regression where active components bypass store/facade layers and import typed API modules directly.

## Scope note

- This guardrail intentionally only blocks the requested direct API imports.
- Existing legacy websocket command calls (`RpcApi`) are tracked separately as part of earlier migration slices and are not part of this guardrail.
