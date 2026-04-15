# Active Path API Import Audit (Slice 3.1)

## Files checked

- `frontend/app/tab/tab.scss`
- `frontend/app/tab/tab.tsx`
- `frontend/app/tab/tabbar.tsx`
- `frontend/app/tab/tabbar-model.ts`
- `frontend/app/tab/tabbar.scss`
- `frontend/app/tab/tabcontent.tsx`
- `frontend/app/tab/workspaceeditor.scss`
- `frontend/app/tab/workspaceeditor.tsx`
- `frontend/app/tab/workspaceswitcher.scss`
- `frontend/app/tab/workspaceswitcher.tsx`
- `frontend/app/tab/updatebanner.tsx`
- `frontend/app/view/term/fitaddon.ts`
- `frontend/app/view/term/ijson.tsx`
- `frontend/app/view/term/shellblocking.ts`
- `frontend/app/view/term/term-model.ts`
- `frontend/app/view/term/term-wsh.tsx`
- `frontend/app/view/term/term.scss`
- `frontend/app/view/term/termtheme.ts`
- `frontend/app/view/term/term.tsx`
- `frontend/app/view/term/termutil.ts`
- `frontend/app/view/term/termwrap.ts`
- `frontend/app/view/term/termsticker.tsx`
- `frontend/app/view/term/xterm.css`
- `frontend/app/workspace/widgets.tsx`
- `frontend/app/workspace/workspace-layout-model.ts`
- `frontend/app/workspace/workspace.tsx`

## Forbidden-import check result

Ran: `rg -n "rterm-api/http/client|compat/api" frontend/app/tab frontend/app/workspace frontend/app/view/term`

Result: **No matches**.

## Direct API-call assessment

- No active file imports `frontend/rterm-api/http/client` or `frontend/compat/api` directly.
- No active file imports `frontend/rterm-api/http` client entrypoints directly.
- No active file imports `frontend/compat` API entrypoints directly.

### What still performs terminal/workspace calls in this slice

There are existing legacy `RpcApi` (`frontend/app/store/wshclientapi`) calls inside active terminal/workspace UI modules.
These are explicitly outside the requested Slice-3.1 forbidden set and remain to be migrated under later terminal/workspace slices.

## Allowed API access boundary for this slice

- Store-backed terminal path (for active terminal streaming/fallback):
  - `frontend/app/state/terminal.store.ts`
  - `frontend/compat/terminal.ts`
  - `frontend/rterm-api/terminal/*`
- Store-backed workspace path used by active tab/workspace orchestration:
  - `frontend/app/state/workspace.store.ts`
  - `frontend/compat/workspace.ts`

## Hard enforcement status

Enforced by script:

- `scripts/check-active-path-api-imports.sh`
  - scans only `frontend/app/tab`, `frontend/app/workspace`, `frontend/app/view/term`
  - fails if any import matches `rterm-api/http/client` or `compat/api`
