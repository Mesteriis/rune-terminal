# Frontend Stabilization Baseline (Slice 1)

Date: 2026-04-15

## Commands Executed

- `npm --prefix frontend run build`
- `npx tsc -p frontend/tsconfig.json --noEmit`
- `npm --prefix frontend run lint`
- `npm run tauri:dev` (attempted with non-interactive launch check)

## Command Outcomes

- `npm --prefix frontend run build` failed with TypeScript and build-blocking type errors (1,599 output lines; 2,658 log lines including duplicates and repeated context).
- `npx tsc -p frontend/tsconfig.json --noEmit` failed immediately in this workspace because `typescript` is not installed at repo root (`npx` could not resolve `tsc`).
- `npm --prefix frontend run lint` failed with ESLint flat-config shape error before any file linting.
- `npm run tauri:dev` launched the front-end server and Tauri runtime process, and printed a running backend process id, but was not used as a long-running human-verified smoke test in this slice.

## Failure Categories

- Tooling/configuration failures
  - ESLint config object format mismatch for flat config (`plugins` array form), preventing lint from starting.
  - Frontend tsconfig path aliases resolve old imports in a way that breaks many `@/...` module imports.
  - `npx tsc` command path/tooling is currently a root-layer command-line mismatch (TypeScript not available via `npx` at repo root).

- Missing types / module resolution failures
  - Missing dependency/module: `@ai-sdk/react`.
  - Missing type declarations for `ws`, `css-tree`, and `throttle-debounce` in current dependency graph.
  - `@/store`, `@/element`, `@/view`, etc import paths failing because of alias config shape.

- Type-system strictness blockers
  - Broad strictness and config-driven type rules currently emit many errors across migrated and legacy slices (`verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`, `noUnusedParameters`, etc.).
  - Multiple nullability/null-check and null-to-non-null mismatches in bootstrap-adjacent paths (e.g. `wave.ts`, layout state wiring, modal/workspace models).

- Migration seam fallout
  - Layout/workspace/panel modules and AI bootstrap files show additional type and API drift (including `react-resizable-panels` import/type assumptions) that are adjacent to migrated seams.

## In Scope for Slice 1

- Stabilize command bootstrap for frontend lint/build/typecheck verification.
- Fix ESLint flat-config shape issue.
- Fix resolver/path config blockers for migrated import aliases.
- Address missing dependency/type declaration blockers where they are hard failures.
- Triage and prioritize highest-value TypeScript failures in app bootstrap and active runtime/workspace flow.

## Deferred (Out of Scope)

- Full legacy typing cleanup across all old terminal/layout/term/model surfaces.
- Broad UI/feature refactors unrelated to compilation correctness.
- Plugin runtime implementation work (explicitly deferred by scope).
- Deep architectural cleanup to remove all pre-existing hidden strictness debt in non-bootstrap surfaces.
