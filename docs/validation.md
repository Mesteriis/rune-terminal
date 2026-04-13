# Validation Report

Validation date: `2026-04-13`

All commands below were run against the repository in its current state on macOS arm64.

## Frontend baseline import validation

The parity-first frontend import path was exercised directly:

```bash
npm run import:tideterm-frontend
npm --prefix frontend run lint
npm --prefix frontend run build
```

Observed result:

- the TideTerm renderer source was copied into `frontend/tideterm-src/`
- TideTerm renderer build metadata was copied into `frontend/tideterm-src-meta/`
- frontend lint still passed because the imported baseline is intentionally ignored by the current lint config
- frontend build still passed, confirming the literal source import does not break the current runnable shell

## Latest parity slice

The latest product-parity slice focused on TideTerm-derived shell behavior:

- top tab-strip shell retained as the primary navigation surface
- AI panel moved onto a persisted left-side resizable panel model
- terminal stage kept as the center surface
- right side constrained to a slim dock instead of a primary control column

Validation executed for this slice:

```bash
npm --prefix frontend install
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- the new frontend dependency set installed successfully
- frontend lint passed
- frontend build passed
- full repository validation still passed after the shell/layout refactor

What was not revalidated in this slice:

- `npm run tauri:dev` was not re-run after the parity-shell refactor
- no fresh UI automation run was performed after this specific shell/layout pass

## Latest AI panel parity slice

The next frontend parity slice focused on bringing the left AI panel back toward the TideTerm interaction grammar:

- TideTerm-shaped AI panel header retained as the primary panel chrome
- widget-context toggle restored as a first-class control
- primary `agent` view moved from settings-first forms to a message-like panel surface
- profile / role / mode controls moved into a bottom dock instead of dominating the panel body
- tools / settings / audit remained available as secondary views inside the same shell

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation still passed after the AI panel refactor

What was not revalidated in this slice:

- `npm run tauri:dev` was not re-run after this specific AI panel refactor
- no fresh manual UI smoke or screenshot diff was executed after this specific panel pass

## Latest widget rail parity slice

The following shell pass restored the TideTerm hierarchy on the right side of the workspace:

- the right rail is widget-first again
- widget focus actions moved back into the main rail stack
- tools / settings / audit were demoted to footer utilities instead of acting like the primary right-side content model

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

Observed result:

- frontend lint passed
- frontend build passed

Additional follow-up validation:

```bash
npm run validate
```

Observed result:

- full repository validation passed after the rail adjustment as well

What was not revalidated in this slice:

- no fresh UI automation or manual Tauri launch was performed for this rail-only shell adjustment

## Latest tab-shell parity slice

The next shell pass moved the top workspace header closer to TideTerm's tabbar composition:

- workspace switcher-style control restored on the left
- tabs remained in the center strip
- AI control was moved into the right-side cluster instead of staying in a separate summary block

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

Observed result:

- frontend lint passed
- frontend build passed

Additional follow-up validation:

```bash
npm run validate
```

Observed result:

- full repository validation passed after the top-bar shell adjustment as well

What was not revalidated in this slice:

- no fresh UI automation or manual Tauri launch was performed for this top-bar-only shell adjustment

## Latest workspace tab-model parity slice

The next parity pass introduced a real tab domain into the new workspace model:

- workspace snapshots now include `tabs` and `active_tab_id`
- the runtime exposes `workspace.list_tabs`, `workspace.get_active_tab`, and `workspace.focus_tab`
- focusing a tab synchronizes the active widget
- the top shell now renders runtime tabs instead of reusing widgets as fake tabs

Validation executed for this slice:

```bash
./scripts/go.sh test ./core/workspace ./core/app
npm --prefix frontend run lint
npm --prefix frontend run build
```

Observed result:

- workspace and app-layer tab tests passed
- frontend lint passed
- frontend build passed

Additional follow-up validation:

```bash
npm run validate
```

Observed result:

- full repository validation passed after introducing the tab model

What was not revalidated in this slice:

- no fresh UI automation or manual Tauri launch was performed after this specific tab-domain pass

## Latest tab-controls parity slice

The next workspace parity pass added basic TideTerm-style tab controls:

- top shell can create a new terminal tab
- top shell can close an existing tab
- closing a tab tears down the associated terminal session
- the runtime prevents closing the last remaining tab

Validation executed for this slice:

```bash
./scripts/go.sh test ./core/workspace ./core/terminal ./core/app
npm --prefix frontend run lint
npm --prefix frontend run build
```

Observed result:

- workspace, terminal, and app-layer tests passed
- frontend lint passed
- frontend build passed

Additional follow-up validation:

```bash
npm run validate
```

Observed result:

- full repository validation passed after the tab-controls slice

What was not revalidated in this slice:

- no fresh UI automation or manual Tauri launch was performed after this specific create/close-tab pass

## Latest tab-rename-and-pin parity slice

The next workspace parity pass extended the top strip toward real TideTerm tab behavior:

- tabs can now be renamed inline in the top strip
- tabs can now be pinned and unpinned from the top strip
- pinned tabs render before regular tabs
- the runtime exposes `workspace.rename_tab` and `workspace.set_tab_pinned`
- workspace and app-layer tests now cover rename and pin flows

Validation executed for this slice:

```bash
./scripts/go.sh test ./core/workspace ./core/app
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- targeted workspace and app-layer tests passed
- frontend lint passed
- frontend build passed
- full repository validation passed after the tab rename/pin slice

What was not revalidated in this slice:

- no fresh UI automation was run after the inline rename/pin change
- no fresh manual Tauri launch was performed after this specific top-strip interaction pass

## Latest tab-reorder parity slice

The next workspace parity pass extended the tabbar toward TideTerm reorder behavior:

- the runtime now exposes `workspace.move_tab`
- tabs can be drag-reordered inside their current pinned or regular group
- cross-group drag between pinned and regular tabs is rejected by the workspace domain
- workspace and app-layer tests now cover tab move flows

Validation executed for this slice:

```bash
./scripts/go.sh test ./core/workspace ./core/app
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- targeted workspace and app-layer tests passed
- frontend lint passed
- frontend build passed
- full repository validation passed after the tab reorder slice

What was not revalidated in this slice:

- no fresh UI automation was run after the drag-reorder change
- no fresh manual Tauri launch was performed after this specific tabbar interaction pass

## Latest tab-context-menu parity slice

The next tabbar parity pass added a TideTerm-style context menu to each tab:

- right-click on a tab now opens a context menu
- the context menu exposes pin/unpin, rename, and close actions
- the menu is wired to the existing runtime-backed tab actions instead of introducing frontend-only state

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the tab context-menu slice

What was not revalidated in this slice:

- no fresh UI automation was run after adding the context menu
- no fresh manual Tauri launch was performed after this specific tab menu pass

## Latest workspace-switcher parity slice

The next shell parity pass restored a TideTerm-shaped workspace-switcher entry point:

- the top-left workspace button now opens a workspace popover
- the popover shows the active workspace, repository root, active tab, and active widget
- the popover provides a shell-level `New terminal tab` action
- multi-workspace switching is still explicitly pending and is not faked in the frontend

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the workspace-switcher slice

What was not revalidated in this slice:

- no fresh UI automation was run after the workspace-switcher popover change
- no fresh manual Tauri launch was performed after this specific shell-control pass

## Latest widget-dock control parity slice

The next shell parity pass moved the right-side dock closer to TideTerm control behavior:

- widget dock footer actions now open flyout menus instead of acting like raw section toggles
- runtime and settings entry points stay shell-level and route into existing operator/policy surfaces
- the dock remains a secondary control surface instead of becoming another primary content column

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the widget-dock control slice

What was not revalidated in this slice:

- no fresh UI automation was run after the dock flyout change
- no fresh manual Tauri launch was performed after this specific widget-dock pass

## Latest AI-header parity slice

The next AI-panel parity pass restored TideTerm header grammar:

- the AI panel header now uses a TideTerm-shaped title row
- widget context toggle stays in the header
- section switching moved into a kebab overflow menu instead of a custom pill strip
- AI section routing still targets the current runtime, policy, and audit surfaces

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the AI-header slice

What was not revalidated in this slice:

- no fresh UI automation was run after the AI header/menu change
- no fresh manual Tauri launch was performed after this specific AI-panel shell pass

## Latest AI-mode-strip parity slice

The next AI-panel parity pass moved posture controls closer to TideTerm message flow:

- prompt profile, role preset, and work mode selectors now render in a top mode strip above the message feed
- the footer is now reserved for shell-level actions instead of carrying the full posture form
- this keeps the current runtime-backed controls while aligning panel composition with TideTerm

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the AI mode-strip slice

What was not revalidated in this slice:

- no fresh UI automation was run after moving the posture controls
- no fresh manual Tauri launch was performed after this specific AI-panel layout pass

## Latest AI-quick-actions parity slice

The next AI-panel parity pass added working quick actions inside the AI feed:

- the AI welcome card now exposes `Inspect terminal`, `List tabs`, and `Open audit`
- these actions call the current runtime and section surfaces instead of introducing frontend-only behavior
- this is the current closest-compatible interaction layer until a real conversation backend lands

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the AI quick-actions slice

What was not revalidated in this slice:

- no fresh UI automation was run after adding the quick actions
- no fresh manual Tauri launch was performed after this specific AI-panel action pass

## Latest AI-transcript parity slice

The next AI-panel parity pass moved the panel closer to TideTerm's message flow:

- the welcome state is now a single TideTerm-shaped AI message instead of multiple static status cards
- runtime-backed quick actions, approval confirmations, and profile/role/mode updates now append into a persistent AI activity transcript
- the transcript auto-scrolls like a message feed and distinguishes user-side versus assistant-side entries
- this remains a closest-compatible equivalent until a real conversation backend is wired in

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the AI transcript slice

What was not revalidated in this slice:

- no fresh UI automation was run after introducing the transcript behavior
- no fresh manual Tauri launch was performed after this specific AI-panel transcript pass

## Latest AI-composer parity slice

The next AI-panel parity pass added a TideTerm-shaped footer composer with explicit MVP semantics:

- the AI panel now accepts prompt input through a textarea composer instead of only quick-action buttons
- supported prompts map onto real runtime actions such as terminal inspection, tab listing, widget listing, active-tab lookup, and terminal interrupt
- unsupported prompts produce an explicit assistant-side fallback instead of pretending a full conversation backend exists

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the AI composer slice

What was not revalidated in this slice:

- no fresh UI automation was run after adding the composer behavior
- no fresh manual Tauri launch was performed after this specific AI-panel composer pass

## Tooling baseline

- Go: `go1.26.2 darwin/arm64`
- Node: `v24.14.1`
- npm: `11.11.0`
- Rust: stable toolchain with `cargo`
- Tauri CLI: local npm package `@tauri-apps/cli` `2.10.1`

## Build and test validation

The following commands completed successfully:

```bash
npm install
npm --prefix frontend install
npm run build:core
npm run validate
```

`npm run validate` expands to:

```bash
npm run lint:frontend
npm run build:frontend
npm run test:go
npm run build:go
npm run tauri:check
```

Observed results:

- frontend lint passed
- frontend production build passed
- Go tests passed for `./cmd/... ./core/... ./internal/...`
- Go package build passed
- `build:core` emitted `apps/desktop/bin/rterm-core`
- `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml` passed

Notable correctness coverage now exercised by Go tests:

- concurrent `terminal.StartSession` coalesces to one launch
- unsubscribe/output delivery does not panic under concurrent delivery and channel close
- pending approvals are consumed by `safety.confirm`
- approval grants are one-time and cannot be replayed
- `term.interrupt` executes against the active terminal widget and returns a structured result
- policy table tests cover ignore precedence, trusted matching, allowed roots, approval escalation, destructive handling, and capability overlays

## Launch validation

The documented launch path was exercised directly:

```bash
npm run build:core
npm run tauri:dev
```

Observed launch behavior:

- `npm run tauri:dev` used `./scripts/tauri-dev.sh`
- the wrapper performed fail-fast checks for `npm`, `cargo`, `curl`, macOS CLT, frontend dependencies, local npm Tauri CLI, and the built Go core binary
- the Tauri development build completed successfully
- the desktop binary was started successfully:

```text
Finished `dev` profile [unoptimized + debuginfo] target(s) in 37.11s
Running `target/debug/rterm-desktop`
{"base_url":"http://127.0.0.1:51312","pid":12665}
```

The launch was then interrupted manually after confirming that the desktop shell and Go sidecar reached the running state.

## Runtime smoke validation

The built Go runtime was started directly and exercised over the real HTTP API with auth enabled:

```bash
RTERM_AUTH_TOKEN=test-token ./apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:0 \
  --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal \
  --state-dir <tmp>/state \
  --ready-file <tmp>/ready.json
```

Validated slice:

- `GET /api/v1/agent`
- `PUT /api/v1/agent/selection/mode`
- `term.get_state`
- dangerous policy mutation returning `428 approval_required`
- `safety.confirm`
- one-time approval token consumption

Observed runtime results:

- agent catalog endpoint responded successfully
- mode updates via the management API succeeded
- `term.get_state` succeeded for `term-main`
- dangerous `safety.add_ignore_rule` returned `428`
- `safety.confirm` returned an approval token
- the approved mutation succeeded once with `200`
- replaying the same approval token returned `428`, confirming single-use approval grants

## UI smoke validation

The browser-hosted frontend was exercised against a real loopback `rterm-core` instance using explicit runtime environment variables:

```bash
RTERM_AUTH_TOKEN=test-token ./apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:0 \
  --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal \
  --state-dir <tmp>/state \
  --ready-file <tmp>/ready.json

VITE_RTERM_API_BASE=http://127.0.0.1:<port> \
VITE_RTERM_AUTH_TOKEN=test-token \
  npm --prefix frontend run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

The UI itself was then driven by a local temporary Playwright install outside the repository so project dependencies were not modified.

Validated interaction slice:

- load the shell UI and bootstrap the live terminal surface
- switch prompt profile, role preset, and work mode through the visible selectors
- send terminal input through the xterm keyboard path and observe echoed output
- execute `safety.add_ignore_rule` from the operator panel with a manual JSON payload
- observe `approval required`, confirm the action, and see the success path complete
- verify the audit tail shows the tool event and `approval used`
- interrupt the active terminal session from the visible interrupt action

Observed result:

```json
{
  "ok": true,
  "steps": [
    "load app",
    "switch profile/role/mode",
    "send terminal input through xterm keyboard path",
    "trigger approval through operator panel",
    "return profile to balanced for operator actions",
    "interrupt active terminal"
  ]
}
```

## What was not validated

- no full packaged `tauri build` was run
- no Linux launch path was exercised in this pass
- no native-window automation was run inside the Tauri shell; launch readiness was validated with `npm run tauri:dev`, and UI interactions were validated against the browser-hosted frontend connected to the same Go runtime
- `cargo fmt` was not run because `rustfmt` is not installed in the local Rust toolchain
