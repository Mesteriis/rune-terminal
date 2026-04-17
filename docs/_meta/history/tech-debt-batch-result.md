# Tech Debt Batch Result

## 1. Noise removed

- Active compat shell path no longer triggers legacy `/wave/service` probing from workspace subscription startup.
- Runtime validation run for the active path observed no `/wave/service` requests and no new console errors.

## 2. Approval continuity improved

- Pending approval context is now workspace-scoped and kept outside fragile component-local state for both AI `/run` and Tools flows.
- Panel close/open and tab switching keep pending approval context in the same frontend session.
- Stale approvals after core restart are now handled explicitly:
  - stale confirm responses clear pending approval context
  - user receives explicit stale-approval error instead of a silently stuck retry card

## 3. Runtime truth tightened

- Non-Tauri runtime config no longer silently falls through legacy `WAVE_SERVER_WEB_ENDPOINT` or `window.location.origin` by default.
- Legacy runtime fallback remains available only through explicit opt-in:
  - `VITE_RTERM_ENABLE_LEGACY_RUNTIME_FALLBACK=1`
- Active path remains Tauri/dev-contract first (`runtime_info` or `VITE_RTERM_API_BASE`).

## 4. Intentionally deferred

- No persistence subsystem was added for approvals.
- No approval UX redesign was introduced.
- No broad runtime/bootstrap architecture rewrite was performed.

## 5. Persistence truth statement

- Pending approvals are still **non-persistent** across full frontend reloads or core restarts.
- This batch hardens in-memory continuity and stale-handling semantics only.
