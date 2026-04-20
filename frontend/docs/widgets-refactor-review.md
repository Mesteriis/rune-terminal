# Widget Layer Review And Refactor Plan

Date: `2026-04-20`

## Scope

- reviewed the active widget layer under `frontend/src/widgets/`
- checked the widget contract against `frontend/docs/ui-architecture.md`
- used the current local tree, including the recent widget regrouping into `ai/`, `commander/`, `panel/`, `shell/`, `terminal/`, and `demo/`

## Findings

### 1. [BLOCKER] The widget layer is not buildable right now.

Impact:

- `frontend` does not have a green production build, so any widget refactor is currently operating without a reliable compile-time safety net.
- this is not isolated to test-only code; the failures sit on the commander runtime path and the commander widget itself

Evidence:

- `npm --prefix frontend run build` fails in the current tree
- `src/features/commander/model/store.ts:167`, `187`, `918`, `939`, `975`, `994`, `1177`, `1627`, `1780`, `2014`, `2066`
- `src/widgets/commander/commander-widget.tsx:270`, `723`, `735`, `747`, `759`, `970`

Why this matters for refactoring:

- until the commander model and commander widget agree on runtime shapes and primitive props again, every further split risks moving broken contracts around instead of simplifying them

### 2. [HIGH] `DockviewPanelWidget` is acting as a product router and violates the documented layer direction.

Impact:

- adding a new panel kind requires editing a widget-level file that branches on product ids like `tool` and `terminal*`
- the panel body wrapper is coupled to layout selection and product routing instead of only rendering a panel frame
- this breaks the documented dependency direction and makes panel composition harder to test in isolation

Evidence:

- `frontend/docs/ui-architecture.md:94-109` documents one-way dependency direction and only allows `widgets -> styles + components + primitives`
- `frontend/src/widgets/panel/dockview-panel-widget.tsx:5` imports `CommanderDemoLayout` from `@/layouts`
- `frontend/src/widgets/panel/dockview-panel-widget.tsx:48-61` routes behavior from magic panel ids
- `frontend/src/widgets/panel/dockview-panel-widget.tsx:93-112` chooses between terminal body, commander layout, and fallback content inside the widget itself

### 3. [HIGH] Shell widgets still own Dockview and workspace mutations that the frontend contract says belong to `App.tsx`.

Impact:

- shell rendering and workspace orchestration are mixed together
- `RightActionRailWidget` is not a presentational rail; it is mutating Dockview groups, generating panel ids, and selecting product presets
- this makes shell widgets harder to reuse and pushes app-level state transitions into callback-heavy leaf components

Evidence:

- `frontend/docs/ui-architecture.md:130-132` states that `App.tsx` owns Dockview wiring and UI state
- `frontend/src/widgets/shell/right-action-rail-widget.tsx:105-108` accepts a mutable `DockviewApi` ref directly
- `frontend/src/widgets/shell/right-action-rail-widget.tsx:164-216` computes panel positions and calls `dockviewApi.addPanel(...)`
- `frontend/src/widgets/terminal/terminal-panel.ts:20-47` stores shell/session/cwd presets in the widget layer
- `frontend/src/widgets/terminal/terminal-panel.ts:89-103` owns terminal panel id generation in the widget layer

### 4. [HIGH] `CommanderWidget` has forked its own primitive contract instead of composing shared primitives cleanly.

Impact:

- the widget now carries custom DOM wrappers (`CommanderPlainButton`, `CommanderPlainBox`) in parallel to shared primitives such as `Box`, `Button`, and `TextArea`
- shared primitive changes no longer propagate safely into the commander surface
- the existing build errors show the cost already landed: prop contracts for `runaComponent` and `ref` have drifted apart

Evidence:

- `frontend/docs/ui-architecture.md:77-82` says widgets compose primitives and components
- `frontend/src/widgets/commander/commander-widget.tsx:18-19` already imports shared primitives and components
- `frontend/src/widgets/commander/commander-widget.tsx:211-259` defines custom raw-HTML wrappers anyway
- `frontend/src/widgets/commander/commander-widget.tsx:263-290` routes header-cell interaction through that custom wrapper path
- `frontend/src/widgets/commander/commander-widget.tsx:721-759` passes `runaComponent` into `CommanderHeaderCell`, which does not type it
- `frontend/src/widgets/commander/commander-widget.tsx:970` passes `ref` into `TextArea`, which the current primitive contract does not accept

### 5. [MEDIUM] Widget host infrastructure is duplicated and tightly coupled to Dockview’s internal DOM.

Impact:

- modal mounting and busy-overlay mounting both depend on `.dv-groupview` being the right host root
- if Dockview changes its DOM shape or panel nesting, two separate overlay systems break together
- any future cross-cutting layer like error overlays, approvals, or contextual toasts will likely repeat the same brittle mount logic

Evidence:

- `frontend/src/widgets/panel/modal-host-widget.tsx:60-67` resolves the mount node with `document.querySelector(...).closest('.dv-groupview')`
- `frontend/src/widgets/panel/modal-host-widget.tsx:83-100` re-resolves it through `requestAnimationFrame`
- `frontend/src/widgets/panel/modal-host-widget.tsx:127-131` portals directly into that resolved Dockview node
- `frontend/src/widgets/panel/widget-busy-overlay-widget.tsx:149-156` duplicates the same `.dv-groupview` lookup
- `frontend/src/widgets/panel/widget-busy-overlay-widget.tsx:180-194` duplicates the `requestAnimationFrame` mount timing workaround
- `frontend/src/widgets/panel/widget-busy-overlay-widget.tsx:218-234` performs direct DOM mutation by id on the particles mount element

### 6. [MEDIUM] `ShellTopbarWidget` has broken accessibility semantics for window actions.

Impact:

- assistive technology will announce close/minimize/fullscreen controls as tabs instead of buttons
- keyboard expectations are misleading because these controls do not participate in a tabpanel relationship
- this is structural a11y debt, not a cosmetic label issue

Evidence:

- `frontend/src/widgets/shell/shell-topbar-widget.tsx:91-99` marks close, collapse, and fullscreen actions with `role="tab"` and `aria-selected="false"`
- only the workspace strip at `frontend/src/widgets/shell/shell-topbar-widget.tsx:109-122` has a real tablist-like grouping

### 7. [LOW] `DemoWidget` is dead public API and should not stay in the top-level widget barrel.

Impact:

- dead exports expand the public surface for no product value
- they make the widget package look broader than the actual shell/runtime surface

Evidence:

- `frontend/src/widgets/index.ts:3` exports `./demo`
- `frontend/src/widgets/demo/demo-widget.tsx:4` defines `DemoWidget`
- a repo search for `DemoWidget|demo-widget` only finds the demo folder itself

## Refactor Plan

### Phase 0. Restore a green widget build first

Goal:

- make `npm --prefix frontend run build` pass before structural decomposition continues

Work:

- reconcile `CommanderPaneRuntimeState` and `CommanderWidgetRuntimeState` updates in `src/features/commander/model/store.ts`
- fix the commander widget prop drift by either:
  - removing `CommanderPlainButton` and `CommanderPlainBox` in favor of shared primitives, or
  - making the custom wrappers fully type-compatible and proving why they must exist
- make `TextArea` ref handling explicit and consistent with the shared primitive contract

Exit criteria:

- `npm --prefix frontend run lint:active`
- `npm --prefix frontend run build`

Recommended commit:

- `fix(frontend): restore commander widget and store build contracts`

### Phase 1. Move panel routing and Dockview orchestration back up to `app`

Goal:

- make widgets render UI only, not route product behavior

Work:

- remove `CommanderDemoLayout` import from `src/widgets/panel/dockview-panel-widget.tsx`
- introduce an app-level panel resolver, for example under `frontend/src/app/`
- have `App.tsx` choose which panel body to mount from normalized panel specs instead of magic string checks inside the widget layer
- move terminal preset creation and panel-id allocation out of `src/widgets/terminal/terminal-panel.ts` into app/workspace orchestration

Exit criteria:

- `DockviewPanelWidget` becomes a thin frame wrapper with no `@/layouts` import and no `tool` / `terminal*` id routing
- `RightActionRailWidget` receives app callbacks only and no `DockviewApi` ref

Recommended commit:

- `refactor(frontend): move dockview panel routing into app orchestration`

### Phase 2. Introduce one shared widget host frame for overlays and focus state

Goal:

- stop duplicating Dockview host lookup and portal mounting logic

Work:

- create a single panel-host adapter in `widgets/panel/` that owns:
  - host resolution
  - focus-state mirroring
  - widget-scoped overlays
  - portal mounting into the Dockview host
- make `ModalHostWidget` and `WidgetBusyOverlayWidget` consumers of that adapter instead of each doing their own DOM lookup
- isolate Dockview-specific selectors like `.dv-groupview` to one file

Exit criteria:

- only one widget-layer module knows about `.dv-groupview`
- modal and busy overlay no longer duplicate host lookup code

Recommended commit:

- `refactor(frontend): centralize widget host frame and overlay mounting`

### Phase 3. Split `CommanderWidget` into focused subwidgets and pure helpers

Goal:

- turn the current monolith into reviewable units with clear ownership

Recommended target split:

- `widgets/commander/commander-header.tsx`
- `widgets/commander/commander-pane.tsx`
- `widgets/commander/commander-list-header.tsx`
- `widgets/commander/commander-row.tsx`
- `widgets/commander/commander-pending-bar.tsx`
- `widgets/commander/commander-file-dialog.tsx`
- `widgets/commander/commander-path-suggestions.tsx`
- `widgets/commander/lib/path-suggestions.ts`
- `widgets/commander/lib/rename-presets.ts`

Rules for the split:

- keep state ownership in `features/commander/model/*`
- move render helpers and pure derivations out of the component body
- keep style objects in `commander-widget.styles.ts` only until the UI split is complete, then split style modules by subwidget
- do not let the subwidgets start importing `App`, `layouts`, or Dockview APIs

Exit criteria:

- `commander-widget.tsx` becomes a composition shell instead of a 1.8k-line feature bundle
- each commander subwidget has a narrow prop surface and no hidden DOM contract drift

Recommended commit ladder:

- `refactor(frontend): split commander header and list header`
- `refactor(frontend): extract commander file dialog`
- `refactor(frontend): extract commander pending flows and helpers`

### Phase 4. Fix shell semantics and trim the public widget surface

Goal:

- remove false semantics and dead exports

Work:

- change shell window controls back to plain buttons with button semantics
- decide whether workspace tabs are true tabs or just segmented actions; implement the matching ARIA model fully
- remove `DemoWidget` from the public barrel unless it is intentionally part of the shell surface

Exit criteria:

- no non-tab action uses `role="tab"`
- `src/widgets/index.ts` exports only supported shell-facing widgets

Recommended commit:

- `fix(frontend): correct shell control semantics and widget exports`

## Suggested Refactor Order

1. get the build green
2. pull routing/orchestration up into `app`
3. centralize panel host and overlays
4. split commander into subwidgets
5. clean shell semantics and dead exports

This order matters. Splitting the commander widget before restoring build health and panel ownership will just move unstable contracts into more files.

## Validation Gates

- `npm --prefix frontend run lint:active`
- `npm --prefix frontend run build`
- a focused browser smoke for:
  - right-rail widget creation flows
  - widget-scoped modal mounting
  - widget busy overlay mounting and release path
  - commander keyboard and file-dialog flows
  - shell topbar keyboard/focus behavior

## Commands Used For This Review

- `find frontend/src/widgets -maxdepth 2 -type f | sort`
- `wc -l frontend/src/widgets/**/*.tsx frontend/src/widgets/**/*.ts`
- `rg -n ... frontend/src/widgets --glob '*.{ts,tsx}'`
- `npm --prefix frontend run build`
