# Approval Continuity Hardening Baseline

## 1. Current continuity behavior matrix

| Scenario | `/run` approval continuity | Tools panel approval continuity | Notes |
| --- | --- | --- | --- |
| Panel close/open (same page session) | Works | Works | Frontend restores from in-memory `continuity.ts` maps. |
| Tab switch (same running session) | Usually works | Usually works | State is app-session global, not strictly scoped to active workspace/tab context. |
| Panel remount (without full reload) | Works | Works | Rehydration from module-level maps, not component-local state only. |
| Full page reload | Lost | Lost | In-memory maps are reset; no persistence layer by design. |
| Core restart (without page reload) | Stale frontend state remains, confirm fails | Stale frontend state remains, confirm fails | Backend `approvalStore` is in-memory, so pending/grants are dropped on restart. |

## 2. Exact weak points

- Pending approval maps are global in-memory session state and not explicitly scoped for selection by active workspace context.
- Stale approvals after backend restart are not proactively evicted; UI can retain dead pending entries until user retries and gets an error.
- No durable continuity across full reload/core restart (expected in current architecture, but must remain explicit and not implied).

## 3. Strict slice boundary

- No persistence store.
- No DB/session subsystem.
- No approval UX redesign.
