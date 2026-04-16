# Legacy `/wave/service` Noise Baseline

## 1. Exact callsite(s)

- Primary noise source in active compat shell path:
  - `frontend/app/state/workspace.store.ts`
  - constructor `subscribeToSourceEvents()` registers:
    - `globalStore.sub(atoms.workspace, this.handleGlobalWorkspaceUpdate)`
- `atoms.workspace` is defined in `frontend/app/store/global.ts` and resolves via legacy WOS object reads:
  - `WOS.getObjectValue("window:<id>")`
  - `WOS.getObjectValue("workspace:<id>")`
- WOS object reads call `POST /wave/service?service=object&method=GetObject` in:
  - `frontend/app/store/wos.ts` (`callBackendService`).

## 2. Why the request still happens

- `workspaceStore` subscribes to `atoms.workspace` eagerly at construction time.
- In compat runtime, workspace truth comes from `/api/v1/workspace` and `workspaceStore.refresh()`, but the legacy atom subscription is still created.
- That subscription pulls legacy WOS path, which emits `/wave/service` `401` noise because active compat backend path does not use/serve that contract for normal operation.

## 3. Active-path relevance vs legacy noise

- For the active compat shell path this request is legacy noise, not required runtime behavior.
- For legacy TideTerm-native path the subscription can still be useful for legacy object updates.

## 4. Strict slice boundary

- No broad frontend cleanup.
- No UI redesign.
- No unrelated runtime changes.
