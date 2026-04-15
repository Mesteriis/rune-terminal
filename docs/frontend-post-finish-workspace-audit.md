# Workspace Legacy Call Audit (Post-Finish, Global Store)

## createTab()
- Classification: dead
- Evidence:
  - Defined only in `frontend/app/store/global.ts:800`.
  - No remaining callsites outside that file in `frontend/app/**` after migration.
- Required correction: remove (done).

## setActiveTab(tabId: string)
- Classification: dead
- Evidence:
  - Defined only in `frontend/app/store/global.ts:804`.
  - No remaining callsites outside that file in `frontend/app/**` after migration.
- Required correction: remove (done).

## getApi workspace/tab call equivalents in global.ts
- `setActiveTab` and `createTab` were the only legacy workspace/tab forwarding methods in `global.ts`.
- Required correction: remove dead legacy wrappers to avoid presenting `global.ts` as active workspace truth.
