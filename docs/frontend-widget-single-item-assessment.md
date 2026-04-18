# Frontend Single-Item Widget Assessment

**Date:** 2026-04-18  
**Scope:** Compare `RTAIPanelWidget` vs `RTTerminalWidget` to identify the safer first single-item widget contract-migration target.

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
