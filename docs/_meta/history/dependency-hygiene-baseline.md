# Dependency and Limitation Baseline

## Heavy suspect dependencies

- `electron`
  - present in `frontend/package.json`
  - still referenced in repo code (`frontend/app/view/webview/webview.tsx`, `frontend/util/fetchutil.ts`, `frontend/wave.ts`)
  - not part of the active Tauri path, but not honestly removable in a narrow slice while those imports remain
- `vitest`
  - present in `frontend/package.json` runtime `dependencies`
  - used for test execution only
- `@types/ws`
  - present in `frontend/package.json` runtime `dependencies`
  - type-only support for `frontend/util/wsutil.ts`
- `@types/css-tree`
  - present in `frontend/package.json` runtime `dependencies`
  - type-only support
- `@types/throttle-debounce`
  - present in `frontend/package.json` runtime `dependencies`
  - type-only support

## Usage classification

- `electron`: referenced, so not stale enough to delete in this slice
- `vitest`: test-only
- `@types/ws`: build/type-only
- `@types/css-tree`: build/type-only
- `@types/throttle-debounce`: build/type-only

## Current provider/runtime limitation truth

- The active conversation backend is Ollama-compatible HTTP only.
- Assistant output is non-streaming.
- Validation often uses Ollama-compatible stubs to verify contract wiring, not model quality.
- There is no honest basis to claim a broad provider matrix or generalized cloud-provider support in `1.0.0-rc1`.

## Slice boundary

- No broad frontend cleanup
- No provider implementation expansion
- No feature work
