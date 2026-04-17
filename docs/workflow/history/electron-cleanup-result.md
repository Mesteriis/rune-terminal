# Electron / Legacy Frontend Cleanup Result

## 1. What Electron references were found

- Runtime code paths:
  - `frontend/app/view/webview/webview.tsx` (`WebviewTag` typing)
  - `frontend/util/fetchutil.ts` (legacy Electron net fallback logic)
  - `frontend/wave.ts` (legacy browser-compat fallback bootstrap)
- Package references:
  - `frontend/package.json`
  - `frontend/package-lock.json`
- Type-level bridge contracts:
  - `frontend/types/custom.d.ts` and related store/runtime files using `ElectronApi` / `Electron.*` types

## 2. What was removed

- Direct runtime import pressure from Electron in active frontend path:
  - `webview.tsx` now uses `import type` for `WebviewTag` (type-only import)
- Implicit Electron net fallback behavior:
  - `fetchutil.ts` no longer attempts Electron net by default
  - legacy Electron net loading is now explicit opt-in only
- Legacy naming ambiguity in startup:
  - browser fallback functions in `wave.ts` are now explicitly named as legacy fallback path

## 3. What was kept

- `electron` package was kept, but moved to `devDependencies` only.
- `ElectronApi`/`Electron.*` type contracts were kept (current codebase still uses these types).
- Legacy browser-compat startup branch in `wave.ts` was kept for no-preload environments.

## 4. Why remaining fallback still exists

- The repository still carries legacy compatibility seams from TideTerm migration.
- Some frontend types and webview typings still rely on Electron type definitions.
- A constrained Electron net path is retained only for explicit non-browser legacy scenarios (`RTERM_ENABLE_LEGACY_ELECTRON_NET=1`), not for normal Tauri runtime.

## 5. Is active runtime now cleanly Tauri-first?

- Yes for the active desktop/dev shell path:
  - Tauri preload-backed startup remains the default branch
  - active frontend build no longer emits the previous Vite browser-compat warning from `electron/index.js`
  - terminal/tools/audit/AI panels remained functional in live validation
