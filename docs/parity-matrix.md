# Parity Matrix

This document is now both a parity tracker and a `1.0.0` release-control document.
Parity means user-visible behavior, interaction model, and workflow familiarity.
It does not mean copying TideTerm internals or legacy coupling.

Status values:

- `done`
- `partial`
- `missing`
- `blocked`

Release priorities:

- `P0 release-blocker`
- `P1 important`
- `P2 post-1.0`

## Top-level release assessment

RunaTerminal has crossed the foundation threshold and is now in `1.0.0` release-drive mode.
The question is no longer “what can be migrated eventually?” but “what still blocks a TideTerm-compatible daily-driver release?”

Current `P0` release blockers are:

- final release validation sweep for the latest hardening pass (`lint/build/tests/validate/tauri/smoke`)
- remote SSH daily-driver confidence beyond a single validated happy path
- final shell/terminal regression confidence under daily-driver usage
- explicit release-control tracking across parity areas (checklist + limitations + truthful validation)

Strong enough areas for `1.0.0` progression:

- local terminal runtime foundation
- launchable shell with recognisable TideTerm-derived structure
- settings/control/launcher surfaces
- role/mode/profile backing model
- audit, trust, and secret-shield foundation

`P2 post-1.0` areas are intentionally not on the current release critical path:

- builder parity
- proxy parity
- preview zoo
- code editor parity
- broad settings universe parity
- `.ssh/config` import
- advanced SSH auth strategies
- full remote workspace/controller parity
- file attachments
- perfect multi-session terminal parity

## Release control matrix

| Feature area | TideTerm current behavior | Current RunaTerminal status | Release priority | Current status | Exact release gap | Next concrete step | Architectural notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| App shell behavior | App-shaped shell with top tab bar, left AI panel, center content, right slim widgets/settings rail | TideTerm-derived shell is present with left AI panel, center terminal stage, widget-first dock, and workspace switcher | `P1 important` | `partial` | Needs final release-hardening review for launch/startup rough edges, not new shell concepts | Run a shell hardening pass only if it blocks daily-driver use during later milestones | Preserve React + local loopback transport; do not reintroduce old global shell state |
| Workspace/layout | Workspace is the primary container and owns tab/content/widget layout | Single-workspace shell exists with tab/widget synchronization | `P1 important` | `partial` | True multi-workspace parity is missing, but not currently blocking 1.0 daily-driver claims | Keep current single-workspace path stable; revisit only if it blocks release usage | Keep workspace state explicit in Go core rather than frontend-owned layout truth |
| Tabs | Real tab bar with active tab, pinned tabs, add tab flows, rename, context menu, AI toggle, drag behavior | Tabs support create, close, rename, pin, unpin, context menu, and drag reorder | `P0 release-blocker` | `partial` | Needs bug closure and daily-driver confidence, not more feature breadth | Fold remaining tab issues into shell/control hardening milestone | Do not port TideTerm's full frontend store graph; port behavior only |
| Widgets | Slim right-side widgets/apps/settings/help surface with secondary actions | Right rail is widget-first, with runtime/settings/help/audit utility entry points | `P1 important` | `partial` | Widget catalog breadth is still reduced compared with TideTerm | Keep current widget surface stable; extend only if a concrete daily-driver gap appears | Keep dock as adapter to explicit runtime/UI state, not a global action bucket |
| Launcher / app entry | TideTerm exposes launcher-like discovery through widget/apps/settings/help entry surfaces | Launcher flyout and searchable launcher section exist | `P1 important` | `partial` | Missing broader app catalog metadata, but current discovery may be sufficient for 1.0 | Treat current launcher as acceptable unless user testing reveals a release blocker | Do not import TideTerm launcher wholesale; port shell discoverability behavior only |
| Terminal UX | Compact term shell, terminal-first focus, visible scrollback, toolbar/status strip, command entry, and stable viewport behavior | Terminal shell is compact, focusable, PTY-backed, hydrated, and now includes explicit copy/paste shortcut sanity plus batched long-output writes | `P0 release-blocker` | `partial` | Remaining gap is final regression confidence and release smoke, not missing core interaction paths | Run final terminal-focused release smoke and close only verified regressions | Terminal state stays Go-owned; the frontend uses a JSON snapshot + SSE stream adapter |
| AI panel | Left-side AI/chat panel with header, messages, input, mode/context controls | TideTerm-shaped panel exists with merged transcript, real backend conversation path, explicit `/run <command>` execution/explanation flow, and clearer `/run` error UX | `P0 release-blocker` | `partial` | Remaining gap is final release smoke and policy-path validation confidence, not missing `/run` capability | Re-run `/run` safe/error/approval scenarios and record them in validation | Keep policy/runtime explicit; do not port old AI/backend entanglement |
| Tool invocation UX | AI-driven and app-driven flows rather than primarily internal operator tooling | Operator panel exists and remains secondary, and the AI composer now has an explicit `/run` command path | `P1 important` | `partial` | The release path exists, but richer validation and result polish are still needed | Keep the explicit `/run` path stable while avoiding broader AI scope drift | Keep operator console secondary; do not make it the user-facing primary path |
| Approval UX | User-visible approvals integrated into flow surfaces | Visible approval banner exists and retries with single-use token | `P0 release-blocker` | `partial` | Approval must remain stable and visible during the AI execution release slice | Validate approval path during AI command execution implementation | Approval remains policy/runtime-owned |
| Role/mode/profile UI | TideTerm has AI mode/config flows and user-facing AI controls | Current selectors exist in the AI panel and feed into backend system prompt | `P1 important` | `partial` | Good enough structurally; needs validation that it stays coherent during AI execution flow | Keep current controls stable and visible during the next AI slice | New role/mode system stays even where old TideTerm semantics differ |
| Settings/config flows | Dedicated settings surfaces and config views | Shell-level settings surface exists with `Overview`, `Trusted tools`, `Secret shield`, and `Help` | `P1 important` | `partial` | Reduced breadth vs TideTerm, but currently usable | Treat as non-blocking unless a concrete 1.0 workflow gap appears | Avoid reviving a global settings blob in the frontend |
| Local runtime | Local shell/runtime startup and terminal interaction | Working and launchable | `P0 release-blocker` | `done` | Main gap is regression risk rather than missing capability | Keep validating it while other slices land | Sidecar Go runtime + Tauri stays |
| Remote/SSH | TideTerm treats local vs remote shells as explicit user-visible workflow and exposes connection entry/access patterns in the shell | Explicit connection catalog, persisted SSH profiles, active default target, lifecycle feedback, and one validated happy path exist; launch failures are now surfaced with actionable shell guidance | `P0 release-blocker` | `partial` | Needs stronger final RC smoke evidence on reachable-host behavior, but not full TideTerm remote parity | Re-run targeted reachable-host and failure-mode smoke; keep scope narrow | Keep connection state backend-owned in Go; do not port TideTerm's legacy controller stack |
| Audit visibility | Product has visible traces of operations and system state | Audit reads as a shell utility surface with recent operation cards and approval/role/mode context | `P1 important` | `partial` | Good enough structurally; needs regression protection more than more breadth | Keep stable and ensure AI/remote flows continue to write honest audit entries | Audit remains first-class and explicit |
| Trust/ignore management | Sensitive operations and protected files are governed implicitly or via product flows | Explicit trust/ignore management appears as user-facing settings cards | `P1 important` | `partial` | Good enough for 1.0 if it stays stable and truthful | Validate it against the AI execution slice and release hardening | This is an intentional implementation divergence, not a release gap in spirit |
| Startup/bootstrap UX | App opens into a familiar working shell with known flows | Launch path is documented and working; bootstrap failure panel now points to supported recovery steps (`build:core`, `tauri:dev`, dependency checks) | `P0 release-blocker` | `partial` | Needs final launch-smoke confirmation across the supported path | Keep `tauri:dev` and startup validation real while release blockers close | Tauri + Go sidecar boot stays |

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

## Active terminal hardening slice

TideTerm reference surface:

- `frontend/app/view/term/term.tsx`
- `frontend/app/view/term/term.scss`
- `frontend/app/view/term/xterm.css`

This slice is limited to terminal parity hardening only. It closes:

- compact terminal chrome and toolbar behavior
- command/status strip behavior
- focus and click-to-focus affordances
- scrollback hydration and live-tail state visibility
- explicit terminal actions for refresh, focus, interrupt, clear, and jump-to-latest
- frontend shell-hook decomposition needed to support terminal UX without growing a new monolith
- browser-backed validation of terminal focus, keyboard input, snapshot hydration, and follow/jump behavior

Exit criteria for this hardening slice:

- terminal surface launches inside the app shell
- focus behavior is stable and visible
- keyboard input still reaches the PTY
- scrollback is visible after snapshot hydration
- toolbar actions remain usable after shell launch
- parity gaps that remain are documented rather than silently deferred

Current assessment:

- exit criteria for terminal-shell closure are now met
- terminal UX remains `partial` overall because deeper TideTerm term surfaces still exist, but it is now good enough to move off the critical path and continue parity work in other areas later

Remaining terminal parity gap after this slice:

- TideTerm multi-session sidebar
- terminal search/find affordances
- deeper shell-integration metadata and toolbar content
- block/vdom term mode behavior

## Active remote / SSH foundation slice

TideTerm reference surface:

- `aiprompts/conn-arch.md`
- `aiprompts/fe-conn-arch.md`
- `pkg/remote/conncontroller/conncontroller.go`
- shell connection entry patterns in `frontend/app/workspace/widgets.tsx` and related shell surfaces

This slice is limited to remote foundation only. It closes:

- an explicit connection domain with local and SSH awareness
- persisted SSH profile representation
- active connection selection for new tabs
- connection-aware terminal launch options
- typed management routes for listing, saving, and selecting connections
- a shell-level connections entry surface and minimal connection UI

Exit criteria for this slice:

- remote is no longer `missing`
- the runtime has an explicit connection catalog
- the shell can surface and select connection targets
- new terminal tabs can be created against a selected connection target
- the implementation and remaining remote gap are documented explicitly

Current assessment after this slice:

- the foundation is now real and backend-owned
- local versus SSH is explicit in the runtime and in the shell
- this is enough to move remote from `missing` to `partial`
- it is not yet TideTerm-equivalent remote workflow parity

Remaining remote parity gap after this slice:

- richer remote connection lifecycle and statuses
- durable remote controller/agent semantics
- `~/.ssh/config` import and richer auth flows
- remote workspace and non-terminal remote surfaces
- full recognizable TideTerm remote workflow parity

## Active remote lifecycle / shell semantics slice

TideTerm reference surface:

- `aiprompts/conn-arch.md`
- `aiprompts/fe-conn-arch.md`
- connection entry and selection patterns in `frontend/app/workspace/widgets.tsx`

This slice is limited to remote lifecycle clarity only. It closes:

- an explicit distinction between saved SSH profile, active default target, last preflight result, last launch result, and shell-visible usability
- dedicated transport for explicit connection preflight checks
- shell-visible connection cards that show lifecycle state instead of only catalog metadata
- connection shell actions that expose `Check`, `Use for new tabs`, and `Open shell` without turning the shell into the owner of connection state

Exit criteria for this slice:

- the shell can show whether a saved connection is usable or needs attention
- the runtime can report the difference between a failed profile check and a failed launch attempt
- active connection semantics are documented as “default target for future tabs,” not “live connected controller”
- validation covers connection save/list/select/check flows on a freshly built runtime binary

Current assessment after this slice:

- remote is now lifecycle-oriented enough to be user-visible and honest
- the shell can explain why an SSH profile needs attention without pretending that a live remote session exists
- this is enough to make the remote slice usable as a foundation for future parity work, but not enough to claim TideTerm-equivalent remote workflows

Remaining remote lifecycle gap after this slice:

- live remote/session reachability distinct from local preflight
- richer launch-result reporting for real SSH failures against reachable hosts
- controller-oriented remote semantics instead of process-oriented shell launches
- broader remote shell UX and workflow parity

## Active real SSH launch slice

TideTerm reference surface:

- `aiprompts/conn-arch.md`
- `aiprompts/fe-conn-arch.md`
- remote shell entry expectations from TideTerm terminal/workspace flows

This slice is limited to one honest end-to-end SSH launch path plus truthful failure semantics. It closes:

- a real SSH happy path against one reachable host
- request-independent terminal process lifetime for shells started from HTTP routes
- explicit launch observation before a remote tab is admitted into the workspace
- shell-visible distinction between preflight warnings and actual launch success/failure
- honest failure recording for unknown-host and auth/connect errors

Exit criteria for this slice:

- a saved SSH profile can be selected and used to open a real remote shell
- the resulting terminal stays `running` after the create-tab request returns
- shell input reaches the remote prompt
- at least one real launch failure path is recorded back into the connection catalog
- validation documents the exact reachable target and what was not covered

Current assessment after this slice:

- the runtime now proves one real SSH launch instead of only describing the remote model
- failure semantics are honest enough for the shell to distinguish bad target, bad auth, and preflight-only warnings
- remote remains `partial`, but it is no longer only theoretical foundation work

Remaining remote gap after this slice:

- broader remote workflow parity beyond opening one shell on a saved target
- durable remote controller/session semantics
- `~/.ssh/config` import and richer auth strategies
- remote workspace surfaces and deeper TideTerm remote UX

## Active AI panel parity slice

TideTerm reference surface:

- `frontend/app/aipanel/aipanel.tsx`
- `frontend/app/aipanel/aipanelheader.tsx`
- `frontend/app/aipanel/aipanelmessages.tsx`
- `frontend/app/aipanel/aipanelinput.tsx`
- `frontend/app/aipanel/aimessage.tsx`

This slice is limited to AI panel behavior only. It closes:

- welcome-state grammar closer to TideTerm's getting-started panel
- compact mode/profile/role placement at the top of the message surface
- transcript rendering that is less operator/debug oriented and more message-like
- composer behavior closer to TideTerm's inline attach/send affordances
- demotion of operator/settings/audit entry points from the primary composer surface to secondary links and header/menu controls

Exit criteria for this slice:

- AI panel remains the left-side primary chat surface
- transcript renders as a recognizable message flow instead of a runtime debug stack
- composer keeps TideTerm-like attach/send placement and Enter/Shift+Enter behavior
- widget-context toggle, mode/profile/role controls, quick actions, and approval visibility still work
- no new console or network errors are introduced by the panel changes

Current assessment after this slice:

- the AI panel is now noticeably closer to TideTerm in panel grammar and user-facing balance
- transcript cards are more message-like and less runtime-debug oriented
- operator tooling still exists, but it now lives behind the header menu instead of in the primary composer footer
- the slice is good enough to continue later from a more recognizable TideTerm baseline

Remaining AI panel gap after this slice:

- richer assistant streaming behavior
- working file attachment transport
- richer message-part rendering and tool-use blocks
- deeper model-selection and AI settings flows

## Active AI conversation backend foundation slice

TideTerm reference surface:

- `frontend/app/aipanel/aipanel.tsx`
- `frontend/app/aipanel/aipanelmessages.tsx`
- `frontend/app/aipanel/aipanelinput.tsx`
- `frontend/app/aipanel/aimessage.tsx`

This slice is limited to making the existing TideTerm-derived AI panel real. It closes:

- a backend-owned persisted conversation transcript
- a real prompt submission path from the composer to the Go core
- a real assistant response path through Ollama instead of a local placeholder fallback
- transcript coexistence between true conversation messages and runtime/action/approval feed entries
- explicit projection of prompt profile, role preset, and work mode into the backend system prompt
- honest audit events for conversation success and provider failure

Exit criteria for this slice:

- free-text prompts no longer terminate in a fake placeholder response
- the backend records user and assistant messages in a persisted transcript
- the AI panel transcript shows true assistant responses
- role/mode/profile context is projected into the backend request path
- docs explicitly describe what remains placeholder and what is now real

Current assessment after this slice:

- the AI panel is no longer only a runtime-backed activity surface
- one real Ollama-backed conversation happy path is validated
- assistant/provider failures are shown as assistant error messages in the transcript instead of disappearing behind transport-only failures
- this is enough to move “real conversation transport” off the main AI gap list, but not enough to claim full TideTerm-equivalent AI behavior

Remaining AI conversation gap after this slice:

- no streaming assistant output yet
- no attachment transport
- no tool-calling or richer mixed message-part rendering
- no model selection UX in the shell

## Active AI terminal command execution slice

TideTerm reference surface:

- `frontend/app/aipanel/aipanel.tsx`
- `frontend/app/aipanel/aipanelmessages.tsx`
- `frontend/app/aipanel/aipanelinput.tsx`

This slice is limited to one release-oriented AI feature only. It closes:

- an explicit `/run <command>` and `run: <command>` path in the current AI composer
- execution through the real `term.send_input` tool/runtime/policy path
- post-execution explanation through the backend conversation service instead of a frontend placeholder
- transcript coexistence between runtime action entries and provider-backed assistant result summaries
- approval-aware follow-up for the same command flow

Exit criteria for this slice:

- a user prompt can trigger one real terminal command path from the AI panel grammar
- the command uses the existing tool runtime rather than a hidden frontend shortcut
- dangerous execution still produces an approval requirement when the active profile demands it
- after execution, the backend appends a real assistant explanation to the persisted conversation transcript
- docs clearly distinguish what is real today versus what remains placeholder

Current assessment after this slice:

- the release-critical capability now exists
- a safe local `/run` path is validated end to end against the real sidecar and Ollama provider
- an approval-gated `/run` path is validated at runtime and still records approval semantics correctly
- the blocker is now about daily-driver hardening and broader shell-visible validation, not missing core functionality

Remaining AI execution gap after this slice:

- broader browser-driven validation of the panel flow in this environment
- streaming assistant output
- richer result rendering and command/tool blocks
- attachments and broader agent orchestration, which remain post-1.0 or later-slice work

## Active settings/control-surface parity slice

TideTerm reference surface:

- `frontend/app/workspace/widgets.tsx`
- `frontend/app/view/waveconfig/*`
- `frontend/app/view/helpview/*`

This slice is limited to shell-level control and settings surfaces only. It closes:

- TideTerm-shaped utility access from the widget dock via runtime/settings flyouts
- a user-facing settings surface for trust/privacy/help instead of only raw operator forms
- clearer audit utility framing and runtime-trail presentation
- deep-linking from dock controls into `Overview`, `Trusted tools`, `Secret shield`, and `Help`
- a focused policy-actions hook so settings interactions do not bloat the root shell orchestration

Exit criteria for this slice:

- settings/control entry points are visible from the widget dock
- trust and ignore controls are reachable without using the operator console
- audit remains reachable as a shell utility surface
- shell utility placement remains secondary to terminal and AI, not a new primary column
- no new broad TideTerm import wave or builder/proxy/settings sprawl is introduced

Current assessment after this slice:

- control-surface parity is now recognizably TideTerm-derived at the shell level
- trust/privacy management is more user-facing and less operator-first
- the remaining gap is no longer “can a user find settings”, but “how much of TideTerm’s broader settings universe is still absent”

Remaining settings/control-surface gap after this slice:

- dedicated waveconfig-style product settings views
- separate help/tips surfaces instead of the current closest-compatible help card
- richer widget/app launcher parity

## Active widget/launcher parity slice

TideTerm reference surface:

- `frontend/app/workspace/widgets.tsx`
- `frontend/app/view/launcher/launcher.tsx`

This slice is limited to widget/app entry behavior only. It closes:

- a launcher-like dock flyout for discovering shell entry points
- a dedicated searchable launcher section in the shell
- direct shell affordances for opening a new terminal tab, returning to AI, opening runtime/audit/help surfaces, and focusing current widgets
- stronger discoverability of available shell surfaces without promoting runtime/operator tools into the main content area

Exit criteria for this slice:

- widget/app entry controls are visible from the dock
- help and utility entry flows are reachable from the same shell-level launcher area
- widget discovery improves without introducing a broad app catalog import
- terminal, AI, and settings surfaces remain intact after the launcher changes

Current assessment after this slice:

- the shell now behaves more like TideTerm in how it exposes “what can I open from here?”
- launcher-style discoverability now exists both in the dock and as a dedicated searchable shell section, but it is still a closest-compatible shell utility surface rather than a full launcher product area

Remaining widget/launcher gap after this slice:

- real local app catalog and app metadata
- broader help/tips and widget catalog parity
