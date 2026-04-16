# Structured Execution Regression Baseline

Date: `2026-04-17`  
Scope: `corrective slice only`

## Reproduction steps (headed, real UI)

1. Start live runtime stack:
   - core API with auth token
   - frontend dev server
   - Ollama-compatible provider stub
2. Open the app in a visible headed browser at `http://127.0.0.1:4179/`.
3. From the right utility rail, click `Tools`.
4. Observe frontend crash loop:
   - `The result of getSnapshot should be cached to avoid an infinite loop`
   - `Maximum update depth exceeded`
5. Reload and click `Audit`.
6. Observe the same error chain and crash behavior.

## Exact component path

- Error boundary points to: `<ToolsFloatingWindow>`
- Relevant path:
  - `frontend/app/workspace/tools-floating-window.tsx`
  - `useActiveWorkspaceContext()` from `frontend/app/workspace/active-context.ts`
  - `useSyncExternalStore(subscribeActiveWorkspaceContext, getActiveWorkspaceContext, ...)`

## Root cause classification

Classification: `prop/state identity churn` + `store feedback loop trigger` in `useSyncExternalStore`.

Root cause details:
- `getActiveWorkspaceContext()` always returns a newly allocated object, even when workspace/file context did not change.
- `workspaceStore.getSnapshot()` also returns freshly cloned objects on each call.
- In `useSyncExternalStore`, non-stable snapshot identity causes React to treat every render as a changed snapshot and re-render repeatedly.
- Re-render loop manifests as `Maximum update depth exceeded`, surfaced under `ToolsFloatingWindow`.
- `Audit` action reproduces because `ToolsFloatingWindow` stays mounted in the shell utility tree and still evaluates the unstable hook path when panel state changes.

## Strict boundary for this corrective slice

- no new feature work
- no shell redesign
- no tools/audit redesign
- no structured execution behavior rollback
- only remove the real update-loop regression cause and re-validate affected flows
