# Runtime Truth Cleanup Baseline

## Remaining legacy-truth leaks

1. `frontend/runtime/config.ts` still auto-resolves API base from legacy `WAVE_SERVER_WEB_ENDPOINT`.
- Why it exists: old browser-compat bootstrap support.
- Active impact: not used in normal Tauri/dev path when `runtime_info` or `VITE_RTERM_API_BASE` is present.
- Leak type: active runtime contract still silently accepts legacy env shape.

2. `frontend/runtime/config.ts` still auto-falls back to `window.location.origin`.
- Why it exists: historical convenience fallback for browser-only startup.
- Active impact: can create misleading same-origin API calls when runtime env is misconfigured.
- Leak type: fallback assumption can appear as valid runtime truth instead of explicit opt-in fallback.

## Slice boundary

- No broad runtime/frontend rewrite.
- No new features.
- No cleanup outside transport/runtime truth seams.
