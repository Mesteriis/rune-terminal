# Frontend Widget Layer Assessment

**Date:** 2026-04-18  
**Scope:** Assessment-only review of `frontend/ui/widgets` for the next contract migration slice.

## Discovery Commands

```bash
find frontend/ui/widgets -maxdepth 2 -type f | sort
rg "@/ui/widgets|from [\"']@/ui/widgets" frontend/app frontend/ui frontend/wave.ts
```

## Discovered Widget Inventory

Top-level widget directories discovered under `frontend/ui/widgets`:

1. `frontend/ui/widgets/RTAIPanelWidget` (26 files, ~6649 LOC)
2. `frontend/ui/widgets/RTTerminalWidget` (18 files, ~5469 LOC)

Complete file inventory from discovery:

### RTAIPanelWidget
- `frontend/ui/widgets/RTAIPanelWidget/agent-selection-strip.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/ai-utils.ts`
- `frontend/ui/widgets/RTAIPanelWidget/aidroppedfiles.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aifeedbackbuttons.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aimessage.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aimode.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aipanel-compat.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aipanel-contextmenu.ts`
- `frontend/ui/widgets/RTAIPanelWidget/aipanel.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aipanelheader.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aipanelinput.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aipanelmessages.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/airatelimitstrip.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aitooluse.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/aitypes.ts`
- `frontend/ui/widgets/RTAIPanelWidget/byokannouncement.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/compat-context.ts`
- `frontend/ui/widgets/RTAIPanelWidget/compat-conversation.ts`
- `frontend/ui/widgets/RTAIPanelWidget/execution-block-list.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/restorebackupmodal.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/run-command-approval.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/run-command.test.ts`
- `frontend/ui/widgets/RTAIPanelWidget/run-command.ts`
- `frontend/ui/widgets/RTAIPanelWidget/telemetryrequired.tsx`
- `frontend/ui/widgets/RTAIPanelWidget/waveai-focus-utils.ts`
- `frontend/ui/widgets/RTAIPanelWidget/waveai-model.tsx`

### RTTerminalWidget
- `frontend/ui/widgets/RTTerminalWidget/compat-terminal-keydown.ts`
- `frontend/ui/widgets/RTTerminalWidget/compat-terminal.tsx`
- `frontend/ui/widgets/RTTerminalWidget/dragged-file-uri.ts`
- `frontend/ui/widgets/RTTerminalWidget/explain-handoff.test.ts`
- `frontend/ui/widgets/RTTerminalWidget/explain-handoff.ts`
- `frontend/ui/widgets/RTTerminalWidget/explain-latest-output.ts`
- `frontend/ui/widgets/RTTerminalWidget/fitaddon.ts`
- `frontend/ui/widgets/RTTerminalWidget/ijson.tsx`
- `frontend/ui/widgets/RTTerminalWidget/shellblocking.ts`
- `frontend/ui/widgets/RTTerminalWidget/term-model.ts`
- `frontend/ui/widgets/RTTerminalWidget/term-wsh.tsx`
- `frontend/ui/widgets/RTTerminalWidget/term.scss`
- `frontend/ui/widgets/RTTerminalWidget/term.tsx`
- `frontend/ui/widgets/RTTerminalWidget/termsticker.tsx`
- `frontend/ui/widgets/RTTerminalWidget/termtheme.ts`
- `frontend/ui/widgets/RTTerminalWidget/termutil.ts`
- `frontend/ui/widgets/RTTerminalWidget/termwrap.ts`
- `frontend/ui/widgets/RTTerminalWidget/xterm.css`

## Candidate Assessment

### Candidate: RTAIPanelWidget

- Widget path: `frontend/ui/widgets/RTAIPanelWidget`
- Active external import sites:
  - `frontend/ui/layout/RTWorkspaceLayout/RTWorkspaceLayout.tsx`
  - `frontend/app/workspace/widgets.tsx`
  - `frontend/app/workspace/workspace-layout-model.ts`
  - `frontend/app/workspace/files-floating-window.tsx`
  - `frontend/app/workspace/tools-floating-window.tsx`
  - `frontend/app/store/keymodel.ts`
  - `frontend/app/store/focusManager.ts`
  - `frontend/app/store/tabrpcclient.ts`
  - `frontend/app/modals/remoteprofilesmodal.tsx`
  - `frontend/ui/widgets/RTTerminalWidget/compat-terminal.tsx`
- Truly widget: yes.
- Upward dependencies: yes; multiple imports from `@/app/*` and layout/workspace surfaces.
- Runtime/API coupling: high; uses `@/compat/*`, `@/rterm-api/*`, app stores, and tool/approval pathways.
- Rough complexity: high (26 files, ~6649 LOC).
- First-slice eligibility: ineligible (high coupling and high complexity for low-risk initial widget contract migration).

### Candidate: RTTerminalWidget

- Widget path: `frontend/ui/widgets/RTTerminalWidget`
- Active external import sites:
  - `frontend/app/workspace/widgets.tsx`
  - `frontend/app/tab/compat-split-layout.tsx`
  - `frontend/app/block/block.tsx`
- Truly widget: yes.
- Upward dependencies: yes; direct imports from `@/app/*` including block, store, modal, workspace state.
- Runtime/API coupling: high; terminal runtime, `RpcApi`/`TabRpcClient`, `@/compat/*`, and `@/rterm-api/*`.
- Rough complexity: high (18 files, ~5469 LOC).
- First-slice eligibility: ineligible (core terminal/runtime coupling and high complexity).

## Assessment Summary (Pre-Decision)

- Active widget candidates discovered: 2 (`RTAIPanelWidget`, `RTTerminalWidget`).
- Both are real widgets and actively used.
- Both currently exceed low/medium-risk first-slice criteria due to upward coupling and runtime/API entanglement.

## No Valid Batch Yet

Decision: no valid multi-item widget batch exists for the next contract migration slice.

Reason:
- Active candidates found: 2.
- Eligible low/medium-risk candidates found: 0.
- Both active widgets are high-coupling/high-complexity and would spill into app/layout/runtime behavior if migrated as an initial low-risk widget batch.

Exclusions for this cycle:
- `RTAIPanelWidget`: excluded due to deep coupling with app stores, compat facades, tool execution/approval flows, and high complexity.
- `RTTerminalWidget`: excluded due to deep coupling with terminal runtime, app block/workspace/store models, compat/rterm APIs, and high complexity.

Governance conclusion:
- Future widget-layer contract work must proceed as single-item slices until at least two active low/medium-risk widget candidates exist.
