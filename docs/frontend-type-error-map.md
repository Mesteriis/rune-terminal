# Frontend TypeScript Error Map (Slice 2, Phase 1)

Date: 2026-04-15

## Command Executed

- `npx tsc -p frontend/tsconfig.json --noEmit`

## Command Outcome

- Exit code: `2`
- Diagnostics: `1899` raw lines captured in `/tmp/tsc_slice2_current.txt`

## Error Category Classification

- **Import/export mismatch**
  - Primary signal: package/API drift such as `react-resizable-panels` symbol changes (`TS2305`, `TS2724`).
  - Count: `8`

- **Missing type declarations/contracts**
  - Missing type modules (`TS7016`) and partial object index typings (`TS7053`), plus a few DTO contract mismatches around websocket/event/meta helpers.
  - Count: `54` (`TS7016 8 + TS7053 46`)

- **Incompatible/invalid types**
  - Nullability and assignability errors (`TS2322`, `TS2345`, `TS18048`, `TS18047`, `TS2532`, etc.) plus overload/shape mismatches (`TS2352`, `TS2353`, `TS2769`).
  - Count: `~898` (`TS2322 325 + TS2345 273 + TS18048 116 + TS18047 38 + TS2532 13 + TS2352 15 + TS2353 3 + TS2769 17 + remaining smaller variants`)

- **Legacy code assumptions**
  - Unused locals/params, not-definitely-assigned fields, and implicit `any` callbacks.
  - Count: `~200` (`TS6133 155 + TS2564 26 + TS7006 19`)

- **Migration seam fallout**
  - Runtime-facing files still carrying legacy assumptions through typed seams: websocket lifecycle, RPC streaming, AI transport version skew, and workspace layout adapter drift.
  - Highest-signal files:
    - `frontend/app/store/ws.ts`
    - `frontend/app/store/wps.ts`
    - `frontend/app/store/wshclient.ts`
    - `frontend/app/workspace/workspace-layout-model.ts`
    - `frontend/app/workspace/workspace.tsx`
    - `frontend/builder/builder-workspace.tsx`

- **Config issues**
  - Not the dominant current problem.
  - The previous `verbatimModuleSyntax` / `erasableSyntaxOnly` blockers are already reduced; current config issues are secondary to source typing errors.

## Top 5 Highest-Frequency Error Groups

1. Incompatible/invalid types (`~898`)
2. Legacy code assumptions (`~200`)
3. Missing type declarations/contracts (`54`)
4. Import/export mismatch (`8`)
5. Config issues (`low residual volume`)

## Surface Impact Mapping

- **Runtime (runtime/**)**
  - Not currently represented in TypeScript diagnostics because `frontend/runtime` is not part of `frontend/tsconfig.json` `include`.
  - This is a validation gap for this slice.

- **API seams (rterm-api/**, compat/)**
  - `frontend/rterm-api/**`: currently not a major direct error source.
  - `frontend/compat/**`: existing touched seam is low-noise.
  - Main active issue is not the typed client layer itself; it is the runtime caller/adaptor layer that feeds it.

- **Terminal path (app/view/term, store term hooks)**
  - Concentrated in `frontend/app/view/term` and terminal-related store/wrapper usage.
  - Representative files:
    - `frontend/app/view/term/term-model.ts (31)`
    - `frontend/app/view/term/term.tsx (27)`
    - `frontend/app/view/term/termwrap.ts (13)`
    - `frontend/app/view/term/termsticker.tsx (15)`
  - Approximate direct terminal-facing errors: `~86`

- **Workspace path**
  - `frontend/app/workspace` direct errors: `14`
  - Additional workspace/layout-adjacent wiring in:
    - `frontend/builder/builder-workspace.tsx (3)`
    - `frontend/layout/lib/layoutModel.ts (63)`
    - `frontend/layout/lib/layoutTree.ts (47)`
    - `frontend/app/tab/workspaceswitcher.tsx (8)`

## Categories to Address in Slice 2

- In scope for this slice:
  - Incompatible/invalid types
  - Import/export mismatch on active paths
  - Runtime/API seam blockers that block build/type health
  - Workspace/terminal/build blockers in active paths
- Deferred:
  - Broad legacy strictness debt outside active bootstrap/runtime paths.
  - High-volume legacy clusters still outside the narrow slice:
    - `frontend/app/block/*`
    - `frontend/app/view/preview/*`
    - `frontend/app/view/vdom/*`
    - `frontend/app/tab/tabbar.tsx`
    - large portions of `frontend/layout/lib/layoutModel.ts` after seam-critical fixes
- Deferred areas intentionally include builder/proxy breadth, non-critical AI UX debt, and broad `noUnused*` cleanup.
