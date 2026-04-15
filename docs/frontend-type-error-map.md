# Frontend TypeScript Error Map (Slice 2, Phase 1)

Date: 2026-04-15

## Command Executed

- `npx tsc -p frontend/tsconfig.json --noEmit`

## Command Outcome

- Exit code: `2`
- Diagnostics: `2423` raw lines captured in `/tmp/tsc_frontend.txt`

## Error Category Classification

- **Import/export mismatch**
  - Primary signal: `TS1484` (`type` imports needed under `verbatimModuleSyntax`) and `TS2305` style export/import drift.
  - Main volume driver and largely mechanical.
  - Count: `183` (`TS1484`) + `6` (`TS2305`) = `189`

- **Missing type declarations/contracts**
  - Missing type modules (`TS7016`) and partial object index typings (`TS7053`), plus occasional structural mismatch with expected transport/config DTOs.
  - Count: `8` (`TS7016`) + `46` (`TS7053`) = `54`

- **Incompatible/invalid types**
  - Nullability and assignability errors (`TS2345`, `TS2322`, `TS18048`, `TS18047`, `TS2532`, etc.) plus overload/shape mismatches (`TS2352`, `TS2353`, `TS2769`).
  - Count: `1037` (majority of failures).

- **Config/shape blockers**
  - `TS1294` failures caused by unsupported `import()`-type syntax usage under `erasableSyntaxOnly`.
  - Count: `15`

- **Legacy code assumptions / strictness debt**
  - `TS6133` unused locals/params, implicit `any` (`TS7006`, `TS7031`), possibly uninitialized values (`TS2454`), etc.
  - Count: `196` (`TS6133 155 + TS7006 19 + TS7031 5 + TS2454 6 + TS7005 7`)

## Top 5 Highest-Frequency Error Groups

1. Incompatible/invalid types (`~1037`)
2. Legacy strictness assumptions (`196`)
3. Import/export mismatch (`189`)
4. Missing type declarations/contracts (`54`)
5. Config/shape blockers (`15`)

## Surface Impact Mapping

- **Runtime (runtime/**)**
  - Not currently represented in TypeScript diagnostics because `frontend/runtime` is not part of `frontend/tsconfig.json` `include`.
  - This is a validation gap for this slice.

- **API seams (rterm-api/**, compat/)**
  - `frontend/rterm-api/**`: `10` diagnostics
  - `frontend/compat/**`: `1` diagnostic
  - Main issue: `TS1294` on client files (config syntax flag interaction) and one API/compat unused declaration warning.

- **Terminal path (app/view/term, store term hooks)**
  - Concentrated in `frontend/app/view/term` and terminal-related store/wrapper usage.
  - Representative files: `frontend/app/view/term/term-model.ts (32)`, `frontend/app/view/term/term.tsx (28)`, `frontend/app/view/term/termwrap.ts (13)`, `frontend/app/view/term/termsticker.tsx (15)`.
  - Approximate direct terminal-facing errors: `~95`

- **Workspace path**
  - `frontend/app/workspace` direct errors: `16`
  - Additional workspace-related wiring in `frontend/app/tab/workspaceswitcher.tsx (10)` and workspace client/store interactions.

## Categories to Address in Slice 2

- In scope for this slice:
  - Incompatible/invalid types
  - Import/export mismatch
  - Config/shape blockers
  - Runtime/API seam blockers that block build/type health
- Deferred:
  - Broad legacy strictness debt outside active bootstrap/runtime paths (large AI panel/block/layout clusters and generic `noUnused*` cleanup).
- Deferred areas intentionally include non-critical style/UX, test surfaces, and non-startup legacy modules.
