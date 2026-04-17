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
- `tauri:check`: `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`
- `validate`: `npm run lint:frontend && npm run build:frontend && npm run test:go && npm run build:go && npm run tauri:check`

### Frontend scripts / configs under `frontend/`

- `frontend` has local toolchain files now:
  - `package.json` (`dev`, `build`, `lint`, `preview`)
  - `tsconfig.json`
  - `vite.config.ts`

### Tauri integration

- `apps/desktop/src-tauri/tauri.conf.json` points to:
  - `build.frontendDist`: `../../frontend/dist`
  - `build.devUrl`: `http://127.0.0.1:5173`

## 3) MISMATCHES

1. `README` and several docs still describe `frontend/tideterm-src` and `frontend/tideterm-src-meta` as active repository structure items, but those snapshot directories are optional import outputs, not always present.
2. `scripts/import-tideterm-frontend.sh` points to snapshot targets under `frontend/tideterm-src` and `frontend/tideterm-src-meta`, which are optional and not the active runtime source.

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
