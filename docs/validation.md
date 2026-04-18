# Latest byokannouncement widget sub-slice migration

**Date:** 2026-04-18  
**Scope:** Execute local leaf-only `RTAIPanelWidget/byokannouncement` contract split (not a manifest-registered widget migration)

## Exact files created/updated

- Created:
  - `frontend/ui/widgets/RTAIPanelWidget/byokannouncement.logic.ts`
  - `frontend/ui/widgets/RTAIPanelWidget/byokannouncement.template.tsx`
  - `frontend/ui/widgets/RTAIPanelWidget/byokannouncement.style.scss`
  - `frontend/ui/widgets/RTAIPanelWidget/byokannouncement.story.tsx`
- Updated:
  - `frontend/ui/widgets/RTAIPanelWidget/byokannouncement.tsx` (local barrel export)
- Legacy single-file implementation status:
  - Replaced. Runtime JSX moved to `.template.tsx`; event helpers/class resolution moved to `.logic.ts`.

## Preserved export/import path

- Preserved local parent import path:
  - `frontend/ui/widgets/RTAIPanelWidget/aipanel.tsx` imports `BYOKAnnouncement` from `./byokannouncement`.
- No direct imports outside `RTAIPanelWidget` were found in `frontend/app`, `frontend/ui`, or `frontend/wave.ts`.

## Commands run and results

```bash
rg "byokannouncement" frontend/ui/widgets/RTAIPanelWidget frontend/app frontend/ui frontend/wave.ts
→ only local widget usage (parent import in aipanel + local files)

npm --prefix frontend run build
→ ✓ pass (phase 1 boundary validation)

npm --prefix frontend run lint
→ ✓ pass (existing repo warnings only; no new errors)

npx tsc -p frontend/tsconfig.json --noEmit
→ ✓ pass

npm --prefix frontend run build
→ ✓ pass (phase 2 validation)

npm run build:core
→ ✓ pass

RTERM_AUTH_TOKEN=ui-byokannouncement-token apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52773 --workspace-root "$PWD" --state-dir /tmp/runa-ui-byokannouncement-state
VITE_RTERM_API_BASE=http://127.0.0.1:52773 VITE_RTERM_AUTH_TOKEN=ui-byokannouncement-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4191 --strictPort

curl -sf -H "Authorization: Bearer ui-byokannouncement-token" http://127.0.0.1:52773/healthz
→ {"status":"ok"}

curl -sf -H "Authorization: Bearer ui-byokannouncement-token" http://127.0.0.1:52773/api/v1/workspace
→ ✓ pass (workspace payload returned)

curl -sf -H "Authorization: Bearer ui-byokannouncement-token" "http://127.0.0.1:52773/api/v1/terminal/term-main?from=0"
→ ✓ pass (terminal snapshot payload returned)
```

## Runtime sanity result

- App loaded at `http://127.0.0.1:4191/`.
- Workspace shell was visible (`Main Shell`/`Ops Shell` surface visible).
- Terminal widget was visible (`Main Shell` terminal header and terminal input textbox present).
- AI panel loaded and interactive.
- `byokannouncement` module loaded successfully (`GET /ui/widgets/RTAIPanelWidget/byokannouncement.tsx` returned `200`).
- No failed SCSS imports observed for this slice.
- No failed module loads observed for this slice.
- No fatal console errors observed. (One non-fatal browser issue warning about form field id/name was present and unrelated to this slice.)
- Rendering note: BYOK announcement remains conditionally rendered in `aipanel.tsx` (`!hasCustomModes`). In this runtime profile it was not displayed, with no runtime regression from the split.

## Slice scope confirmation

- This is a **local widget sub-slice only**, not a manifest-registered widget migration.
- No manifest changes.
- No checker changes.

---

# Latest post-aifeedbackbuttons widget assessment

**Date:** 2026-04-18  
**Scope:** Assessment-only decision on whether safe leaf-only `RTAIPanelWidget` work remains after five completed local sub-slices.

## Completed leaf sub-slices considered

- `agent-selection-strip`
- `run-command-approval`
- `execution-block-list`
- `airatelimitstrip`
- `aifeedbackbuttons`

## Remaining files assessed

- Remaining files (excluding the five completed sub-slice families): **21**
- Assessed set:
  - `ai-utils.ts`
  - `aidroppedfiles.tsx`
  - `aimessage.tsx`
  - `aimode.tsx`
  - `aipanel-compat.tsx`
  - `aipanel-contextmenu.ts`
  - `aipanel.tsx`
  - `aipanelheader.tsx`
  - `aipanelinput.tsx`
  - `aipanelmessages.tsx`
  - `aitooluse.tsx`
  - `aitypes.ts`
  - `byokannouncement.tsx`
  - `compat-context.ts`
  - `compat-conversation.ts`
  - `restorebackupmodal.tsx`
  - `run-command.test.ts`
  - `run-command.ts`
  - `telemetryrequired.tsx`
  - `waveai-focus-utils.ts`
  - `waveai-model.tsx`

## Exact decision

- Decision: **one safe leaf still remains**.
- Selected remaining safe leaf-only candidate: `frontend/ui/widgets/RTAIPanelWidget/byokannouncement.tsx`.
- Reason:
  - Narrow local dependency shape (single local dependent: `aipanel.tsx`).
  - No local orchestration or compat bridge responsibilities.
  - Smaller and more isolated execution surface than other leaf-like candidates (`aidroppedfiles.tsx`, `telemetryrequired.tsx`, `restorebackupmodal.tsx`), which carry tighter runtime/model state coupling.

## Future boundary and explicit deferrals

- Future in-scope boundary (for execution slice): `byokannouncement.tsx` only.
- Allowed: minimal local import rewiring inside `frontend/ui/widgets/RTAIPanelWidget` only if needed to preserve current import path.
- Explicit out of scope:
  - `aipanel.tsx`
  - `aipanel-compat.tsx`
  - `waveai-model.tsx`
  - `run-command.ts`
  - `compat-conversation.ts`
  - `compat-context.ts`
  - `aipanelmessages.tsx`
  - `aimessage.tsx`
  - `aipanelinput.tsx`
  - `ai-utils.ts`
  - `aitypes.ts`
  - all app/layout/runtime/api files
  - checker and manifest changes

## Commands run and build result

```bash
find frontend/ui/widgets/RTAIPanelWidget -maxdepth 1 -type f | sort | rg -v 'agent-selection-strip|run-command-approval|execution-block-list|airatelimitstrip|aifeedbackbuttons'
rg --no-heading -n "from ['\"](\\./|@/ui/widgets/RTAIPanelWidget)" frontend/ui/widgets/RTAIPanelWidget
rg --no-heading -n "RTAIPanelWidget/(ai-utils|aidroppedfiles|aimessage|aimode|aipanel-compat|aipanel-contextmenu|aipanel|aipanelheader|aipanelinput|aipanelmessages|aitooluse|aitypes|byokannouncement|compat-context|compat-conversation|restorebackupmodal|run-command|telemetryrequired|waveai-focus-utils|waveai-model)" frontend
npm --prefix frontend run build
→ pass (phase 1)
npm --prefix frontend run build
→ pass (phase 2)
```

## Assessment-only confirmation

- No widget source migration executed in this slice.
- No manifest changes.
- No checker changes.

---

# Latest aifeedbackbuttons widget sub-slice migration

**Date:** 2026-04-18  
**Scope:** Execute local leaf-only `RTAIPanelWidget/aifeedbackbuttons` contract split (not a manifest-registered widget migration)

## Exact files created/updated

- Created:
  - `frontend/ui/widgets/RTAIPanelWidget/aifeedbackbuttons.logic.ts`
  - `frontend/ui/widgets/RTAIPanelWidget/aifeedbackbuttons.template.tsx`
  - `frontend/ui/widgets/RTAIPanelWidget/aifeedbackbuttons.style.scss`
  - `frontend/ui/widgets/RTAIPanelWidget/aifeedbackbuttons.story.tsx`
- Updated:
  - `frontend/ui/widgets/RTAIPanelWidget/aifeedbackbuttons.tsx` (local barrel export)
- Legacy single-file implementation status:
  - Replaced. Runtime JSX moved to `.template.tsx`; pure type/class/icon resolution moved to `.logic.ts`.

## Preserved export/import path

- Preserved local parent import path:
  - `frontend/ui/widgets/RTAIPanelWidget/aimessage.tsx` imports `AIFeedbackButtons` from `./aifeedbackbuttons`.
- No direct imports outside `RTAIPanelWidget` were found in `frontend/app`, `frontend/ui`, or `frontend/wave.ts`.

## Commands run and results

```bash
rg "aifeedbackbuttons" frontend/ui/widgets/RTAIPanelWidget frontend/app frontend/ui frontend/wave.ts
→ only local widget usage (parent import in aimessage + local contract files)

npm --prefix frontend run build
→ ✓ pass (phase 1 boundary validation)

npm --prefix frontend run lint
→ ✓ pass (15 pre-existing warnings, 0 errors)

npx tsc -p frontend/tsconfig.json --noEmit
→ ✓ pass

npm --prefix frontend run build
→ ✓ pass

npm run build:core
→ ✓ pass

RTERM_AUTH_TOKEN=ui-aifeedbackbuttons-token apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:52772 \
  --workspace-root "$PWD" \
  --state-dir /tmp/runa-ui-aifeedbackbuttons-state
→ started (base_url http://127.0.0.1:52772)

VITE_RTERM_API_BASE=http://127.0.0.1:52772 \
VITE_RTERM_AUTH_TOKEN=ui-aifeedbackbuttons-token \
npm --prefix frontend run dev -- --host 127.0.0.1 --port 4190 --strictPort
→ vite ready on http://127.0.0.1:4190

curl -sf -H "Authorization: Bearer ui-aifeedbackbuttons-token" http://127.0.0.1:52772/healthz
→ {"status":"ok"}

curl -sf -H "Authorization: Bearer ui-aifeedbackbuttons-token" http://127.0.0.1:52772/api/v1/workspace
→ HTTP 200, workspace payload returned

curl -sf -H "Authorization: Bearer ui-aifeedbackbuttons-token" "http://127.0.0.1:52772/api/v1/terminal/term-main?from=0"
→ HTTP 200, terminal payload returned

Playwright sanity check against http://127.0.0.1:4190/
→ app loaded, workspace shell visible, terminal widget visible, AI panel visible
→ no failed module loads observed (network status 200 across loaded modules)
→ no failed SCSS imports observed (`aifeedbackbuttons.style.scss` loaded with 200)
→ console errors: 0
→ feedback buttons rendered after sending prompt (`Good Response`: 1, `Bad Response`: 1, `Copy Message`: 1)
```

## Runtime sanity outcome

- App load: pass
- Workspace shell visible: pass
- Terminal widget visible: pass
- AI panel widget visible: pass
- Feedback buttons render path: pass
- Failed SCSS imports: none observed
- Failed module loads: none observed
- Fatal console errors: none observed

## Scope confirmation

- This is a **local widget sub-slice only**, not a manifest-registered widget migration.
- No manifest changes.
- No checker changes.
- No forbidden spill edits into app/layout/runtime or restricted `RTAIPanelWidget` orchestration/compat files.

---

# Latest post-airatelimitstrip widget assessment

**Date:** 2026-04-18  
**Scope:** Assessment-only decision on whether safe leaf-only `RTAIPanelWidget` work remains after four completed local sub-slices.

## Completed leaf sub-slices considered

- `agent-selection-strip`
- `run-command-approval`
- `execution-block-list`
- `airatelimitstrip`

## Remaining files assessed

- Remaining files (excluding the four completed sub-slice families): **22**
- Assessed set:
  - `ai-utils.ts`
  - `aidroppedfiles.tsx`
  - `aifeedbackbuttons.tsx`
  - `aimessage.tsx`
  - `aimode.tsx`
  - `aipanel-compat.tsx`
  - `aipanel-contextmenu.ts`
  - `aipanel.tsx`
  - `aipanelheader.tsx`
  - `aipanelinput.tsx`
  - `aipanelmessages.tsx`
  - `aitooluse.tsx`
  - `aitypes.ts`
  - `byokannouncement.tsx`
  - `compat-context.ts`
  - `compat-conversation.ts`
  - `restorebackupmodal.tsx`
  - `run-command.test.ts`
  - `run-command.ts`
  - `telemetryrequired.tsx`
  - `waveai-focus-utils.ts`
  - `waveai-model.tsx`

## Exact decision

- Decision: **one safe leaf still remains**.
- Selected remaining safe leaf-only candidate: `frontend/ui/widgets/RTAIPanelWidget/aifeedbackbuttons.tsx`.
- Reason:
  - Narrow local dependency graph (single local dependent: `aimessage.tsx`).
  - Small UI-only surface with contained side effects.
  - Lower migration risk than remaining files, which are mostly orchestration/compat/runtime/state-heavy.

## Future boundary and explicit deferrals

- Future in-scope boundary (for execution slice): `aifeedbackbuttons.tsx` only.
- Allowed: minimal local import rewiring inside `frontend/ui/widgets/RTAIPanelWidget` only if needed to preserve current import path.
- Explicit out of scope:
  - `aipanel.tsx`
  - `aipanel-compat.tsx`
  - `waveai-model.tsx`
  - `run-command.ts`
  - `compat-conversation.ts`
  - `compat-context.ts`
  - `aipanelmessages.tsx`
  - `aimessage.tsx` (except minimal import rewiring only)
  - all app/layout/runtime/api files
  - checker and manifest changes

## Commands run and results

```bash
find frontend/ui/widgets/RTAIPanelWidget -maxdepth 1 -type f | sort | rg -v 'agent-selection-strip|run-command-approval|execution-block-list|airatelimitstrip'
rg "from ['\"](\\./|@/ui/widgets/RTAIPanelWidget)" frontend/ui/widgets/RTAIPanelWidget -n
rg "RTAIPanelWidget/(ai-utils|aidroppedfiles|aifeedbackbuttons|aimessage|aimode|aipanel-compat|aipanel-contextmenu|aipanel|aipanelheader|aipanelinput|aipanelmessages|aitooluse|aitypes|byokannouncement|compat-context|compat-conversation|restorebackupmodal|run-command|telemetryrequired|waveai-focus-utils|waveai-model)" frontend -n
npm --prefix frontend run build
→ pass
npm --prefix frontend run build
→ pass
npm --prefix frontend run lint
→ pass (warnings only)
npx tsc -p frontend/tsconfig.json --noEmit
→ pass
npm --prefix frontend run build
→ pass
```

## Assessment-only confirmation

- No widget source migration executed in this slice.
- No manifest changes.
- No checker changes.

---

# Latest: AIRateLimitStrip Widget Sub-Slice Migration

**Date:** 2026-04-18  
**Scope:** Execute local leaf-only `RTAIPanelWidget/airatelimitstrip` contract split (not a manifest-registered widget migration)

## Files Created and Updated

- Created:
  - `frontend/ui/widgets/RTAIPanelWidget/airatelimitstrip.logic.ts`
  - `frontend/ui/widgets/RTAIPanelWidget/airatelimitstrip.template.tsx`
  - `frontend/ui/widgets/RTAIPanelWidget/airatelimitstrip.style.scss`
  - `frontend/ui/widgets/RTAIPanelWidget/airatelimitstrip.story.tsx`
- Updated:
  - `frontend/ui/widgets/RTAIPanelWidget/airatelimitstrip.tsx` (now local barrel re-export)
- Legacy single-file implementation status:
  - Replaced. Render implementation moved into `airatelimitstrip.template.tsx`; pure helpers/class resolution moved into `airatelimitstrip.logic.ts`.

## Export/Import Path Preservation

- Parent import paths preserved unchanged:
  - `frontend/ui/widgets/RTAIPanelWidget/aipanel.tsx` imports `AIRateLimitStrip` from `./airatelimitstrip`.
  - `frontend/ui/widgets/RTAIPanelWidget/aipanel-compat.tsx` imports `AIRateLimitStrip` from `./airatelimitstrip`.
- No direct `airatelimitstrip` imports were found outside `RTAIPanelWidget`.

## Commands Run and Results

```bash
rg "airatelimitstrip" frontend/ui/widgets/RTAIPanelWidget frontend/app frontend/ui frontend/wave.ts
→ only local widget usage plus new local contract files

npm --prefix frontend run build
→ ✓ pass (phase 1 boundary validation)

npm --prefix frontend run lint
→ initial run failed on one local unused var (`req`) in new template
→ fixed locally in `airatelimitstrip.template.tsx`
→ rerun passed with 15 pre-existing warnings, 0 errors

npx tsc -p frontend/tsconfig.json --noEmit
→ ✓ pass

npm --prefix frontend run build
→ ✓ pass

npm run build:core
→ ✓ pass

RTERM_AUTH_TOKEN=ui-airatelimitstrip-token apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:52771 \
  --workspace-root "$PWD" \
  --state-dir /tmp/runa-ui-airatelimitstrip-state
→ started (base_url http://127.0.0.1:52771)

VITE_RTERM_API_BASE=http://127.0.0.1:52771 \
VITE_RTERM_AUTH_TOKEN=ui-airatelimitstrip-token \
npm --prefix frontend run dev -- --host 127.0.0.1 --port 4189 --strictPort
→ vite ready, app served at http://127.0.0.1:4189

curl -sf -H "Authorization: Bearer ui-airatelimitstrip-token" http://127.0.0.1:52771/healthz
→ {"status":"ok"}

curl -sf -H "Authorization: Bearer ui-airatelimitstrip-token" http://127.0.0.1:52771/api/v1/workspace
→ HTTP 200, workspace payload returned

curl -sf -H "Authorization: Bearer ui-airatelimitstrip-token" "http://127.0.0.1:52771/api/v1/terminal/term-main?from=0"
→ HTTP 200, terminal state/chunks returned

Playwright sanity check against http://127.0.0.1:4189/
→ app loaded, workspace shell visible, terminal widget visible, AI panel rendered
→ `airatelimitstrip` files loaded:
   - /ui/widgets/RTAIPanelWidget/airatelimitstrip.tsx (200)
   - /ui/widgets/RTAIPanelWidget/airatelimitstrip.template.tsx (200)
   - /ui/widgets/RTAIPanelWidget/airatelimitstrip.logic.ts (200)
   - /ui/widgets/RTAIPanelWidget/airatelimitstrip.style.scss (200)
→ rate-limit strip text (`Premium Used`, `Limit Reached`) remained hidden in normal no-rate-limit runtime state (expected)
→ current-page console error check returned 0 errors
```

## Runtime Sanity Outcome

- App load: pass
- Workspace shell visible: pass
- Terminal widget visible: pass
- AI panel widget visible: pass
- AIRateLimitStrip render path: pass (module/style loaded; UI remains hidden when no rate-limit event is present, consistent with current behavior)
- Failed SCSS imports: none observed
- Failed module loads: none observed
- Fatal console errors (current run): none observed

## Scope Guardrail Confirmation

- This is a **local widget sub-slice only**.
- This is **not** a manifest-registered widget migration.
- No component contract manifest changes.
- No checker changes.
- No changes to `aipanel.tsx`, `aipanel-compat.tsx`, `waveai-model.tsx`, `run-command.ts`, or `compat-conversation.ts`.

---

# Latest: Leaf Batch Mode Assessment

**Date:** 2026-04-18  
**Scope:** Assessment-only decision on whether remaining `RTAIPanelWidget` leaf work can switch from single-file slices to a 2-3 file batch.

## Remaining Files Assessed

- Assessed remaining files in `frontend/ui/widgets/RTAIPanelWidget`: **23** (excluding completed local sub-slices `agent-selection-strip*`, `run-command-approval*`, `execution-block-list*`).
- Evidence source: local file graph and import/dependent inspection.

## Batch Eligibility Decision

- Valid batch mode exists: **No**.
- Exact conclusion: **single-file widget governance required** for the next execution slice.
- Why batching is unsafe:
  - Only one low-risk safe leaf candidate remains (`airatelimitstrip.tsx`).
  - Other leaf-like files are medium-risk due direct model/runtime side effects (`aidroppedfiles.tsx`, `aifeedbackbuttons.tsx`, `telemetryrequired.tsx`, `byokannouncement.tsx`) or are orchestration/compat/state cores.

## Commands Run and Results

```bash
find frontend/ui/widgets/RTAIPanelWidget -maxdepth 1 -type f | sort
rg --no-heading -n "from ['\"]\\./|^import ['\"]\\./" frontend/ui/widgets/RTAIPanelWidget
rg --no-heading -n "@/ui/widgets/RTAIPanelWidget" frontend/app frontend/ui frontend/wave.ts
→ used for remaining-file classification and local dependency/dependent mapping

npm --prefix frontend run build
→ ✓ pass (phase 1)

npm --prefix frontend run build
→ ✓ pass (phase 2)

npm --prefix frontend run lint
→ ✓ pass with 15 pre-existing warnings, 0 errors

npx tsc -p frontend/tsconfig.json --noEmit
→ ✓ pass

npm --prefix frontend run build
→ ✓ pass (phase 3)
```

## Assessment-Only Confirmation

- No widget source files changed.
- No contract manifest changes.
- No checker changes.
- This section records assessment only; no migration was executed in this slice.

---

# Latest: Execution-Block-List Widget Sub-Slice Migration

**Date:** 2026-04-18  
**Scope:** Execute local leaf-only `RTAIPanelWidget/execution-block-list` contract split (not a manifest-registered widget migration)

## Files Created and Updated

- Created:
  - `frontend/ui/widgets/RTAIPanelWidget/execution-block-list.logic.ts`
  - `frontend/ui/widgets/RTAIPanelWidget/execution-block-list.template.tsx`
  - `frontend/ui/widgets/RTAIPanelWidget/execution-block-list.style.scss`
  - `frontend/ui/widgets/RTAIPanelWidget/execution-block-list.story.tsx`
- Updated:
  - `frontend/ui/widgets/RTAIPanelWidget/execution-block-list.tsx` (now local barrel re-export)
- Legacy single-file implementation status:
  - Replaced. Render implementation moved into `execution-block-list.template.tsx`; types/helpers/class resolution moved into `execution-block-list.logic.ts`.

## Export/Import Path Preservation

- Parent import path preserved unchanged in `frontend/ui/widgets/RTAIPanelWidget/aipanel-compat.tsx`:
  - `import { ExecutionBlockList } from "./execution-block-list";`
- No direct `execution-block-list` imports were found outside `RTAIPanelWidget` in `frontend/app`, `frontend/ui`, or `frontend/wave.ts`.

## Commands Run and Results

```bash
rg "execution-block-list" frontend/ui/widgets/RTAIPanelWidget frontend/app frontend/ui frontend/wave.ts
→ only local widget usage; parent wiring at aipanel-compat.tsx

npm --prefix frontend run build
→ ✓ pass (boundary doc phase)

npm --prefix frontend run lint
→ 15 warnings (0 errors), unchanged pre-existing warnings

npx tsc -p frontend/tsconfig.json --noEmit
→ exit 0

npm --prefix frontend run build
→ ✓ pass

npm run build:core
→ ✓ pass

RTERM_AUTH_TOKEN=ui-execution-block-list-token apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:52770 \
  --workspace-root "$PWD" \
  --state-dir /tmp/runa-ui-execution-block-list-state
→ started (base_url http://127.0.0.1:52770)

VITE_RTERM_API_BASE=http://127.0.0.1:52770 \
VITE_RTERM_AUTH_TOKEN=ui-execution-block-list-token \
npm --prefix frontend run dev -- --host 127.0.0.1 --port 4188 --strictPort
→ vite ready, app served at http://127.0.0.1:4188

curl -sf -H "Authorization: Bearer ui-execution-block-list-token" http://127.0.0.1:52770/healthz
→ {"status":"ok"}

curl -sf -H "Authorization: Bearer ui-execution-block-list-token" http://127.0.0.1:52770/api/v1/workspace
→ HTTP 200, workspace payload returned

curl -sf -H "Authorization: Bearer ui-execution-block-list-token" "http://127.0.0.1:52770/api/v1/terminal/term-main?from=0"
→ HTTP 200, terminal state/chunks returned

Playwright sanity check against http://127.0.0.1:4188/
→ app loaded, workspace shell visible, terminal widget visible, AI panel rendered
→ executed `/run echo execution-block-list-smoke` via AI panel
→ execution block list rendered (`data-testid=execution-block-list`, item count 1)
→ module and style loads include:
   - /ui/widgets/RTAIPanelWidget/execution-block-list.tsx (200)
   - /ui/widgets/RTAIPanelWidget/execution-block-list.template.tsx (200)
   - /ui/widgets/RTAIPanelWidget/execution-block-list.logic.ts (200)
   - /ui/widgets/RTAIPanelWidget/execution-block-list.style.scss (200)
→ no failed module/SCSS loads observed (network requests returned 200)
→ current run console log (`.playwright-mcp/console-2026-04-18T13-56-30-268Z.log`) contains no `[ERROR]` entries
```

## Runtime Sanity Outcome

- App load: pass
- Workspace shell visible: pass
- Terminal widget visible: pass
- AI panel widget visible: pass
- Execution block list render path: pass (rendered with one block after `/run` smoke command)
- Failed SCSS imports: none observed
- Failed module loads: none observed
- Fatal console errors: none observed in current run log

## Scope Guardrail Confirmation

- This is a **local widget sub-slice only**.
- This is **not** a manifest-registered widget migration.
- No component contract manifest changes.
- No checker changes.
- No changes to `aipanel.tsx`, `aipanel-compat.tsx`, `waveai-model.tsx`, `run-command.ts`, or `compat-conversation.ts`.

---

# Previous: Next-Remaining-Leaf RTAIPanelWidget Assessment

**Date:** 2026-04-18  
**Scope:** Assessment-only selection of the next remaining leaf-only `RTAIPanelWidget` sub-slice after `agent-selection-strip` and `run-command-approval` (no migration executed)

## Files Inspected (`frontend/ui/widgets/RTAIPanelWidget`)

- Total local files inspected: 34
- Candidate-set exclusions (already completed local contract sets): 10 files (`agent-selection-strip.*`, `run-command-approval.*`)
- Remaining files assessed for next target: 24
- `ai-utils.ts`
- `aidroppedfiles.tsx`
- `aifeedbackbuttons.tsx`
- `aimessage.tsx`
- `aimode.tsx`
- `aipanel-compat.tsx`
- `aipanel-contextmenu.ts`
- `aipanel.tsx`
- `aipanelheader.tsx`
- `aipanelinput.tsx`
- `aipanelmessages.tsx`
- `airatelimitstrip.tsx`
- `aitooluse.tsx`
- `aitypes.ts`
- `byokannouncement.tsx`
- `compat-context.ts`
- `compat-conversation.ts`
- `execution-block-list.tsx`
- `restorebackupmodal.tsx`
- `run-command.test.ts`
- `run-command.ts`
- `telemetryrequired.tsx`
- `waveai-focus-utils.ts`
- `waveai-model.tsx`

## Chosen Next Remaining Leaf Candidate

- Chosen file: **`frontend/ui/widgets/RTAIPanelWidget/execution-block-list.tsx`**

Reason for choice:
- No local imports and one local dependent (`aipanel-compat.tsx`) keep blast radius tight.
- Pure callback-driven renderer with local reveal state; no direct `WaveAIModel` access and no direct runtime mutation.
- Safer than other remaining leaf-like options (`airatelimitstrip.tsx`, `aifeedbackbuttons.tsx`, `aidroppedfiles.tsx`) that carry timer/atom or model-side-effect coupling.

## Future Slice Boundary (Defined, Not Executed)

- In scope:
  - `frontend/ui/widgets/RTAIPanelWidget/execution-block-list.tsx` only
- Allowed:
  - minimal local import rewiring inside `RTAIPanelWidget` only, if needed to preserve parent path
- Explicit deferrals:
  - `aipanel.tsx`
  - `aipanel-compat.tsx` (except minimal import rewiring only)
  - `waveai-model.tsx`
  - `run-command.ts`
  - `compat-conversation.ts`
  - `compat-context.ts`
  - `aitypes.ts`
  - `ai-utils.ts`
  - all other `RTAIPanelWidget` files
  - any manifest/checker changes
  - any `app/layout/runtime/api` edits

## Commands Run and Results

```bash
find frontend/ui/widgets/RTAIPanelWidget -maxdepth 1 -type f | sort
rg --no-heading -n "from ['\"]\\./|^import ['\"]\\./" frontend/ui/widgets/RTAIPanelWidget
rg --no-heading -n "@/ui/widgets/RTAIPanelWidget/" frontend/ui/widgets/RTAIPanelWidget frontend/app frontend/ui frontend/wave.ts
→ used to rebuild remaining local file graph and candidate-set classification

npm --prefix frontend run build
→ ✓ pass (phase 1)

npm --prefix frontend run build
→ ✓ pass (phase 2)
```

## Assessment-Only Confirmation

- No widget source migration performed in this slice.
- No manifest changes.
- No checker changes.
- Docs-only output.

---

# Previous: Run-Command-Approval Widget Sub-Slice Migration

**Date:** 2026-04-18  
**Scope:** Execute local leaf-only `RTAIPanelWidget/run-command-approval` contract split (not a manifest-registered widget migration)

## Files Created and Updated

- Created:
  - `frontend/ui/widgets/RTAIPanelWidget/run-command-approval.logic.ts`
  - `frontend/ui/widgets/RTAIPanelWidget/run-command-approval.template.tsx`
  - `frontend/ui/widgets/RTAIPanelWidget/run-command-approval.style.scss`
  - `frontend/ui/widgets/RTAIPanelWidget/run-command-approval.story.tsx`
- Updated:
  - `frontend/ui/widgets/RTAIPanelWidget/run-command-approval.tsx` (now local barrel re-export)
- Legacy single-file implementation status:
  - Replaced. Render implementation moved into `run-command-approval.template.tsx`; types/helpers/class resolution moved into `run-command-approval.logic.ts`.

## Export/Import Path Preservation

- Parent import path preserved unchanged in `frontend/ui/widgets/RTAIPanelWidget/aipanel-compat.tsx`:
  - `import { type PendingRunApprovalEntry, RunCommandApprovalList } from "./run-command-approval";`
- No direct `run-command-approval` imports were found outside `RTAIPanelWidget` during this slice.

## Commands Run and Results

```bash
rg "run-command-approval" frontend/ui/widgets/RTAIPanelWidget frontend/app frontend/ui frontend/wave.ts
→ only local widget usage; parent wiring at aipanel-compat.tsx

npm --prefix frontend run build
→ ✓ pass (boundary doc phase)

npm --prefix frontend run lint
→ 15 warnings (0 errors), unchanged pre-existing warnings

npx tsc -p frontend/tsconfig.json --noEmit
→ exit 0

npm --prefix frontend run build
→ ✓ pass

npm run build:core
→ ✓ pass

RTERM_AUTH_TOKEN=ui-run-command-approval-token apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:52769 \
  --workspace-root "$PWD" \
  --state-dir /tmp/runa-ui-run-command-approval-state
→ started (base_url http://127.0.0.1:52769)

VITE_RTERM_API_BASE=http://127.0.0.1:52769 \
VITE_RTERM_AUTH_TOKEN=ui-run-command-approval-token \
npm --prefix frontend run dev -- --host 127.0.0.1 --port 4187 --strictPort
→ vite ready, app served at http://127.0.0.1:4187

curl -sf -H "Authorization: Bearer ui-run-command-approval-token" http://127.0.0.1:52769/healthz
→ {"status":"ok"}

curl -sf -H "Authorization: Bearer ui-run-command-approval-token" http://127.0.0.1:52769/api/v1/workspace
→ HTTP 200, workspace payload returned

curl -sf -H "Authorization: Bearer ui-run-command-approval-token" "http://127.0.0.1:52769/api/v1/terminal/term-main?from=0"
→ HTTP 200, terminal state/chunks returned

Playwright sanity check against http://127.0.0.1:4187/
→ app loaded, workspace shell visible, terminal widget visible, AI panel rendered
→ run-command flow validated in panel (`/run pwd` and `/run rm -rf /tmp/runa-ui-run-command-approval-smoke` executed via AI panel)
→ no pending approvals were emitted in this runtime profile, so approval list stayed hidden as expected for empty state
→ module and style loads include:
   - /ui/widgets/RTAIPanelWidget/run-command-approval.tsx (200)
   - /ui/widgets/RTAIPanelWidget/run-command-approval.template.tsx (200)
   - /ui/widgets/RTAIPanelWidget/run-command-approval.logic.ts (200)
   - /ui/widgets/RTAIPanelWidget/run-command-approval.style.scss (200)
→ current-page console errors: 0, warnings: 0
→ network/module/SCSS loads: no failures observed (requests returned 200)
```

## Runtime Sanity Outcome

- App load: pass
- Workspace shell visible: pass
- Terminal widget visible: pass
- AI panel widget visible: pass
- Run-command approval render path: pass (empty-state gate behavior observed; approval UI remains conditional and no regression in run-command flow)
- Failed SCSS imports: none observed
- Failed module loads: none observed
- Fatal console errors: none observed

## Scope Guardrail Confirmation

- This is a **local widget sub-slice only**.
- This is **not** a manifest-registered widget migration.
- No component contract manifest changes.
- No checker changes.
- No changes to `aipanel.tsx`, `aipanel-compat.tsx`, `waveai-model.tsx`, `run-command.ts`, or `compat-conversation.ts`.

---

# Previous: Next-Leaf RTAIPanelWidget Assessment

**Date:** 2026-04-18  
**Scope:** Assessment-only selection of the next leaf-only `RTAIPanelWidget` sub-slice after `agent-selection-strip` (no migration executed)

## Files Inspected (`frontend/ui/widgets/RTAIPanelWidget`)

- Total files inspected: 30
- `agent-selection-strip.logic.ts`
- `agent-selection-strip.story.tsx`
- `agent-selection-strip.style.scss`
- `agent-selection-strip.template.tsx`
- `agent-selection-strip.tsx`
- `ai-utils.ts`
- `aidroppedfiles.tsx`
- `aifeedbackbuttons.tsx`
- `aimessage.tsx`
- `aimode.tsx`
- `aipanel-compat.tsx`
- `aipanel-contextmenu.ts`
- `aipanel.tsx`
- `aipanelheader.tsx`
- `aipanelinput.tsx`
- `aipanelmessages.tsx`
- `airatelimitstrip.tsx`
- `aitooluse.tsx`
- `aitypes.ts`
- `byokannouncement.tsx`
- `compat-context.ts`
- `compat-conversation.ts`
- `execution-block-list.tsx`
- `restorebackupmodal.tsx`
- `run-command-approval.tsx`
- `run-command.test.ts`
- `run-command.ts`
- `telemetryrequired.tsx`
- `waveai-focus-utils.ts`
- `waveai-model.tsx`

## Chosen Next Leaf Candidate

- Chosen file: **`frontend/ui/widgets/RTAIPanelWidget/run-command-approval.tsx`**

Reason for choice:
- No local imports and a single local dependent (`aipanel-compat.tsx`) make blast radius smallest among remaining candidates.
- Prop-driven, render-only shape with no direct `WaveAIModel` or local orchestration dependencies.
- Lower coupling than other leaf-like options (`execution-block-list.tsx`, `airatelimitstrip.tsx`, `aidroppedfiles.tsx`, `aifeedbackbuttons.tsx`).

## Future Slice Boundary (Defined, Not Executed)

- In scope:
  - `frontend/ui/widgets/RTAIPanelWidget/run-command-approval.tsx` only
- Allowed:
  - minimal local import rewiring inside `RTAIPanelWidget` if required to preserve existing parent path
- Explicit deferrals:
  - `aipanel.tsx`
  - `aipanel-compat.tsx` (except minimal import rewiring only)
  - `waveai-model.tsx`
  - `run-command.ts`
  - `compat-conversation.ts`
  - `compat-context.ts`
  - `aitypes.ts`
  - `ai-utils.ts`
  - all other `RTAIPanelWidget` files
  - any manifest/checker updates
  - any `app/layout/runtime/api` edits

## Commands Run and Results

```bash
find frontend/ui/widgets/RTAIPanelWidget -maxdepth 1 -type f | sort
rg --no-heading -n "from ['\"]\\./" frontend/ui/widgets/RTAIPanelWidget
rg --no-heading -n "^import ['\"]\\./" frontend/ui/widgets/RTAIPanelWidget
rg --no-heading -n "@/ui/widgets/RTAIPanelWidget/" frontend/ui/widgets/RTAIPanelWidget
wc -l frontend/ui/widgets/RTAIPanelWidget/*
→ used to classify local file graph and leaf-vs-orchestration risk

npm --prefix frontend run build
→ ✓ pass (phase 1)

npm --prefix frontend run build
→ ✓ pass (phase 2)

npm --prefix frontend run lint
→ 15 warnings (0 errors), unchanged pre-existing warnings

npx tsc -p frontend/tsconfig.json --noEmit
→ exit 0

npm --prefix frontend run build
→ ✓ pass
```

## Assessment-Only Confirmation

- No widget source migration performed in this slice.
- No manifest changes.
- No checker changes.
- Docs-only output.

---

# Previous: Agent-Selection-Strip Widget Sub-Slice Migration

**Date:** 2026-04-18  
**Scope:** Execute the approved first local widget sub-slice for `RTAIPanelWidget/agent-selection-strip` without manifest/checker or broader widget/app/runtime scope expansion

## Files Created and Updated

- Created:
  - `frontend/ui/widgets/RTAIPanelWidget/agent-selection-strip.logic.ts`
  - `frontend/ui/widgets/RTAIPanelWidget/agent-selection-strip.template.tsx`
  - `frontend/ui/widgets/RTAIPanelWidget/agent-selection-strip.style.scss`
  - `frontend/ui/widgets/RTAIPanelWidget/agent-selection-strip.story.tsx`
- Updated:
  - `frontend/ui/widgets/RTAIPanelWidget/agent-selection-strip.tsx` (now a local barrel re-export)
- Legacy single-file implementation status:
  - Replaced. Render implementation moved into `agent-selection-strip.template.tsx`; logic/types/helpers moved into `agent-selection-strip.logic.ts`.

## Export/Import Path Preservation

- Parent import path preserved unchanged in `frontend/ui/widgets/RTAIPanelWidget/aipanel-compat.tsx`:
  - `import { AgentSelectionStrip } from "./agent-selection-strip";`
- No direct `agent-selection-strip` imports were found outside `RTAIPanelWidget` during this slice.

## Commands Run and Results

```bash
rg "agent-selection-strip" frontend/ui/widgets/RTAIPanelWidget frontend/app frontend/ui frontend/wave.ts
→ only local widget usage; parent wiring at aipanel-compat.tsx

npm --prefix frontend run build
→ ✓ pass (boundary doc phase)

npm --prefix frontend run lint
→ 15 warnings (0 errors), unchanged pre-existing warnings

npx tsc -p frontend/tsconfig.json --noEmit
→ exit 0

npm --prefix frontend run build
→ ✓ pass

npm run build:core
→ ✓ pass

RTERM_AUTH_TOKEN=ui-agent-strip-token apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:52768 \
  --workspace-root "$PWD" \
  --state-dir /tmp/runa-ui-agent-strip-state
→ started (base_url http://127.0.0.1:52768)

VITE_RTERM_API_BASE=http://127.0.0.1:52768 \
VITE_RTERM_AUTH_TOKEN=ui-agent-strip-token \
npm --prefix frontend run dev -- --host 127.0.0.1 --port 4186 --strictPort
→ vite ready, app served at http://127.0.0.1:4186

curl -sf -H "Authorization: Bearer ui-agent-strip-token" http://127.0.0.1:52768/healthz
→ {"status":"ok"}

curl -sf -H "Authorization: Bearer ui-agent-strip-token" http://127.0.0.1:52768/api/v1/workspace
→ HTTP 200, workspace payload returned

curl -sf -H "Authorization: Bearer ui-agent-strip-token" "http://127.0.0.1:52768/api/v1/terminal/term-main?from=0"
→ HTTP 200, terminal state/chunks returned

Playwright sanity check against http://127.0.0.1:4186/
→ app loaded, workspace shell visible, terminal widget visible, AI panel rendered
→ agent selection strip rendered (Profile/Role/Mode selects present)
→ console errors: 0, console warnings: 0
→ network/module/SCSS loads: no failures observed (requests returned 200, including agent-selection-strip.style.scss)
```

## Runtime Sanity Outcome

- App load: pass
- Workspace shell visible: pass
- Terminal widget visible: pass
- AI panel widget and agent selection strip render: pass
- Failed SCSS imports: none observed
- Failed module loads: none observed
- Fatal console errors: none observed

## Scope Guardrail Confirmation

- This is a **local widget sub-slice only**.
- This is **not** a manifest-registered widget migration.
- No component contract manifest changes.
- No checker changes.
- No changes to `aipanel.tsx`, `aipanel-compat.tsx`, `waveai-model.tsx`, `run-command.ts`, or `compat-conversation.ts`.

---

# Previous: Single-Widget Migration Target Assessment

**Date:** 2026-04-18  
**Scope:** Assessment-only comparison of `RTAIPanelWidget` vs `RTTerminalWidget` to define the safest first single-item widget contract sub-slice

## Compared Candidates

- `RTAIPanelWidget`
- `RTTerminalWidget`

## Chosen Safer First Target

Chosen target: **`RTAIPanelWidget`**.

Reason for choice:
- It contains a clearly isolatable leaf UI subcomponent (`agent-selection-strip.tsx`) with bounded responsibility.
- That leaf boundary is safer to migrate first than terminal-core files tied to block/workspace/stream behavior.

## First Safe Sub-Slice Boundary

- In scope:
  - `frontend/ui/widgets/RTAIPanelWidget/agent-selection-strip.tsx`
- Explicitly out of scope / deferred:
  - `frontend/ui/widgets/RTAIPanelWidget/aipanel.tsx`
  - `frontend/ui/widgets/RTAIPanelWidget/aipanel-compat.tsx`
  - `frontend/ui/widgets/RTAIPanelWidget/waveai-model.tsx`
  - `frontend/ui/widgets/RTAIPanelWidget/run-command.ts`
  - `frontend/ui/widgets/RTAIPanelWidget/compat-conversation.ts`
  - all `RTTerminalWidget` files
  - checker/manifest changes
  - app/layout/runtime/api edits

## Commands Run and Results

```bash
find frontend/ui/widgets/RTAIPanelWidget -maxdepth 1 -type f | sort
find frontend/ui/widgets/RTTerminalWidget -maxdepth 1 -type f | sort
rg --no-heading -n "@/ui/widgets/RTAIPanelWidget" frontend/app frontend/ui frontend/wave.ts
rg --no-heading -n "@/ui/widgets/RTTerminalWidget" frontend/app frontend/ui frontend/wave.ts
npm --prefix frontend run build
→ ✓ pass (phase 1)

npm --prefix frontend run build
→ ✓ pass (phase 2)

npm --prefix frontend run lint
→ 15 warnings (0 errors), unchanged pre-existing warnings

npx tsc -p frontend/tsconfig.json --noEmit
→ exit 0

npm --prefix frontend run build
→ ✓ pass
```

## Assessment-Only Confirmation

- No widget migration performed.
- No manifest/checker changes.
- Docs-only output for this slice.

---

# Previous: Widget Layer Migration Assessment

**Date:** 2026-04-18  
**Scope:** Assessment-only pass for `ui/widgets` contract migration readiness (no migration executed)

## Assessment Summary

- Assessed widget inventory count: 44 files across 2 top-level widget directories.
- Active widget candidates found: 2 (`RTAIPanelWidget`, `RTTerminalWidget`).
- Valid multi-item widget batch exists: no.

Exact conclusion: **single-item widget governance required**.

Reason:
- Both active widget candidates are high-coupling/high-complexity.
- Both depend upward into `app`/`layout` semantics and runtime/API pathways.
- Neither qualifies as a low/medium-risk first widget contract slice candidate.

## Commands Run and Results

```bash
find frontend/ui/widgets -maxdepth 2 -type f | sort
→ 44 files discovered across RTAIPanelWidget and RTTerminalWidget

rg "@/ui/widgets|from [\"']@/ui/widgets" frontend/app frontend/ui frontend/wave.ts
→ active imports confirmed for both widget directories

npm --prefix frontend run build
→ ✓ pass (used for phase 1 and phase 2 docs-only validation)

npm --prefix frontend run lint
→ 15 warnings (0 errors), unchanged pre-existing warnings

npx tsc -p frontend/tsconfig.json --noEmit
→ exit 0

npm --prefix frontend run build
→ ✓ pass
```

## Scope Guardrail Confirmation

- No widget migration performed.
- No contract manifest changes.
- No checker changes.
- Docs-only output for this slice.

---

# Previous: RTPopover Contract Tightening and Single-Item Component Layer State

**Date:** 2026-04-18  
**Scope:** Verify RTPopover contract completeness and record current component-layer governance state without expanding migration scope

## Summary

- Active registered `component` layer currently consists of `RTPopover` only.
- `RTModal` remains migrated on disk, inactive, and unregistered.
- No valid component batch exists until a second active `ui/components` candidate appears.
- Future component-layer work must remain single-item slices until that condition changes.

## RTPopover Verification Results

- Import hygiene is clean: active consumers use barrel imports (`@/ui/components/RTPopover`).
- No direct legacy file imports (`RTPopover.tsx`/`RTPopover.scss`) and no direct template/logic imports from app/ui consumers.
- Four-file contract completeness verified:
  - template imports `./RTPopover.style.scss`
  - `index.ts` runtime exports come from `RTPopover.template.tsx`
  - `index.ts` type exports come from `RTPopover.logic.ts`
  - no legacy `RTPopover.tsx` or `RTPopover.scss` files remain
  - public API names preserved (`Popover`, `PopoverButton`, `PopoverContent`, exported prop types)
  - no upward dependency into `app`/`widgets`/`layout`

## Commands Run and Results

```bash
rg "RTPopover/RTPopover|RTPopover\\.scss|RTPopover\\.tsx|RTPopover\\.template|RTPopover\\.logic" frontend
→ matches only RTPopover-local files (index/story/template/logic)

rg "@/ui/components/RTPopover|from [\"']@/ui/components/RTPopover" frontend/app frontend/ui frontend/wave.ts
→ active sites use barrel import (notificationpopover.tsx, workspaceswitcher.tsx, RTEmojiPalette.tsx)

rg "@/ui/components/" frontend/app frontend/ui frontend/wave.ts
→ only RTPopover appears as active component-layer import

node frontend/scripts/check-ui-component-contract.mjs
→ ✓ RTButton, RTMagnify, RTInput, RTTooltip, RTPopover pass

cd frontend && node scripts/check-ui-component-contract.mjs && cd ..
→ ✓ pass

npm --prefix frontend run lint:ui-contract
→ ✓ pass

npm --prefix frontend run lint
→ 15 warnings (0 errors), unchanged pre-existing warnings

npx tsc -p frontend/tsconfig.json --noEmit
→ exit 0

npm --prefix frontend run build
→ ✓ build succeeded (vite warnings only: large chunks / ineffective dynamic import)
```

---

# Previous: Frontend Component Batch Scope Repair

**Date:** 2026-04-18  
**Scope:** Repair component-layer batch registration scope by unregistering inactive RTModal and preserving active RTPopover only

## Corrective Summary

- Original defect: the component batch accepted `RTModal` despite no active usage in the current frontend.
- `RTModal` remains migrated on disk, but is no longer counted as a registered contract item.
- `RTPopover` remains the only registered `component`-layer item.
- Checker behavior is unchanged: it applies only to manifest-registered items.
- This repair restores compliance with the original slice rules (active candidates only; no scope expansion).

## Commands Run and Results

```bash
rg "@/ui/components/RTModal|from [\"']@/ui/components/RTModal|WaveModal" frontend/app frontend/ui frontend/wave.ts
→ no active frontend import sites outside RTModal component/story files

rg "@/ui/components/RTPopover|from [\"']@/ui/components/RTPopover|Popover|PopoverButton|PopoverContent" frontend/app frontend/ui frontend/wave.ts
→ active import sites confirmed (notificationpopover.tsx, workspaceswitcher.tsx, RTEmojiPalette.tsx)

node frontend/scripts/check-ui-component-contract.mjs
→ ✓ RTButton, RTMagnify, RTInput, RTTooltip, RTPopover pass

cd frontend && node scripts/check-ui-component-contract.mjs && cd ..
→ ✓ same pass from frontend working directory

npm --prefix frontend run lint:ui-contract
→ ✓ pass

npm --prefix frontend run lint
→ 15 warnings (0 errors), unchanged pre-existing warnings

npx tsc -p frontend/tsconfig.json --noEmit
→ exit 0

npm --prefix frontend run build
→ ✓ build succeeded (vite warnings only: large chunks / ineffective dynamic import)
```

## Superseded Record Notice

The next section is retained as historical record, but its scope conclusion is superseded by this correction.  
Specifically superseded claims:
- a valid 2-component active batch
- all `ui/components` items registered as compliant active batch items
- `RTModal` as part of a compliant active batch

---

# Superseded (2026-04-18): Frontend Component Layer Migration Batch

**Date:** 2026-04-18
**Scope:** Migrate RTModal and RTPopover (all components in ui/components) to four-file contract; register both in manifest

## Components Migrated

### RTModal
**Files created:**
- `frontend/ui/components/RTModal/RTModal.logic.ts` — ModalProps, ModalContentProps, ModalHeaderProps, ModalFooterProps, WaveModalProps
- `frontend/ui/components/RTModal/RTModal.template.tsx` — Modal, ModalContent, ModalHeader, ModalFooter, WaveModal; imports `./RTModal.style.scss`
- `frontend/ui/components/RTModal/RTModal.style.scss` — moved from RTModal.scss
- `frontend/ui/components/RTModal/RTModal.story.tsx` — ModalDemo, WaveModalDemo (no Storybook runtime)
- `frontend/ui/components/RTModal/index.ts` — updated to export from new files

**Files removed:**
- `frontend/ui/components/RTModal/RTModal.tsx`
- `frontend/ui/components/RTModal/RTModal.scss`

**Note:** RTModal has no active import sites in the current frontend. Migrated to establish convention and avoid a future contract violation.

### RTPopover
**Files created:**
- `frontend/ui/components/RTPopover/RTPopover.logic.ts` — PopoverProps, PopoverButtonProps, PopoverContentProps
- `frontend/ui/components/RTPopover/RTPopover.template.tsx` — Popover, PopoverButton, PopoverContent (forwardRef/memo); imports `./RTPopover.style.scss`
- `frontend/ui/components/RTPopover/RTPopover.style.scss` — moved from RTPopover.scss
- `frontend/ui/components/RTPopover/RTPopover.story.tsx` — PopoverDemo, PopoverTopDemo (no Storybook runtime)
- `frontend/ui/components/RTPopover/index.ts` — updated to export from new files

**Files removed:**
- `frontend/ui/components/RTPopover/RTPopover.tsx`
- `frontend/ui/components/RTPopover/RTPopover.scss`

**Active import sites:** none required updating (all 3 sites use barrel `@/ui/components/RTPopover`)

## Contract Manifest Update

`frontend/ui/component-contract.json` now registers 6 components:
- RTButton (primitive)
- RTMagnify (primitive)
- RTInput (primitive)
- RTTooltip (primitive)
- RTModal (component) ← new
- RTPopover (component) ← new

## Commands Run and Results

```
node frontend/scripts/check-ui-component-contract.mjs
→ ✓ all 6 components pass

cd frontend && node scripts/check-ui-component-contract.mjs
→ ✓ all 6 components pass

npm --prefix frontend run lint
→ 15 warnings (0 errors) — same pre-existing warnings, unchanged

npx tsc -p frontend/tsconfig.json --noEmit
→ exit 0

npm --prefix frontend run build
→ ✓ built in 3.27s
```

## Runtime and API Smoke

```
/healthz                           → {"status":"ok"}
/api/v1/workspace                  → HTTP 200
/api/v1/terminal/term-main?from=0  → HTTP 200
```

## Intentional Exclusions

- Checker still applies only to manifest-registered components
- widgets/layout/app layers not touched
- Storybook runtime not added
- Only ui/components targeted in this slice

---

# Previous: Frontend UI Contract Repair for RTTooltip

**Date:** 2026-04-18  
**Scope:** Fix RTTooltip missing style import; harden checker to prevent false-positive passes

## Original Rejection Reason

During primitive batch migration, RTTooltip was registered in the contract but did not import its own style file in RTTooltip.template.tsx. This violated the component contract while passing the file-existence checker (false positive).

## Fix Applied

### RTTooltip.template.tsx
- **Added:** `import "./RTTooltip.style.scss";` at the top of imports
- **Location:** Colocated with other local imports (after foreign imports, before function definitions)
- **Behavior:** Preserved; no changes to Tooltip or TooltipInner logic

## Checker Hardening

**File:** frontend/scripts/check-ui-component-contract.mjs

### New Content Validation Rule
For every registered component, the checker now validates that `<Name>.template.tsx` contains:
```javascript
import "./<Name>.style.scss";
```

### Implementation
- Pattern matching using regex: `import\s+["\']\./<Name>\.style\.scss["\']`
- Fails with actionable error if import is missing
- Only applies to manifest-registered components
- Still works from both repo root and frontend directory

### Error Message Format
```
[ui-contract] <ComponentName>: template file must import "./<ComponentName>.style.scss" (missing from <path>)
```

## Validation Results

### Hardened Checker (All Registered Components)
```bash
node frontend/scripts/check-ui-component-contract.mjs
✓ RTButton has all required files
✓ RTMagnify has all required files
✓ RTInput has all required files
✓ RTTooltip has all required files
```

### Alternative Paths
```bash
cd frontend && node scripts/check-ui-component-contract.mjs && cd ..
✓ Works from both repo root and frontend directory
```

### TypeScript
```bash
npx tsc -p frontend/tsconfig.json --noEmit
✓ No errors
```

### ESLint (active scope)
```bash
npm --prefix frontend run lint
✓ 15 pre-existing warnings (unchanged)
```

### Frontend Build
```bash
npm --prefix frontend run build
✓ Built in 3.48s
```

### Backend Service
```bash
RTERM_AUTH_TOKEN=ui-contract-repair-token \
  apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:52762 \
  --workspace-root "$PWD" \
  --state-dir /tmp/runa-ui-contract-repair-state
✓ Running
```

### Frontend Dev Server
```bash
VITE_RTERM_API_BASE=http://127.0.0.1:52762 \
  VITE_RTERM_AUTH_TOKEN=ui-contract-repair-token \
  npm --prefix frontend run dev -- --host 127.0.0.1 --port 4182 --strictPort
✓ Running in 238ms
```

### Smoke Tests
```bash
curl -sf http://127.0.0.1:52762/healthz
✓ Backend healthy

curl -sf http://127.0.0.1:52762/api/v1/workspace
✓ Workspace API accessible

curl -sf http://127.0.0.1:52762/api/v1/terminal/term-main?from=0
✓ Terminal API accessible

curl -s http://127.0.0.1:4182/
✓ Frontend HTML serving correctly
```

## Key Points

- **RTTooltip repair:** Style import now present in template
- **Checker hardening:** False-positive passes no longer possible for new registrations
- **Backward compatible:** Only checks registered components; unregistered primitives unaffected
- **Clear errors:** Actionable messages guide developers to fix violations
- **Works everywhere:** Supports both repo root and frontend directory execution paths

## Scope Adherence

- ✓ Fixed RTTooltip only (no other primitives touched)
- ✓ Hardened checker with single focused rule
- ✓ No new primitives registered
- ✓ No components/widgets/layout/app touched
- ✓ No API changes
- ✓ No backend/runtime changes
- ✓ No Storybook dependencies added
- ✓ No opportunistic refactoring

## Known Limitations

None. All four registered primitives now pass strict validation including content checks.

---

# Latest: Frontend Primitive Batch Migration

**Date:** 2026-04-18  
**Scope:** Migrate RTMagnify, RTInput, RTTooltip to four-file contract; register all with strict checker

## Summary

Three additional primitives (RTMagnify, RTInput, RTTooltip) successfully migrated to four-file convention. All four registered primitives now pass strict contract enforcement.

## Migrated Primitives

### RTMagnify (Very Low Complexity)
- **Files created:**
  - RTMagnify.logic.ts (MagnifyIconProps type)
  - RTMagnify.template.tsx (MagnifyIcon component with clsx)
  - RTMagnify.style.scss (SVG icon rotation animation)
  - RTMagnify.story.tsx (enabled/disabled state demo)
  - index.ts (barrel export)
- **Files removed:** RTMagnify.tsx, RTMagnify.scss
- **Dependencies:** None (pure component)
- **Imports:** Updated 4 usage sites automatically via barrel

### RTInput (Medium Complexity)
- **Files created:**
  - RTInput.logic.ts (InputProps, InputGroupProps, InputLeftElementProps, InputRightElementProps types)
  - RTInput.template.tsx (Input, InputGroup, InputLeftElement, InputRightElement components)
  - RTInput.style.scss (complete form styling with focus/disabled states)
  - RTInput.story.tsx (multiple state and configuration demos)
  - index.ts (barrel export)
- **Files removed:** RTInput.tsx, RTInput.scss
- **Dependencies:** None (pure React hooks)
- **Imports:** Used by RTSearch, RTEmojiPalette, workspaceeditor, preview, modals (5 sites)

### RTTooltip (Medium Complexity)
- **Files created:**
  - RTTooltip.logic.ts (TooltipProps type)
  - RTTooltip.template.tsx (Tooltip and TooltipInner components with @floating-ui/react)
  - RTTooltip.style.scss (placeholder; styling via tailwind classes)
  - RTTooltip.story.tsx (placement and state demos)
  - index.ts (barrel export)
- **Files removed:** RTTooltip.tsx
- **Dependencies:** @floating-ui/react library only (not app coupling)
- **Imports:** Used by builder, workspace, waveconfig, aipanel (5 sites)

## Contract Manifest Registration

**File:** frontend/ui/component-contract.json

All four primitives now registered:
```json
{
  "components": [
    { "name": "RTButton", "layer": "primitive", "dir": "ui/primitives/RTButton" },
    { "name": "RTMagnify", "layer": "primitive", "dir": "ui/primitives/RTMagnify" },
    { "name": "RTInput", "layer": "primitive", "dir": "ui/primitives/RTInput" },
    { "name": "RTTooltip", "layer": "primitive", "dir": "ui/primitives/RTTooltip" }
  ]
}
```

## Validation Commands and Results

### Strict Contract Checker
```bash
node frontend/scripts/check-ui-component-contract.mjs
✓ RTButton has all required files
✓ RTMagnify has all required files
✓ RTInput has all required files
✓ RTTooltip has all required files
```

### TypeScript
```bash
npx tsc -p frontend/tsconfig.json --noEmit
✓ No errors
```

### ESLint (active scope)
```bash
npm --prefix frontend run lint:active
✓ 15 pre-existing warnings (unchanged)
```

### Frontend Build
```bash
npm --prefix frontend run build
✓ Built in 3.31s
```

### Backend Service
```bash
RTERM_AUTH_TOKEN=ui-primitive-batch-token \
  apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:52761 \
  --workspace-root "$PWD" \
  --state-dir /tmp/runa-ui-primitive-batch-state
✓ Running
```

### Frontend Dev Server
```bash
VITE_RTERM_API_BASE=http://127.0.0.1:52761 \
  VITE_RTERM_AUTH_TOKEN=ui-primitive-batch-token \
  npm --prefix frontend run dev -- --host 127.0.0.1 --port 4181 --strictPort
✓ Running in 229ms
```

### Smoke Tests
```bash
curl -sf http://127.0.0.1:52761/healthz
✓ Backend healthy

curl -sf http://127.0.0.1:52761/api/v1/workspace
✓ Workspace API accessible

curl -sf http://127.0.0.1:52761/api/v1/terminal/term-main?from=0
✓ Terminal API accessible

curl -s http://127.0.0.1:4181/
✓ Frontend HTML serving correctly
```

## Key Points

- **No API renames:** All public exports remain as-is (MagnifyIcon, Input/InputGroup/InputLeftElement/InputRightElement, Tooltip)
- **Strict enforcement:** Contract checker now fails on any old-style files (.tsx, .scss) for registered components
- **Pure primitives:** All three have zero coupling to app/runtime/api layers
- **Barrel imports working:** All existing usage sites continue to work without changes
- **Storybook NOT added:** Static .story.tsx files created without any Storybook runtime dependency
- **Only registered components checked:** Checker still only inspects RTButton, RTMagnify, RTInput, RTTooltip; unregistered primitives are free to keep legacy structure

## Scope Adherence

- ✓ Only 3 primitives migrated (not 5+)
- ✓ No components/widgets/layout touched
- ✓ No public API renames
- ✓ No Storybook runtime added
- ✓ No app/runtime coupling introduced
- ✓ Strict checker scope unchanged (manifest-only)
- ✓ No opportunistic cleanup
- ✓ Backend unchanged

## Known Limitations

None. All four registered primitives pass strict validation.

---

# Frontend RTButton Contract Completion Validation

**Date:** 2026-04-18  
**Scope:** RTButton four-file convention migration and strict UI component contract enforcement

## Summary

RTButton has been successfully migrated to the four-file component convention and the UI component contract checker has been made strict for registered components.

## Changes

### RTButton File Structure
- ✓ `RTButton.style.scss` — All CSS moved from legacy RTButton.scss
- ✓ `RTButton.logic.ts` — ButtonProps type and helper functions (normalizeButtonClassName)
- ✓ `RTButton.template.tsx` — React render component with memo/forwardRef
- ✓ `RTButton.story.tsx` — Static demo component (no Storybook runtime)
- ✓ `index.ts` — Barrel export for public API

### Old Files Removed
- ✓ RTButton.tsx (removed)
- ✓ RTButton.scss (removed)

### Imports Normalized
- ✓ All RTButton imports use barrel path `@/ui/primitives/RTButton`
- ✓ No direct imports from old files found

### Contract Checker Updated
- ✓ `check-ui-component-contract.mjs` now enforces strict validation
- ✓ Old-style files (.tsx, .scss) now cause **error** (not warning) for registered components
- ✓ Error messages are clear and actionable

### Component Registration
- ✓ RTButton registered in `component-contract.json`
- ✓ Only RTButton registered (strict scope enforcement)

## Validation Commands Run

```bash
# Contract checker
node frontend/scripts/check-ui-component-contract.mjs
✓ RTButton has all required files

# From frontend directory
npm run lint:ui-contract
✓ lint:ui-contract passed

# TypeScript
npx tsc -p frontend/tsconfig.json --noEmit
✓ No errors

# Frontend build
npm --prefix frontend run build
✓ Built in 3.27s

# Build core
npm run build:core
✓ Completed

# Backend service
RTERM_AUTH_TOKEN=ui-contract-token \
  apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:52760 \
  --workspace-root "$PWD" \
  --state-dir /tmp/runa-ui-contract-state
✓ Running

# Frontend dev server
VITE_RTERM_API_BASE=http://127.0.0.1:52760 \
  VITE_RTERM_AUTH_TOKEN=ui-contract-token \
  npm --prefix frontend run dev -- --host 127.0.0.1 --port 4180 --strictPort
✓ Running and serving HTML

# Smoke tests
curl -sf http://127.0.0.1:52760/healthz
✓ Backend health check passed

curl -sf http://127.0.0.1:52760/api/v1/workspace
✓ Workspace API accessible

curl -sf http://127.0.0.1:52760/api/v1/terminal/term-main?from=0
✓ Terminal API accessible

curl -s http://127.0.0.1:4180/
✓ Frontend serves HTML without errors
```

## Validation Results

| Check | Result | Notes |
|-------|--------|-------|
| Contract checker (strict mode) | ✓ PASS | RTButton has all required files, no old files found |
| TypeScript compilation | ✓ PASS | No type errors |
| Frontend build | ✓ PASS | 3.27s build time |
| Backend service startup | ✓ PASS | Healthz and API endpoints responsive |
| Frontend dev server | ✓ PASS | Vite ready in 233ms, HTML serving correctly |
| API smoke tests | ✓ PASS | Workspace and terminal endpoints working |

## Public API Preservation

- ✓ Button component name preserved (not renamed to RTButton)
- ✓ ButtonProps type exported from public barrel
- ✓ forwardRef behavior maintained
- ✓ memo optimization maintained
- ✓ disabled and tabIndex behavior unchanged
- ✓ Default category (solid) preserved
- ✓ Default color (green) preserved
- ✓ className normalization logic unchanged

## Known Limitations

None. RTButton migration is complete and strict enforcement is active.

## Scope Adherence

- ✓ Only RTButton migrated (no other primitives)
- ✓ Only RTButton registered in contract manifest
- ✓ No Storybook runtime added
- ✓ No backend/runtime changes
- ✓ No widget/layout changes
- ✓ All existing imports working
