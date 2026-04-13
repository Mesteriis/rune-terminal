# Parity Matrix

This document tracks product parity between TideTerm and RunaTerminal.
Parity means user-visible behavior, interaction model, and workflow familiarity.
It does not mean copying TideTerm internals or legacy coupling.

Status values:

- `done`
- `partial`
- `missing`
- `blocked`

## Top-level assessment

RunaTerminal has crossed the foundation threshold but is still materially behind TideTerm in user-visible product parity.

The largest gaps today are:

- multi-tab and multi-workspace behavior
- full TideTerm AI/chat interaction behavior
- widget/block catalog parity
- settings/config flows
- remote/SSH workflows
- startup/bootstrap flows beyond the local runtime happy path

The closest parity area today is:

- local terminal runtime foundation
- policy, audit, trusted rules, ignore rules
- role/mode/profile backing model

The critical path to recognizable parity is:

1. app shell behavior
2. workspace/layout behavior
3. terminal UX behavior
4. AI panel behavior
5. settings/control surfaces
6. remote/local connection parity

## Matrix

| Feature area | TideTerm current behavior | Current RunaTerminal status | Parity gap | Migration strategy | Architectural notes | Status |
| --- | --- | --- | --- | --- | --- | --- |
| App shell behavior | App-shaped shell with top tab bar, left AI panel, center content, right slim widgets/settings rail | TideTerm-derived shell is now present with top tabs, left AI panel, center terminal stage, right slim dock | Shell framing is close, but tab controls and dock actions are still reduced | Keep copying TideTerm shell placement and panel behavior before adding any new visual concepts | Preserve React + local loopback transport; do not reintroduce old global shell state | `partial` |
| Workspace/layout | Workspace is the primary container and owns tab/content/widget layout | Single-workspace shell exists, but layout behavior is simplified and lacks full workspace orchestration | Missing multi-workspace behavior and block-aware layout persistence | Recreate TideTerm workspace behavior against new workspace domain APIs | Keep workspace state explicit in Go core rather than frontend-owned layout truth | `partial` |
| Tabs | Real tab bar with active tab, pinned tabs, add tab flows, AI toggle, drag behavior | Current top strip maps widgets, not full tabs | Missing tab creation/pinning/ordering semantics | Introduce a tab model in the new workspace domain and bind the UI to it | Do not port TideTerm's full frontend store graph; port behavior only | `missing` |
| Widgets | Slim right-side widgets/apps/settings/help surface with secondary actions | Current right rail exists, but actions are reduced to section switching | Missing real widget/app/settings affordances | Replace temporary section-switching with TideTerm-derived widget/app/settings actions as features land | Keep dock as adapter to explicit runtime/UI state, not a global action bucket | `partial` |
| Terminal UX | Terminal-first flow, stable sizing, live output, focus, switching, scrollback, command entry | Live terminal, input, interrupt, focus, and stable stage sizing exist | Missing richer multi-terminal/block behavior and some TideTerm polish | Continue lifting TideTerm terminal behavior into the new terminal/session model | Terminal state and PTY orchestration remain Go-owned | `partial` |
| AI panel | Left-side AI/chat panel with header, messages, input, mode/context controls | Left panel now follows the TideTerm panel grammar more closely: header, widget-context toggle, message-like primary surface, and bottom control dock | Still missing real AI conversation transport, file attach flows, and richer message/tool rendering | Continue porting the imported TideTerm AI panel structure while rebinding actions to the new runtime and policy surfaces | Keep policy/runtime explicit; do not port old AI/backend entanglement | `partial` |
| Tool invocation UX | AI-driven and app-driven flows rather than primarily internal operator tooling | Manual operator panel exists and is useful for development | Operator console is not a TideTerm user-facing equivalent | Keep operator panel as an internal dev surface, but move end-user flows into TideTerm-shaped panels | This surface is useful, but should remain secondary once parity grows | `partial` |
| Approval UX | User-visible approvals integrated into flow surfaces | Visible approval banner exists and retries with single-use token | Approval is usable, but not yet embedded in final TideTerm-equivalent AI/settings flows | Keep current approval mechanics and relocate them into parity UI surfaces as those land | Approval remains policy/runtime-owned | `partial` |
| Role/mode/profile UI | TideTerm has AI mode/config flows and user-facing AI controls | Current selectors exist in the AI panel | Missing closer parity with TideTerm AI mode UX and model selection flows | Rebind existing role/mode/profile model into a TideTerm-derived AI control surface | New role/mode system stays, even where old TideTerm semantics differ | `partial` |
| Settings/config flows | Dedicated settings surfaces and config views | Only partial settings-like controls exist via policy/operator surfaces | Missing recognizable settings navigation and product controls | Recreate settings entry points in the dock and bind them to explicit config endpoints | Avoid reviving a global settings blob in the frontend | `missing` |
| Local runtime | Local shell/runtime startup and terminal interaction | Working and launchable | Minor parity gap only | Keep tightening startup polish and shell integration | Sidecar Go runtime + Tauri stays | `done` |
| Remote/SSH | Remote and SSH are product-level workflows | Not implemented in MVP | Major parity blocker | Add connection domain and UX after local shell/layout/AI parity slices | Must be built in Go core, not copied from old transport shape | `missing` |
| Audit visibility | Product has visible traces of operations and system state | Audit tail exists in the AI side panel | Missing fuller integration into user flows | Keep current audit surface and reposition it as parity UI matures | Audit remains first-class and explicit | `partial` |
| Trust/ignore management | Sensitive operations and protected files are governed implicitly or via product flows | Explicit trust/ignore management exists | Behavior exceeds old TideTerm structurally, but UX is still internal | Keep the new policy model and integrate it into TideTerm-derived settings surfaces | This is an intentional architectural divergence in implementation, not behavior goals | `partial` |
| Startup/bootstrap UX | App opens into a familiar working shell with known flows | Launch path is now documented and working | Missing richer startup states and TideTerm-style bootstrap polish | Keep launch path deterministic first, then mirror TideTerm startup cues | Tauri + Go sidecar boot stays | `partial` |

## First parity slice

The first slice in this phase is:

- app shell parity
- workspace/layout parity
- terminal-stage sizing and behavior parity

This slice is chosen because it makes the product immediately recognizable to a TideTerm user.
Without it, every other feature lands into the wrong shell.

## Imported frontend baseline

The TideTerm renderer source is now imported literally into this repository as the refactor baseline:

- renderer source snapshot: `frontend/tideterm-src/`
- renderer build-context snapshot: `frontend/tideterm-src-meta/`

This is intentional.
Further frontend parity work should prefer adapting and deleting from this imported baseline over inventing a replacement shell.

## Areas that cannot be ported literally

The following must be adapted rather than copied directly:

- TideTerm's RPC and store graph
- frontend-owned product state that should now be domain-owned in Go
- backend-specific AI coupling
- any interaction that depends on Electron-era process/runtime assumptions

In these cases, RunaTerminal should implement the closest user-visible equivalent while preserving the new architecture:

- Go-first runtime and domain services
- policy-first execution
- transport as adapter
- explicit audit/trust/ignore subsystems

## Current phase policy

Until parity is materially closer:

- do not invent new layout grammar
- do not invent new AI UX concepts
- do not replace familiar TideTerm flows with abstract operator tooling
- do not claim parity for areas still listed as `partial`, `missing`, or `blocked`
