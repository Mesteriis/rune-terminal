# Frontend Compat Modal Parity Slice

Date: `2026-04-15`

Scope of this slice:

- restore the active compat AI interface trigger/render path
- restore the active compat settings floating menu trigger/render path
- isolate legacy WOS reads that were still leaking into the compat AI open path
- keep the fix limited to the active visible runtime path

What was broken:

- the `AI` trigger in `frontend/app/tab/tabbar.tsx` toggled `WorkspaceLayoutModel`, but `frontend/app/workspace/workspace.tsx` still cut the compat render path away from the real AI panel lifecycle
- the settings trigger in `frontend/app/workspace/widgets.tsx` mutated local state, but the visible compat layout could still collapse the sidebar/floating anchor and leave the menu effectively invisible
- when the AI panel finally mounted, compat still leaked into legacy WOS-backed tab-meta reads and produced `object.GetObject` failures from the visible path
- AI close in compat still tried to restore focus through legacy static-tab layout state and could throw during close

Minimal fixes applied:

- `frontend/app/workspace/workspace.tsx`
  - enabled the compat path to register the AI panel refs and drive the same `WorkspaceLayoutModel` open/close lifecycle
  - added minimal inline compat layout styles only where missing flex sizing blocked visible behavior
  - wired a tiny compat context into the AI path before the first panel-layout read
- `frontend/app/workspace/widgets.tsx`
  - added minimal compat-only inline sizing/hiding styles so the real settings trigger keeps a valid anchor and the hidden measurement helper stays non-interactive
- `frontend/app/aipanel/compat-context.ts`
  - introduced a tiny module-scope compat context so AI code can know `compat=true` and the active tab id without importing the workspace store and creating initialization cycles
- `frontend/app/aipanel/aipanel.tsx`
  - normalized missing AI mode configs with `?? {}`
  - used compat tab id at the request boundary instead of depending on legacy tab-model state
- `frontend/app/aipanel/waveai-model.tsx`
  - bypassed legacy widget-context meta reads in compat mode
  - used compat tab identity for the AI model context instead of legacy static-tab lookups
- `frontend/app/aipanel/aipanelheader.tsx`
  - stopped the compat header from reading WOS-backed widget-context atom on initial open
- `frontend/app/workspace/workspace-layout-model.ts`
  - isolated compat mode from legacy tab-meta initialization and persistence reads
  - skipped legacy focus-restore logic on compat AI close

Validated result:

- fresh compat load: AI starts collapsed, no `object.GetObject` failure on load
- AI open: button state changes to active and the AI panel grows from `0px` to `300px`
- AI close: button state returns to inactive and the AI panel collapses back to `0px`
- settings open: floating menu items `Settings / Tips / Secrets / Help` become visible at the real sidebar anchor
- settings close: outside click dismisses the floating menu cleanly
- clean browser session after the fix produced zero console errors and only successful `200 OK` network requests on the active path

Explicit non-goals for this slice:

- no redesign of AI/settings UI
- no broad modal-system rewrite
- no legacy WOS cleanup outside the active compat AI/settings path
- no architecture refactor
