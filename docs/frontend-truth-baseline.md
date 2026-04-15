# Frontend Truth Baseline Snapshot (Slice 1)

## 1) CURRENT FRONTEND STRUCTURE

```text
frontend
frontend/app
frontend/app/aipanel
frontend/app/element
frontend/app/hook
frontend/app/i18n
frontend/app/modals
frontend/app/notification
frontend/app/onboarding
frontend/app/suggestion
frontend/app/tab
frontend/app/workspace
frontend/app/view
frontend/app/window
frontend/app/block
frontend/app/store
frontend/app/shadcn
frontend/app/shadcn/lib
frontend/builder
frontend/builder/store
frontend/builder/tabs
frontend/builder/utils
frontend/layout
frontend/layout/lib
frontend/layout/tests
frontend/types
frontend/util
frontend/tailwindsetup.css
frontend/wave.ts
```

This tree is the current canonical frontend source under `frontend/` and is used for runtime wiring.

## 2) TOOLCHAIN STATE

### Root scripts (`package.json`)

- `import:tideterm-frontend`: `./scripts/import-tideterm-frontend.sh`
- `dev:frontend`: `npm --prefix frontend run dev`
- `build:frontend`: `npm --prefix frontend run build`
- `lint:frontend`: `npm --prefix frontend run lint`
- `build:core`: `./scripts/build-core.sh`
- `test:go`: `./scripts/go.sh test ./cmd/... ./core/... ./internal/...`
- `build:go`: `./scripts/go.sh build ./cmd/... ./core/... ./internal/...`
- `tauri:dev`: `./scripts/tauri-dev.sh`
- `tauri:build`: `npm exec tauri -- build --config apps/desktop/src-tauri/tauri.conf.json`
- `tauri:check`: `cargo check --manifest-dir apps/desktop/src-tauri/Cargo.toml`
- `validate`: `npm run lint:frontend && npm run build:frontend && npm run test:go && npm run build:go && npm run tauri:check`

### Frontend scripts / configs under `frontend/`

- `frontend` currently has no `package.json`, no `vite.config.ts`, and no `tsconfig.json`.
- No frontend-local npm scripts are currently runnable without adding the required frontend toolchain files.

### Tauri integration

- `apps/desktop/src-tauri/tauri.conf.json` points to:
  - `build.frontendDist`: `../../frontend/dist`
  - `build.devUrl`: `http://127.0.0.1:5173`

## 3) MISMATCHES

1. Root frontend scripts point at `npm --prefix frontend run ...`, but `frontend/` lacks required toolchain entry files.
2. README still documents `frontend/tideterm-src` and `frontend/tideterm-src-meta` as active repository layout items, but they are not present in the checked-out tree.
3. The frontend tree contains files moved into `frontend/app`, `frontend/layout`, `frontend/util`, `frontend/builder`, `frontend/types`, `frontend/wave.ts`, but there is no documented package entry matching this layout.
4. Current bootstrap command (`scripts/tauri-dev.sh`) expects frontend dependencies installed in `frontend/node_modules`, but that directory is not buildable from current frontend files because the npm project file is missing.

## 4) FROZEN ZONES

- `frontend/app/**`
- `frontend/layout/**`
- `frontend/view/**` (logical legacy slice label; current shell views are under `frontend/app/view/**`)
- styles in `frontend/**/*.css`, `frontend/**/*.scss`, and `frontend/tailwindsetup.css`
- `old_front/**` (kept as legacy baseline; not part of this slice)

## 5) WHAT IS NOT IN THIS SLICE

- API client implementation
- runtime adapter implementation
- terminal migration or terminal/workspace logic
- broader core behavior changes
- frontend UI redesign or store refactors
