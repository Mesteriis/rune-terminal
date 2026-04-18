# Frontend Single-Item Widget Assessment

**Date:** 2026-04-18  
**Scope:** Compare `RTAIPanelWidget` vs `RTTerminalWidget` to identify the safer first single-item widget contract-migration target.

## Latest Execution Boundary Check: `byokannouncement`

- Current parent import path in use:
  - `frontend/ui/widgets/RTAIPanelWidget/aipanel.tsx` imports `BYOKAnnouncement` from `./byokannouncement`.
- Current export/import path to preserve: `./byokannouncement` (relative local path used by parent remains unchanged).
- Direct imports outside `RTAIPanelWidget`: none found in `frontend/app`, `frontend/ui`, or `frontend/wave.ts`.
- Dedicated SCSS state: no dedicated `byokannouncement` SCSS file exists today; this execution slice must introduce `byokannouncement.style.scss`.
- Boundary confirmation: this execution slice stays inside the approved leaf boundary (`byokannouncement` local files plus minimal local import rewiring only inside `RTAIPanelWidget`).

## Post-aifeedbackbuttons remaining RTAIPanelWidget assessment

### Scope filter for this reassessment

- Completed local contract sub-slices excluded:
  - `agent-selection-strip*`
  - `run-command-approval*`
  - `execution-block-list*`
  - `airatelimitstrip*`
  - `aifeedbackbuttons*`
- Remaining files assessed in this pass: **21**

### Commands used

```bash
find frontend/ui/widgets/RTAIPanelWidget -maxdepth 1 -type f | sort | rg -v 'agent-selection-strip|run-command-approval|execution-block-list|airatelimitstrip|aifeedbackbuttons'
rg --no-heading -n "from ['\"](\\./|@/ui/widgets/RTAIPanelWidget)" frontend/ui/widgets/RTAIPanelWidget
rg --no-heading -n "RTAIPanelWidget/(ai-utils|aidroppedfiles|aimessage|aimode|aipanel-compat|aipanel-contextmenu|aipanel|aipanelheader|aipanelinput|aipanelmessages|aitooluse|aitypes|byokannouncement|compat-context|compat-conversation|restorebackupmodal|run-command|telemetryrequired|waveai-focus-utils|waveai-model)" frontend
```

### Remaining file classification

| File | Role classification | Direct local imports/dependents (relevant) | Still leaf-like? | Brief risk note |
|---|---|---|---|---|
| `ai-utils.ts` | runtime/action logic | depended by `aipanel*`, `aimessage`, `aimode`, `waveai-model`, `compat-conversation`, `aidroppedfiles` | No | Shared helper spine; very large blast radius. |
| `aidroppedfiles.tsx` | possible leaf UI candidate | imports `ai-utils`, `waveai-model`; used by `aipanel.tsx` and `aipanel-compat.tsx` | Partially | UI-shaped but directly mutates model attachment state. |
| `aimessage.tsx` | widget composition/orchestration | imports `aifeedbackbuttons`, `aitooluse`, `aitypes`, `ai-utils`, `waveai-model`; used by `aipanelmessages.tsx` | No | Central message renderer and subflow orchestrator. |
| `aimode.tsx` | conversation/model/state logic | imports `ai-utils`, `waveai-model`; used by `aipanel.tsx`, `aipanelmessages.tsx` | No | Mode switching coupled to settings, telemetry, and model behavior. |
| `aipanel-compat.tsx` | compat bridge | imports many local modules; used by `aipanel.tsx` | No | Primary compat orchestration surface. |
| `aipanel-contextmenu.ts` | runtime/action logic | imports `compat-context`, `waveai-model`; used by `aipanel.tsx`, `aipanelheader.tsx`, `aipanel-compat.tsx` | No | Context actions shared across orchestration paths. |
| `aipanel.tsx` | widget composition/orchestration | imports many local modules; widget entrypoint | No | Main panel orchestrator with broad coupling. |
| `aipanelheader.tsx` | widget composition/orchestration | imports `aipanel-contextmenu`, `waveai-model`; used by `aipanel.tsx`, `aipanel-compat.tsx` | No | Header controls tied to model/context menu behavior. |
| `aipanelinput.tsx` | conversation/model/state logic | imports `ai-utils`, `waveai-focus-utils`, `waveai-model`; used by `aipanel.tsx`, `aipanel-compat.tsx`, `waveai-model.tsx` | No | Input/focus/attachments path, not a leaf boundary. |
| `aipanelmessages.tsx` | widget composition/orchestration | imports `aimessage`, `aimode`, `aitypes`, `waveai-model`; used by `aipanel.tsx`, `aipanel-compat.tsx` | No | Message container orchestration layer. |
| `aitooluse.tsx` | runtime/action logic | imports `aitypes`, `restorebackupmodal`, `waveai-model`; used by `aimessage.tsx` | No | Tool approval + restore + block highlight actions. |
| `aitypes.ts` | conversation/model/state logic | depended by `waveai-model`, `aipanel*`, `aimessage`, `aitooluse`, `run-command`, `compat-conversation` | No | Shared type contract across most AI panel flows. |
| `byokannouncement.tsx` | possible leaf UI candidate | imports `waveai-model`; used by `aipanel.tsx` | Partially | Isolated UI card, but includes telemetry/event + config open side effects. |
| `compat-context.ts` | compat bridge | used by `waveai-model.tsx`, `aipanel.tsx`, `aipanel-contextmenu.ts` | No | Global compat/runtime context boundary. |
| `compat-conversation.ts` | compat bridge | imports `ai-utils`, `aitypes`; used by `aipanel-compat.tsx` | No | Compat conversation mapping core. |
| `restorebackupmodal.tsx` | runtime/action logic | imports `aitypes`, `waveai-model`; used by `aitooluse.tsx` | Partially | Modal UI wrapped around restore side-effect flow. |
| `run-command.test.ts` | unknown/high-risk | test-only dependent on `run-command.ts` | No | Non-runtime test target, not a migration leaf. |
| `run-command.ts` | runtime/action logic | imports `aitypes`; used by `aipanel-compat.tsx` and tests | No | Command execution/approval flow core. |
| `telemetryrequired.tsx` | possible leaf UI candidate | imports `waveai-model`; used by `aipanel.tsx` | Partially | UI-first, but directly triggers telemetry-enable RPC flow. |
| `waveai-focus-utils.ts` | conversation/model/state logic | used by `aipanel.tsx`, `aipanel-compat.tsx`, `aipanel-contextmenu.ts`, `aipanelinput.tsx`, `app/store/focusManager.ts` | No | Shared focus utility crossing widget/app boundary. |
| `waveai-model.tsx` | conversation/model/state logic | depended by many local + app/layout files | No | Highest-coupling state singleton/runtime bridge. |

### One Safe Leaf Still Remains

- Remaining safe leaf-only candidate: `frontend/ui/widgets/RTAIPanelWidget/byokannouncement.tsx`
- Why this is safer than other remaining files:
  - Single local dependent (`aipanel.tsx`) with a stable local import path (`./byokannouncement`).
  - No local subcomponent orchestration and no compat bridge responsibilities.
  - Narrow behavior surface (announcement UI + two click handlers), smaller than `aidroppedfiles.tsx`, `telemetryrequired.tsx`, or `restorebackupmodal.tsx`.
- Why the other leaf-like files are deferred:
  - `aidroppedfiles.tsx`: directly mutates attachment state and is shared by both `aipanel.tsx` and `aipanel-compat.tsx`.
  - `telemetryrequired.tsx`: directly performs telemetry-enable RPC flow and error-state transitions.
  - `restorebackupmodal.tsx`: tied to tool-use restore state machine and modal lifecycle.
- Exact future slice boundary:
  - In scope: `frontend/ui/widgets/RTAIPanelWidget/byokannouncement.tsx` only.
  - Allowed: minimal local import rewiring inside `frontend/ui/widgets/RTAIPanelWidget` only, if required to preserve path.
  - Out of scope:
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
- Future execution stop conditions:
  - Stop if preserving `./byokannouncement` import path requires broader orchestration edits.
  - Stop if split requires changes to `waveai-model.tsx`, `aipanel.tsx`, or app-layer RPC files.
  - Stop if checker or manifest updates become necessary.

## Latest Execution Boundary Check: `aifeedbackbuttons`

- Current parent import path in use:
  - `frontend/ui/widgets/RTAIPanelWidget/aimessage.tsx` imports `AIFeedbackButtons` from `./aifeedbackbuttons`.
- Current export/import path to preserve: `./aifeedbackbuttons` (relative local path used by parent remains unchanged).
- Direct imports outside `RTAIPanelWidget`: none found in `frontend/app`, `frontend/ui`, or `frontend/wave.ts`.
- Dedicated SCSS state: no dedicated `aifeedbackbuttons` SCSS file exists today; this execution slice must introduce `aifeedbackbuttons.style.scss`.
- Boundary confirmation: this execution slice stays inside the approved leaf boundary (`aifeedbackbuttons` local files plus minimal local import rewiring only inside `RTAIPanelWidget`).

## Post-airatelimitstrip remaining RTAIPanelWidget assessment

### Scope filter for this reassessment

- Completed local contract sub-slices excluded:
  - `agent-selection-strip*`
  - `run-command-approval*`
  - `execution-block-list*`
  - `airatelimitstrip*`
- Remaining files assessed in this pass: **22**

### Commands used

```bash
find frontend/ui/widgets/RTAIPanelWidget -maxdepth 1 -type f | sort | rg -v 'agent-selection-strip|run-command-approval|execution-block-list|airatelimitstrip'
rg "from ['\"](\\./|@/ui/widgets/RTAIPanelWidget)" frontend/ui/widgets/RTAIPanelWidget -n
rg "RTAIPanelWidget/(ai-utils|aidroppedfiles|aifeedbackbuttons|aimessage|aimode|aipanel-compat|aipanel-contextmenu|aipanel|aipanelheader|aipanelinput|aipanelmessages|aitooluse|aitypes|byokannouncement|compat-context|compat-conversation|restorebackupmodal|run-command|telemetryrequired|waveai-focus-utils|waveai-model)" frontend -n
```

### Remaining file classification

| File | Role classification | Direct local imports/dependents (relevant) | Still leaf-like? | Brief risk note |
|---|---|---|---|---|
| `ai-utils.ts` | runtime/action logic | depended by many local files (`aipanel*`, `aimessage`, `aimode`, `waveai-model`, `compat-conversation`, `aidroppedfiles`) | No | Large shared helper core; broad blast radius. |
| `aidroppedfiles.tsx` | possible leaf UI candidate | imports `ai-utils`, `waveai-model`; used by `aipanel.tsx` and `aipanel-compat.tsx` | Partially | UI leaf shape, but mutates model file state. |
| `aifeedbackbuttons.tsx` | possible leaf UI candidate | imports `waveai-model`; used by `aimessage.tsx` | Yes | Small, isolated UI; feedback + clipboard side effects only. |
| `aimessage.tsx` | widget composition/orchestration | imports `aifeedbackbuttons`, `aitooluse`, `aitypes`, `ai-utils`, `waveai-model`; used by `aipanelmessages.tsx` | No | Central renderer orchestrating multiple subflows. |
| `aimode.tsx` | conversation/model/state logic | imports `ai-utils`, `waveai-model`; used by `aipanel.tsx`, `aipanelmessages.tsx` | No | Mode selection tied to settings, telemetry, and model state. |
| `aipanel-compat.tsx` | compat bridge | imports many local modules; used by `aipanel.tsx` | No | Primary compat orchestration surface. |
| `aipanel-contextmenu.ts` | runtime/action logic | imports `compat-context`, `waveai-model`; used by `aipanel.tsx`, `aipanelheader.tsx`, `aipanel-compat.tsx` | No | Shared action menu path with RPC writes. |
| `aipanel.tsx` | widget composition/orchestration | imports many local modules; widget entrypoint | No | Main panel orchestrator. |
| `aipanelheader.tsx` | widget composition/orchestration | imports `aipanel-contextmenu`, `waveai-model`; used by `aipanel.tsx`, `aipanel-compat.tsx` | No | Header actions coupled to context menu/model state. |
| `aipanelinput.tsx` | conversation/model/state logic | imports `ai-utils`, `waveai-focus-utils`, `waveai-model`; used by `aipanel.tsx`, `aipanel-compat.tsx`, `waveai-model.tsx` | No | Input/focus/attachments pipeline; non-leaf coupling. |
| `aipanelmessages.tsx` | widget composition/orchestration | imports `aimessage`, `aimode`, `aitypes`, `waveai-model`; used by `aipanel.tsx`, `aipanel-compat.tsx` | No | Message stack orchestration container. |
| `aitooluse.tsx` | runtime/action logic | imports `aitypes`, `restorebackupmodal`, `waveai-model`; used by `aimessage.tsx` | No | Tool approval, restore, highlight, diff actions. |
| `aitypes.ts` | conversation/model/state logic | depended by many local files (`waveai-model`, `aipanel*`, `aimessage`, `aitooluse`, `run-command`, `compat-conversation`) | No | Shared type contract spine. |
| `byokannouncement.tsx` | runtime/action logic | imports `waveai-model`; used by `aipanel.tsx` | Partially | Simple UI but triggers RPC/event actions. |
| `compat-context.ts` | compat bridge | used by `waveai-model.tsx`, `aipanel.tsx`, `aipanel-contextmenu.ts` | No | Runtime compat switch context, shared infra boundary. |
| `compat-conversation.ts` | compat bridge | imports `ai-utils`, `aitypes`; used by `aipanel-compat.tsx` | No | Conversation mapping boundary to compat APIs. |
| `restorebackupmodal.tsx` | runtime/action logic | imports `aitypes`, `waveai-model`; used by `aitooluse.tsx` | Partially | Modal leaf shape with restore side effects. |
| `run-command.test.ts` | unknown/high-risk | test-only dependent on `run-command.ts` | No | Not a runtime migration target. |
| `run-command.ts` | runtime/action logic | imports `aitypes`; used by `aipanel-compat.tsx` + tests | No | Terminal execution/approval pathway core. |
| `telemetryrequired.tsx` | runtime/action logic | imports `waveai-model`; used by `aipanel.tsx` | Partially | UI leaf shape with telemetry enable RPC side effect. |
| `waveai-focus-utils.ts` | conversation/model/state logic | used by `aipanel.tsx`, `aipanel-compat.tsx`, `aipanel-contextmenu.ts`, `aipanelinput.tsx`, `app/store/focusManager.ts` | No | Shared focus/selection behavior utility. |
| `waveai-model.tsx` | conversation/model/state logic | depended by many local + app/layout files | No | Highest coupling state singleton and runtime bridge. |

### One Safe Leaf Still Remains

- Remaining safe leaf-only candidate: `frontend/ui/widgets/RTAIPanelWidget/aifeedbackbuttons.tsx`
- Why this remains safer than the rest:
  - Single local dependent (`aimessage.tsx`) and narrow prop surface (`messageText`).
  - No direct compat bridge imports and no coupling to `aipanel.tsx` / `aipanel-compat.tsx`.
  - Behavior is self-contained to local UI feedback/copy actions; does not orchestrate conversation/runtime pipelines.
- Exact future slice boundary:
  - In scope: `frontend/ui/widgets/RTAIPanelWidget/aifeedbackbuttons.tsx` only.
  - Allowed: minimal local import rewiring inside `frontend/ui/widgets/RTAIPanelWidget` only, if needed to preserve external path.
  - Out of scope:
    - `aipanel.tsx`
    - `aipanel-compat.tsx`
    - `waveai-model.tsx`
    - `run-command.ts`
    - `compat-conversation.ts`
    - `compat-context.ts`
    - `aipanelmessages.tsx`
    - `aimessage.tsx` (except minimal import rewiring only)
    - `ai-utils.ts`
    - `aitypes.ts`
    - all app/layout/runtime/api files
    - checker and manifest changes
- Future execution stop conditions:
  - Stop if preserving the existing `./aifeedbackbuttons` import path requires broad edits outside minimal local rewiring.
  - Stop if implementation forces changes in model/compat/orchestration files beyond allowed rewiring.
  - Stop if manifest/checker changes become necessary.

## Latest Execution Boundary Check: `airatelimitstrip`

- Current parent import paths in use:
  - `frontend/ui/widgets/RTAIPanelWidget/aipanel.tsx` imports `AIRateLimitStrip` from `./airatelimitstrip`.
  - `frontend/ui/widgets/RTAIPanelWidget/aipanel-compat.tsx` imports `AIRateLimitStrip` from `./airatelimitstrip`.
- Current export path to preserve for parent wiring: `./airatelimitstrip` (relative import path remains unchanged for parent widget files).
- Direct imports outside `RTAIPanelWidget`: none found in `frontend/app`, `frontend/ui`, or `frontend/wave.ts`.
- Dedicated SCSS state: no dedicated `airatelimitstrip` SCSS file exists today; this execution slice must introduce a local `airatelimitstrip.style.scss` file as part of the local contract split.
- Boundary confirmation: this sub-slice remains inside the approved leaf boundary (`airatelimitstrip` local files plus minimal local import rewiring inside `RTAIPanelWidget` only). Existing app-store atom coupling is preserved as-is and does not require broader refactor.

## Latest Execution Boundary Check: `execution-block-list`

- Current parent import path in use: `frontend/ui/widgets/RTAIPanelWidget/aipanel-compat.tsx` imports `ExecutionBlockList` from `./execution-block-list`.
- Current export path to preserve for parent wiring: `./execution-block-list` (relative import path remains unchanged for the parent widget).
- Direct imports outside `RTAIPanelWidget`: none found in `frontend/app`, `frontend/ui/widgets`, or `frontend/wave.ts`.
- Dedicated SCSS state: no dedicated `execution-block-list` SCSS file exists today; this execution slice must introduce a local `execution-block-list.style.scss` file as part of the local contract split.
- Boundary confirmation: execution remains inside the approved leaf boundary (`execution-block-list` local files plus minimal local import rewiring inside `RTAIPanelWidget` only).

## Latest Execution Boundary Check: `run-command-approval`

- Current parent import path in use: `frontend/ui/widgets/RTAIPanelWidget/aipanel-compat.tsx` imports `PendingRunApprovalEntry` and `RunCommandApprovalList` from `./run-command-approval`.
- Current export path to preserve for parent wiring: `./run-command-approval` (relative import path remains unchanged for the parent widget).
- Direct imports outside `RTAIPanelWidget`: none found in `frontend/app`, `frontend/ui/widgets`, or `frontend/wave.ts`.
- Dedicated SCSS state: no dedicated `run-command-approval` SCSS file exists today; this execution slice must introduce a local `run-command-approval.style.scss` file as part of the local contract split.
- Boundary confirmation: execution remains inside the approved leaf boundary (`run-command-approval` local files plus minimal local import rewiring inside `RTAIPanelWidget` only).

## Latest Execution Boundary Check: `agent-selection-strip`

- Current parent import path in use: `frontend/ui/widgets/RTAIPanelWidget/aipanel-compat.tsx` imports `AgentSelectionStrip` from `./agent-selection-strip`.
- Current export path to preserve for parent wiring: `./agent-selection-strip` (relative import path remains unchanged for the parent widget).
- Direct imports outside `RTAIPanelWidget`: none found in `frontend/app`, `frontend/ui/widgets`, or `frontend/wave.ts`.
- Dedicated SCSS state: no dedicated `agent-selection-strip` SCSS file exists today; this execution slice must introduce a local `agent-selection-strip.style.scss` file as part of the local contract split.
- Boundary confirmation: execution remains inside the approved leaf boundary (`agent-selection-strip` local files plus minimal local import rewiring inside `RTAIPanelWidget` only).

## Leaf batch eligibility assessment

### Scope filter for remaining files

Excluded completed local contract sub-slices:
- `agent-selection-strip*`
- `run-command-approval*`
- `execution-block-list*`

Remaining files assessed in this section: **23**

### Local graph commands

```bash
find frontend/ui/widgets/RTAIPanelWidget -maxdepth 1 -type f | sort
rg --no-heading -n "from ['\"]\\./|^import ['\"]\\./" frontend/ui/widgets/RTAIPanelWidget
rg --no-heading -n "@/ui/widgets/RTAIPanelWidget" frontend/app frontend/ui frontend/wave.ts
```

### Remaining file classification and batch participation

| File | Role classification | Local dependencies / dependents | Risk level | Can participate in same-slice batch? |
|---|---|---|---|---|
| `ai-utils.ts` | runtime/action logic | imports: none; dependents: `aidroppedfiles.tsx`, `aimessage.tsx`, `aimode.tsx`, `aipanel-compat.tsx`, `aipanel.tsx`, `compat-conversation.ts`, `waveai-model.tsx` | High | No |
| `aidroppedfiles.tsx` | maybe-leaf but medium-risk | imports: `ai-utils.ts`, `waveai-model.tsx`; dependents: `aipanel-compat.tsx`, `aipanel.tsx` | Medium | No |
| `aifeedbackbuttons.tsx` | maybe-leaf but medium-risk | imports: `waveai-model.tsx`; dependents: `aimessage.tsx` | Medium | No |
| `aimessage.tsx` | orchestration | imports: `ai-utils.ts`, `aifeedbackbuttons.tsx`, `aitooluse.tsx`, `aitypes.ts`, `waveai-model.tsx`; dependents: `aipanelmessages.tsx` | High | No |
| `aimode.tsx` | state/model/conversation logic | imports: `ai-utils.ts`, `waveai-model.tsx`; dependents: `aipanel.tsx`, `aipanelmessages.tsx` | Medium-high | No |
| `aipanel-compat.tsx` | orchestration | imports: multiple local modules; dependent: `aipanel.tsx` | High | No |
| `aipanel-contextmenu.ts` | compat bridge | imports: `compat-context.ts`, `waveai-model.tsx`; dependents: `aipanel-compat.tsx`, `aipanel.tsx`, `aipanelheader.tsx` | High | No |
| `aipanel.tsx` | orchestration | imports: multiple local modules; dependents: none (entry component) | High | No |
| `aipanelheader.tsx` | orchestration | imports: `waveai-model.tsx` and context-menu path; dependents: `aipanel-compat.tsx`, `aipanel.tsx` | Medium-high | No |
| `aipanelinput.tsx` | state/model/conversation logic | imports: local helpers via absolute path (`ai-utils`, `waveai-focus-utils`, `waveai-model`); dependents: `aipanel-compat.tsx`, `aipanel.tsx`, `waveai-model.tsx` | Medium-high | No |
| `aipanelmessages.tsx` | orchestration | imports: `aimessage.tsx`, `aimode.tsx`, `aitypes.ts`, `waveai-model.tsx`; dependents: `aipanel-compat.tsx`, `aipanel.tsx` | High | No |
| `airatelimitstrip.tsx` | safe leaf candidate | imports: none (local); dependents: `aipanel-compat.tsx`, `aipanel.tsx` | Low | Yes (candidate) |
| `aitooluse.tsx` | runtime/action logic | imports: `aitypes.ts`, `restorebackupmodal.tsx`, `waveai-model.tsx`; dependents: `aimessage.tsx` | High | No |
| `aitypes.ts` | state/model/conversation logic | imports: none; dependents: `aimessage.tsx`, `aipanel-compat.tsx`, `aipanel.tsx`, `aipanelmessages.tsx`, `aitooluse.tsx`, `compat-conversation.ts`, `restorebackupmodal.tsx`, `run-command.ts` | High | No |
| `byokannouncement.tsx` | runtime/action logic | imports: `waveai-model.tsx`; dependent: `aipanel.tsx` | Medium-high | No |
| `compat-context.ts` | compat bridge | imports: none; dependents: `aipanel-contextmenu.ts`, `aipanel.tsx`, `waveai-model.tsx` | Medium-high | No |
| `compat-conversation.ts` | compat bridge | imports: `ai-utils.ts`, `aitypes.ts`; dependent: `aipanel-compat.tsx` | High | No |
| `restorebackupmodal.tsx` | runtime/action logic | imports: `aitypes.ts`, `waveai-model.tsx`; dependent: `aitooluse.tsx` | High | No |
| `run-command.test.ts` | unknown/high-risk | imports: `run-command.ts`; dependents: none | Medium | No |
| `run-command.ts` | runtime/action logic | imports: `aitypes.ts`; dependents: `aipanel-compat.tsx`, `run-command.test.ts` | High | No |
| `telemetryrequired.tsx` | runtime/action logic | imports: `waveai-model.tsx`; dependent: `aipanel.tsx` | Medium-high | No |
| `waveai-focus-utils.ts` | state/model/conversation logic | imports: none; dependents include `aipanel.tsx`, `aipanel-compat.tsx`, `aipanel-contextmenu.ts`, `aipanelinput.tsx`, plus `app/store/focusManager.ts` | Medium-high | No |
| `waveai-model.tsx` | state/model/conversation logic | imports: `ai-utils.ts`, `aipanelinput.tsx`, `compat-context.ts`; dependents: many local files plus app/layout consumers | High | No |

### No Valid Leaf Batch Yet

- Result: there is no safe 2-3 file batch in the remaining `RTAIPanelWidget` files.
- Reason: only one file currently meets the low-risk leaf profile for same-slice batching (`airatelimitstrip.tsx`).
- Reason: other leaf-like files are medium-risk and include model/runtime side effects (`aidroppedfiles.tsx`, `aifeedbackbuttons.tsx`, `telemetryrequired.tsx`, `byokannouncement.tsx`) or are orchestration/compat/state cores.
- Decision: single-file mode must continue for the next widget local-contract execution slice.
- Next safest single-file candidate: `frontend/ui/widgets/RTAIPanelWidget/airatelimitstrip.tsx`.

## Next remaining leaf candidate assessment after run-command-approval

### Scope filter for remaining candidate set

Excluded from this assessment candidate set:
- `agent-selection-strip.logic.ts`
- `agent-selection-strip.template.tsx`
- `agent-selection-strip.style.scss`
- `agent-selection-strip.story.tsx`
- `agent-selection-strip.tsx`
- `run-command-approval.logic.ts`
- `run-command-approval.template.tsx`
- `run-command-approval.style.scss`
- `run-command-approval.story.tsx`
- `run-command-approval.tsx`

### Local graph commands

```bash
find frontend/ui/widgets/RTAIPanelWidget -maxdepth 1 -type f | sort
rg --no-heading -n "from ['\"]\\./|^import ['\"]\\./" frontend/ui/widgets/RTAIPanelWidget
rg --no-heading -n "@/ui/widgets/RTAIPanelWidget/" frontend/ui/widgets/RTAIPanelWidget frontend/app frontend/ui frontend/wave.ts
```

### Remaining file-by-file classification

| File | Role classification | Direct local imports / dependents | Leaf-like or orchestration-heavy | Risk note |
|---|---|---|---|---|
| `ai-utils.ts` | runtime/action logic | imports: none; depended by: `aidroppedfiles.tsx`, `aimessage.tsx`, `aimode.tsx`, `aipanel-compat.tsx`, `aipanel.tsx`, `aipanelinput.tsx`, `compat-conversation.ts`, `waveai-model.tsx` | orchestration-adjacent utility core | Large shared helper spine; changes fan out broadly. |
| `aidroppedfiles.tsx` | leaf UI candidate | imports: `ai-utils.ts`, `waveai-model.tsx`; depended by: `aipanel-compat.tsx`, `aipanel.tsx` | mostly leaf UI | Uses model mutation (`removeFile`), so not the lowest-risk leaf. |
| `aifeedbackbuttons.tsx` | leaf UI candidate | imports: `waveai-model.tsx`; depended by: `aimessage.tsx` | leaf UI | Includes feedback side effects + clipboard interaction. |
| `aimessage.tsx` | widget composition/orchestration | imports: `ai-utils.ts`, `aifeedbackbuttons.tsx`, `aitooluse.tsx`, `aitypes.ts`, `waveai-model.tsx`; depended by: `aipanelmessages.tsx` | orchestration-heavy | Central message renderer with multiple action paths. |
| `aimode.tsx` | conversation/model/state logic | imports: `ai-utils.ts`, `waveai-model.tsx`; depended by: `aipanel.tsx`, `aipanelmessages.tsx` | state-heavy | Model-driven mode/config logic, not isolated leaf. |
| `aipanel-compat.tsx` | compat bridge | imports: many local modules; depended by: `aipanel.tsx` | orchestration-heavy | Primary compat orchestrator; explicitly out of scope. |
| `aipanel-contextmenu.ts` | compat bridge | imports: `compat-context.ts`, `waveai-focus-utils.ts`, `waveai-model.tsx`; depended by: `aipanel-compat.tsx`, `aipanel.tsx`, `aipanelheader.tsx` | orchestration-heavy | Shared control path for panel actions and focus behavior. |
| `aipanel.tsx` | widget composition/orchestration | imports: many local modules; depended by: none (entry component) | orchestration-heavy | Top-level panel assembly and behavior orchestration. |
| `aipanelheader.tsx` | widget composition/orchestration | imports: `aipanel-contextmenu.ts`, `waveai-model.tsx`; depended by: `aipanel-compat.tsx`, `aipanel.tsx` | mixed, not pure leaf | Header behavior tied to context-menu + model state. |
| `aipanelinput.tsx` | conversation/model/state logic | imports: `ai-utils.ts`, `waveai-focus-utils.ts`, `waveai-model.tsx`; depended by: `aipanel-compat.tsx`, `aipanel.tsx`, `waveai-model.tsx` | state-heavy | Input/focus/attachment pathway is coupled and high-surface. |
| `aipanelmessages.tsx` | widget composition/orchestration | imports: `aimessage.tsx`, `aimode.tsx`, `aitypes.ts`, `waveai-model.tsx`; depended by: `aipanel-compat.tsx`, `aipanel.tsx` | orchestration-heavy | Message stack orchestration with model coupling. |
| `airatelimitstrip.tsx` | leaf UI candidate | imports: none; depended by: `aipanel-compat.tsx`, `aipanel.tsx` | leaf UI | Reads global atom + timer effect; slightly broader behavior surface. |
| `aitooluse.tsx` | runtime/action logic | imports: `aitypes.ts`, `restorebackupmodal.tsx`, `waveai-model.tsx`; depended by: `aimessage.tsx` | action-heavy | Tool action UI with restore flow linkage. |
| `aitypes.ts` | conversation/model/state logic | imports: none; depended by: `aimessage.tsx`, `aipanel-compat.tsx`, `aipanel.tsx`, `aipanelmessages.tsx`, `aitooluse.tsx`, `compat-conversation.ts`, `restorebackupmodal.tsx`, `run-command.ts`, `waveai-model.tsx` | model contract core | Shared type spine; high propagation risk. |
| `byokannouncement.tsx` | runtime/action logic | imports: `waveai-model.tsx`; depended by: `aipanel.tsx` | leaf UI with actions | Includes model-driven actions and backend-facing behavior. |
| `compat-context.ts` | compat bridge | imports: none; depended by: `aipanel-contextmenu.ts`, `aipanel.tsx`, `waveai-model.tsx` | bridge | Foundational compat runtime switch/gate. |
| `compat-conversation.ts` | compat bridge | imports: `ai-utils.ts`, `aitypes.ts`; depended by: `aipanel-compat.tsx` | bridge logic | Conversation mapping boundary to compat APIs. |
| `execution-block-list.tsx` | leaf UI candidate | imports: none; depended by: `aipanel-compat.tsx` | leaf UI | Callback-driven renderer with local reveal state; no model singleton access. |
| `restorebackupmodal.tsx` | runtime/action logic | imports: `aitypes.ts`, `waveai-model.tsx`; depended by: `aitooluse.tsx` | action-heavy | Modal performs restore side effects; non-leaf risk. |
| `run-command.test.ts` | unknown/high-risk | imports: `run-command.ts`; depended by: none | non-runtime test artifact | Not a runtime migration target. |
| `run-command.ts` | runtime/action logic | imports: `aitypes.ts`; depended by: `aipanel-compat.tsx`, `run-command.test.ts` | action-heavy | Command execution/approval pathway; high risk. |
| `telemetryrequired.tsx` | runtime/action logic | imports: `waveai-model.tsx`; depended by: `aipanel.tsx` | leaf UI with actions | Includes telemetry enable behavior and model side effects. |
| `waveai-focus-utils.ts` | conversation/model/state logic | imports: none; depended by: `aipanel-compat.tsx`, `aipanel-contextmenu.ts`, `aipanel.tsx`, `aipanelinput.tsx` | state/control helper | Shared focus behavior utility across panel control surfaces. |
| `waveai-model.tsx` | conversation/model/state logic | imports: `ai-utils.ts`, `aipanelinput.tsx`, `aitypes.ts`, `compat-context.ts`; depended by many local files | model core | Highest-coupling state singleton in widget. |

### Next safest remaining leaf-only target decision

Chosen next remaining leaf candidate: **`frontend/ui/widgets/RTAIPanelWidget/execution-block-list.tsx`**.

Why this is the safest remaining leaf:
- It has no local imports and exactly one local dependent (`aipanel-compat.tsx`), which keeps blast radius narrow.
- It is callback-driven presentational UI with local reveal state only, and does not directly call `WaveAIModel` or mutate widget-level state.
- It is safer than other remaining leaf-like files:
  - `airatelimitstrip.tsx` reads global atoms and runs interval-based timer updates.
  - `aifeedbackbuttons.tsx` emits feedback side effects and uses clipboard APIs.
  - `aidroppedfiles.tsx` directly calls model mutation (`removeFile`) and depends on model-attached dropped-file state.

Exact future slice boundary:
- In scope:
  - `frontend/ui/widgets/RTAIPanelWidget/execution-block-list.tsx` only.
- Allowed:
  - Minimal local import rewiring inside `frontend/ui/widgets/RTAIPanelWidget` needed to preserve existing parent import path.
- Out of scope:
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
  - any `app/layout/runtime/api` changes

Future execution stop conditions:
- Stop if preserving `./execution-block-list` import path requires edits beyond minimal local rewiring.
- Stop if migration requires behavior changes in `aipanel-compat.tsx` or in any model/runtime/compat file.
- Stop if manifest/checker scope changes become necessary.
- Stop if build/lint/tsc failures are unrelated legacy debt.

## Next leaf candidate assessment after agent-selection-strip

### Local graph commands

```bash
find frontend/ui/widgets/RTAIPanelWidget -maxdepth 1 -type f | sort
rg --no-heading -n "from ['\"]\\./" frontend/ui/widgets/RTAIPanelWidget
rg --no-heading -n "^import ['\"]\\./" frontend/ui/widgets/RTAIPanelWidget
rg --no-heading -n "@/ui/widgets/RTAIPanelWidget/" frontend/ui/widgets/RTAIPanelWidget
wc -l frontend/ui/widgets/RTAIPanelWidget/*
```

### File-by-file classification

| File | Role classification | Local imports/dependents | Leaf-like or orchestration-heavy | Risk note |
|---|---|---|---|---|
| `agent-selection-strip.logic.ts` | leaf UI candidate | imports: none; depended by: `agent-selection-strip.template.tsx`, `agent-selection-strip.tsx` | leaf support logic | Already migrated in prior sub-slice; not a next candidate. |
| `agent-selection-strip.story.tsx` | leaf UI candidate | imports: `agent-selection-strip.tsx`; depended by: none | leaf demo | Non-runtime artifact only. |
| `agent-selection-strip.style.scss` | leaf UI candidate | imports: none; depended by: `agent-selection-strip.template.tsx` | leaf style artifact | Already migrated; no orchestration coupling. |
| `agent-selection-strip.template.tsx` | leaf UI candidate | imports: `agent-selection-strip.logic.ts`, `agent-selection-strip.style.scss`; depended by: `agent-selection-strip.tsx` | leaf renderer | Already migrated; not part of next target selection. |
| `agent-selection-strip.tsx` | leaf UI candidate | imports: `agent-selection-strip.logic.ts`, `agent-selection-strip.template.tsx`; depended by: `aipanel-compat.tsx`, story | leaf barrel adapter | Path-preservation adapter for prior migration. |
| `ai-utils.ts` | runtime/action logic | imports: none; depended by: 8 local files | orchestration-adjacent utility core | Large shared helper hub (~649 LOC), high blast radius. |
| `aidroppedfiles.tsx` | leaf UI candidate | imports: `ai-utils.ts`, `waveai-model.tsx`; depended by: `aipanel.tsx`, `aipanel-compat.tsx` | mostly leaf UI | Medium risk due direct model-coupled mutations (`removeFile`). |
| `aifeedbackbuttons.tsx` | leaf UI candidate | imports: `waveai-model.tsx`; depended by: `aimessage.tsx` | leaf UI | Low-medium risk; includes feedback side effect + clipboard use. |
| `aimessage.tsx` | widget composition/orchestration | imports: `ai-utils.ts`, `aifeedbackbuttons.tsx`, `aitooluse.tsx`, `aitypes.ts`, `waveai-model.tsx`; depended by: `aipanelmessages.tsx` | orchestration-heavy | Central message renderer with multiple child/action links. |
| `aimode.tsx` | conversation/model/state logic | imports: `ai-utils.ts`, `waveai-model.tsx`; depended by: `aipanel.tsx`, `aipanelmessages.tsx` | state-heavy | Mode/selection logic tied to model behavior and feature flags. |
| `aipanel-compat.tsx` | compat bridge | imports: many local modules (15); depended by: `aipanel.tsx` | orchestration-heavy | Primary compat orchestrator (~1267 LOC), explicitly out of scope. |
| `aipanel-contextmenu.ts` | compat bridge | imports: `compat-context.ts`, `waveai-focus-utils.ts`, `waveai-model.tsx`; depended by: `aipanel.tsx`, `aipanel-compat.tsx`, `aipanelheader.tsx` | orchestration-heavy | Shared control path for panel actions; non-leaf behavior. |
| `aipanel.tsx` | widget composition/orchestration | imports: many local modules (15); depended by: none (entry component) | orchestration-heavy | Top-level panel composition and flow control (~615 LOC). |
| `aipanelheader.tsx` | widget composition/orchestration | imports: `aipanel-contextmenu.ts`, `waveai-model.tsx`; depended by: `aipanel.tsx`, `aipanel-compat.tsx` | mixed, not pure leaf | Header toggles and context-menu behavior tie into model/control flow. |
| `aipanelinput.tsx` | conversation/model/state logic | imports: `ai-utils.ts`, `waveai-focus-utils.ts`, `waveai-model.tsx`; depended by: `aipanel.tsx`, `aipanel-compat.tsx`, `waveai-model.tsx` | state-heavy | Input pipeline, focus, attachment validation; not isolated leaf. |
| `aipanelmessages.tsx` | widget composition/orchestration | imports: `aimessage.tsx`, `aimode.tsx`, `aitypes.ts`, `waveai-model.tsx`; depended by: `aipanel.tsx`, `aipanel-compat.tsx` | orchestration-heavy | Message-stream container and slot orchestration. |
| `airatelimitstrip.tsx` | leaf UI candidate | imports: none; depended by: `aipanel.tsx`, `aipanel-compat.tsx` | leaf UI | Low risk structurally; reads global atom and local timer effect. |
| `aitooluse.tsx` | runtime/action logic | imports: `aitypes.ts`, `restorebackupmodal.tsx`, `waveai-model.tsx`; depended by: `aimessage.tsx` | action-heavy | Tool-use rendering + restore flows; elevated runtime coupling. |
| `aitypes.ts` | conversation/model/state logic | imports: none; depended by: 9 local files | model contract core | Shared type spine; change risk propagates widely. |
| `byokannouncement.tsx` | runtime/action logic | imports: `waveai-model.tsx`; depended by: `aipanel.tsx` | leaf UI with actions | Includes RPC telemetry events + config open action. |
| `compat-context.ts` | compat bridge | imports: none; depended by: `aipanel-contextmenu.ts`, `aipanel.tsx`, `waveai-model.tsx` | bridge | Small but foundational compat/runtime gate. |
| `compat-conversation.ts` | compat bridge | imports: `ai-utils.ts`, `aitypes.ts`; depended by: `aipanel-compat.tsx` | bridge logic | Conversation mapping boundary to compat APIs. |
| `execution-block-list.tsx` | leaf UI candidate | imports: none; depended by: `aipanel-compat.tsx` | leaf UI | Low risk; callback-driven display only, no local orchestration imports. |
| `restorebackupmodal.tsx` | runtime/action logic | imports: `aitypes.ts`, `waveai-model.tsx`; depended by: `aitooluse.tsx` | action-heavy | Executes restore side effects and modal lifecycle transitions. |
| `run-command-approval.tsx` | leaf UI candidate | imports: none; depended by: `aipanel-compat.tsx` | leaf UI | Lowest local coupling; pure prop-driven confirmation list. |
| `run-command.test.ts` | unknown/high-risk | imports: `run-command.ts`; depended by: none | non-runtime test artifact | Not a migration target for runtime sub-slice. |
| `run-command.ts` | runtime/action logic | imports: `aitypes.ts`; depended by: `aipanel-compat.tsx`, test | action-heavy | Command execution/approval pathway; explicitly high risk. |
| `telemetryrequired.tsx` | runtime/action logic | imports: `waveai-model.tsx`; depended by: `aipanel.tsx` | leaf UI with actions | Includes telemetry enable RPC + model focus behavior. |
| `waveai-focus-utils.ts` | conversation/model/state logic | imports: none; depended by: `aipanel.tsx`, `aipanel-compat.tsx`, `aipanel-contextmenu.ts`, `aipanelinput.tsx` | state/control helper | Shared focus-control utility affects panel interaction behavior. |
| `waveai-model.tsx` | conversation/model/state logic | imports: `ai-utils.ts`, `aipanelinput.tsx`, `aitypes.ts`, `compat-context.ts`; depended by: 14 local files | model core | Core state singleton (~761 LOC), highest coupling in widget. |

### Next safest leaf-only target decision

Chosen next leaf candidate: **`frontend/ui/widgets/RTAIPanelWidget/run-command-approval.tsx`**.

Why this is the safest remaining leaf:
- It has no local imports and exactly one local dependent (`aipanel-compat.tsx`), making blast radius smaller than other candidates.
- It is a pure prop-driven render list with no direct model singleton access and no local orchestration wiring.
- It is materially narrower than alternatives:
  - `execution-block-list.tsx` is still leaf-like but carries richer reveal/provenance UI state and a larger callback surface.
  - `airatelimitstrip.tsx` is leaf-like but includes timer/atom behavior and is wired into both `aipanel.tsx` and `aipanel-compat.tsx`.
  - `aifeedbackbuttons.tsx` and `aidroppedfiles.tsx` are leaf-like but directly couple to `WaveAIModel`.

Exact future slice boundary (for execution slice after this assessment):
- In scope:
  - `frontend/ui/widgets/RTAIPanelWidget/run-command-approval.tsx` only.
- Allowed:
  - Minimal local import rewiring inside `frontend/ui/widgets/RTAIPanelWidget` needed to preserve existing parent import path.
- Out of scope:
  - `aipanel.tsx`
  - `aipanel-compat.tsx` (except minimal import rewiring only)
  - `waveai-model.tsx`
  - `run-command.ts`
  - `compat-conversation.ts`
  - `compat-context.ts`
  - `aitypes.ts`
  - `ai-utils.ts`
  - all other `RTAIPanelWidget` files
  - any manifest or checker changes
  - any `app/layout/runtime/api` changes

Future execution stop conditions:
- Stop if preserving `./run-command-approval` import path requires edits beyond minimal local rewiring.
- Stop if migration requires behavior changes in `aipanel-compat.tsx` or any model/runtime/compat file.
- Stop if manifest/checker scope changes become necessary.
- Stop if build/lint/tsc fails due unrelated legacy debt.

## Evidence Collection

Commands used for this assessment:

```bash
find frontend/ui/widgets/RTAIPanelWidget -maxdepth 1 -type f | sort
find frontend/ui/widgets/RTTerminalWidget -maxdepth 1 -type f | sort
rg --no-heading -n "@/ui/widgets/RTAIPanelWidget" frontend/app frontend/ui frontend/wave.ts
rg --no-heading -n "@/ui/widgets/RTTerminalWidget" frontend/app frontend/ui frontend/wave.ts
rg --no-heading -n "from \"@/ui/widgets/RTAIPanelWidget/" frontend/app frontend/ui frontend/wave.ts
rg --no-heading -n "from \"@/ui/widgets/RTTerminalWidget/" frontend/app frontend/ui frontend/wave.ts
rg --no-heading -n "from \"@/app/|@/app/|from \"@/compat/|@/compat/|from \"@/rterm-api/|@/rterm-api/" frontend/ui/widgets/RTAIPanelWidget frontend/ui/widgets/RTTerminalWidget
```

## Candidate Comparison

| Widget | Main files (top-level) | Active import sites | App/store coupling | Layout/workspace/block coupling | Runtime/API/compat coupling | Likely public API surface | Rough complexity | Separable vs inseparable |
|---|---|---|---|---|---|---|---|---|
| `RTAIPanelWidget` | 26 files (`aipanel.tsx`, `waveai-model.tsx`, `aipanel-compat.tsx`, plus many leaf UI files) | App/layout imports include `RTWorkspaceLayout`, `workspace/*`, `store/*`, modal integration; external imports center on `aipanel`, `waveai-model`, `compat-context`, `waveai-focus-utils` | High (`@/app/store/*`, `@/app/state/*`, approvals/settings/model state flows) | Medium-high (`workspace-layout-model`, widget helpers, floating windows) | High (`@/compat/*`, `@/rterm-api/*`, tool execution + conversation flows) | `AIPanel`, `WaveAIModel`, compat-context accessors, focus utilities | High (~6649 LOC total) | **Separable:** leaf presentational files (`agent-selection-strip.tsx`, `execution-block-list.tsx`, `aifeedbackbuttons.tsx`). **Inseparable core:** `waveai-model.tsx`, `aipanel-compat.tsx`, `run-command.ts`, `compat-conversation.ts`. |
| `RTTerminalWidget` | 18 files (`term.tsx`, `term-model.ts`, `compat-terminal.tsx`, `termwrap.ts`, helpers/styles) | App imports include `block.tsx`, `compat-split-layout.tsx`, `workspace/widgets.tsx`; external imports center on `term-model`, `compat-terminal`, `explain-latest-output` | High (`@/app/state/*`, `@/app/store/*`, app key/model/modals) | High (`@/app/block/*`, `@/app/workspace/*` in core terminal model/view paths) | High (`@/compat/*`, `@/rterm-api/*`, terminal facade + stream/snapshot semantics) | `TermViewModel`, `CompatTerminalView`, `explainLatestTerminalOutputInAI` | High (~5469 LOC total) | **Separable:** small helper utilities (`explain-handoff.ts`, URI/key helpers). **Inseparable core:** `term-model.ts`, `term.tsx`, `termwrap.ts`, `term-wsh.tsx`, `compat-terminal.tsx`. |

## Detailed Notes

### RTAIPanelWidget

- Main high-impact files:
  - `aipanel.tsx` (~615 LOC)
  - `waveai-model.tsx` (~761 LOC)
  - `aipanel-compat.tsx` (large orchestration entrypoint)
- Active external import surface (from app/layout or other widget dirs):
  - `frontend/ui/layout/RTWorkspaceLayout/RTWorkspaceLayout.tsx` (`AIPanel`, `setWaveAICompatContext`)
  - `frontend/app/workspace/workspace-layout-model.ts` (`WaveAIModel`, `isWaveAICompatRuntime`)
  - `frontend/app/workspace/widgets.tsx` (`WaveAIModel`)
  - `frontend/app/workspace/tools-floating-window.tsx` (`WaveAIModel`)
  - `frontend/app/workspace/files-floating-window.tsx` (`WaveAIModel`)
  - `frontend/app/store/keymodel.ts` (`WaveAIModel`)
  - `frontend/app/store/focusManager.ts` (`waveAIHasFocusWithin`, `WaveAIModel`)
  - `frontend/app/store/tabrpcclient.ts` (`WaveAIModel`)
  - `frontend/app/modals/remoteprofilesmodal.tsx` (`WaveAIModel`)
- Coupling profile:
  - Heavy coupling to app stores/state and approval/tool conversation paths.
  - Core control files combine UI concerns and runtime orchestration.
  - Still contains leaf UI pieces that are mostly presentation + typed props.

### RTTerminalWidget

- Main high-impact files:
  - `term-model.ts` (~1221 LOC)
  - `term.tsx` (~753 LOC)
  - `compat-terminal.tsx` (~357 LOC)
- Active external import surface (from app dirs):
  - `frontend/app/block/block.tsx` (`TermViewModel`)
  - `frontend/app/tab/compat-split-layout.tsx` (`CompatTerminalView`)
  - `frontend/app/workspace/widgets.tsx` (`explainLatestTerminalOutputInAI`)
- Coupling profile:
  - Core terminal model/view path is deeply tied to block/workspace model and app store routing.
  - Runtime interaction is central (terminal snapshots, streams, RPC client/facade flows).
  - Small helper files exist, but primary import surface is tied to core terminal behavior.

## Pre-Decision Readout

- Both widgets are active and truly widget-owned.
- Both are high-complexity and high-coupling at top-level.
- `RTAIPanelWidget` currently shows a clearer path to an isolated first **internal** sub-slice via leaf presentational files.
- `RTTerminalWidget` primary import surface is closer to runtime-critical terminal behavior and block/workspace semantics.

## Decision: Safer First Target

Selected safer first target: **`RTAIPanelWidget`**.

Why this is safer than `RTTerminalWidget`:
- `RTAIPanelWidget` has small leaf UI files with bounded local responsibilities (for example `agent-selection-strip.tsx`) that are consumed inside the widget orchestration layer.
- Those leaf files are easier to isolate without touching runtime-critical terminal rendering, stream handling, or block/workspace terminal semantics.
- `RTTerminalWidget` external API is centered on `TermViewModel` and `CompatTerminalView`, which are tightly coupled to core terminal behavior and have materially higher blast radius.

Why `RTTerminalWidget` is deferred:
- High-risk core files (`term-model.ts`, `term.tsx`, `termwrap.ts`, `term-wsh.tsx`, `compat-terminal.tsx`) are runtime-critical and directly connected to app block/workspace and terminal transport behavior.
- A first sub-slice there is more likely to spill into app/workspace/runtime paths, increasing regression risk for the daily-driver shell path.

Risks that make full-widget migration too large right now:
- `RTAIPanelWidget` core orchestration (`waveai-model.tsx`, `aipanel-compat.tsx`, `run-command.ts`, `compat-conversation.ts`) is still broad and cross-layer.
- `RTTerminalWidget` core model/view path is deeply cross-layer and runtime-coupled.
- Migrating either widget in full would exceed a low-risk first widget contract slice.

## First Safe Sub-Slice Boundary (Future Slice Definition)

Widget target for first sub-slice: `RTAIPanelWidget`.

In scope (narrow boundary):
- `frontend/ui/widgets/RTAIPanelWidget/agent-selection-strip.tsx` only.

Out of scope (explicit deferrals):
- `frontend/ui/widgets/RTAIPanelWidget/aipanel.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aipanel-compat.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/waveai-model.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/run-command.ts`
- `frontend/ui/widgets/RTAIPanelWidget/compat-conversation.ts`
- all `RTTerminalWidget` files
- any app/layout/runtime/api/store/manifest/checker changes

Expected contract outcome for that sub-slice:
- Migrate only `agent-selection-strip` to the local contract shape used for frontend UI slices (logic/template/style/story + stable export path), while preserving existing runtime behavior and keeping parent widget orchestration unchanged.

Stop conditions for that future sub-slice:
- Stop if migration requires behavioral edits in `aipanel-compat.tsx` beyond minimal import wiring.
- Stop if migration requires edits in `waveai-model.tsx`, `run-command.ts`, `compat-conversation.ts`, or app/layout files.
- Stop if migration requires checker/manifest scope changes.
- Stop if build/lint/tsc failures are unrelated legacy debt.
