# Electron / Legacy Frontend Cleanup Baseline

## Remaining Electron-related references

| Reference | Files | Classification | Path |
| --- | --- | --- | --- |
| Runtime dependency declaration (`electron`) | `frontend/package.json`, `frontend/package-lock.json` | `ACTIVE REQUIRED` (current package state before cleanup) | build/runtime packaging |
| Direct runtime import from `electron` (`WebviewTag`) | `frontend/app/view/webview/webview.tsx` | `ACTIVE REQUIRED` (webview block typing and API surface) | runtime + build |
| Dynamic `import("electron")` net fallback | `frontend/util/fetchutil.ts` | `LEGACY FALLBACK` | runtime + build |
| Preload bridge contract named `ElectronApi` | `frontend/types/custom.d.ts`, `frontend/app/store/global.ts`, `frontend/util/getenv.ts`, `frontend/wave.ts` | `ACTIVE REQUIRED` (host bridge contract used by current shell) | runtime + type/build |
| Legacy browser-compat bootstrap creating Electron-shaped stub API | `frontend/wave.ts` (`createBrowserElectronApi`, `initBrowserCompatRuntime`) | `LEGACY FALLBACK` | runtime |
| Electron-only text/comments in app content | `frontend/app/onboarding/fakechat.tsx`, `frontend/app/i18n/i18n-core.ts`, `frontend/layout/lib/TileLayout.tsx`, `frontend/layout/lib/types.ts` | `DEAD / STALE` (descriptive text/comments only) | source/docs text |
| Type-level Electron namespace usage (`Electron.Point`, `Electron.Rectangle`, `ElectronContextMenuItem`) | `frontend/types/custom.d.ts`, `frontend/app/store/*`, `frontend/app/view/webview/webview.tsx` | `ACTIVE REQUIRED` (typing only) | type/build |
| Test-only Electron usage | no direct import found under test files | `TEST-ONLY` = none currently | test |

## Slice boundary

- No broad frontend cleanup
- No redesign
- No feature work
