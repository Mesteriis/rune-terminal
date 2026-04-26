# UI Architecture

## Layer Rules

### Tokens

- CSS variables only
- No React code
- Shared visual values live in `src/shared/ui/tokens/index.css`

Current token families:

- dark canvas and glass surface colors
- shell and AI chrome colors for headers, active tabs, soft borders, and warning tints
- accent colors for dark emerald and cold-tea tones
- text and border tiers
- spacing, gap, padding, and margin scales
- radii, control sizes, and shell sizes
- shell and layout sizing tokens expose responsive tablet/mobile overrides directly from `src/shared/ui/tokens/index.css` instead of scattering breakpoint constants across widgets
- the token layer also owns dark/light environment overrides through `prefers-color-scheme`, while `src/index.css` applies the corresponding shell/body print flattening rules
- z-index values are defined as named tiers in the token layer, from base/floating chrome through widget busy and modal overlays
- glass blur and shadow values

### Styles

- Style modules keep presentational constants separate from rendering logic
- Style modules use CSS variables and plain style objects only
- Style modules must not import app state, backend contracts, or widget runtime logic

Current isolated style modules:

- `CommanderWidget` local dense-surface styles are split across `src/widgets/commander/commander-*.styles.ts`, with `commander-widget.styles.ts` acting as the public barrel for widget callers
- `ShellTopbarWidget`, `RightActionRailWidget`, and `ModalHostWidget` now keep their shell/panel chrome constants in adjacent `*.styles.ts` files instead of mixing presentational objects into the widget files

### Primitives

- Wrap native HTML elements
- Use tokens only
- Must be typed with native HTML props
- Must expose `forwardRef` for the underlying native element
- No business logic
- Shared primitive fallback helpers are allowed only when they preserve primitive-local semantics and keep DOM identity resolution consistent

Current primitives:

- `Box`
- `Badge`
- `Button`
- `Checkbox`
- `Image`
- `Input`
- `Label`
- `Radio`
- `ScrollArea`
- `Select`
- `Separator`
- `Surface`
- `TerminalViewport`
- `Text`
- `TextArea`

### Components

- Compose primitives only
- Must not use raw HTML elements
- Provide reusable UI combinations
- Repeated component-layer presentational resets should be centralized in shared component-local helpers instead of copied across files
- Interactive shared components must preserve browser accessibility baselines: do not suppress page zoom globally, wire explicit ARIA naming/ownership for composite controls, and move focus intentionally instead of relying on uncontrolled `autoFocus`

Current reusable controls:

- `InputField`
- `IconButton`
- `SearchableMultiSelect`
- `Tabs` with `horizontal` and `vertical` orientations
- `RadioControl`
- `RadioGroup`
- `SwitcherControl`
- `SwitcherGroup`
- `ExpandableTextArea` with expansion to the parent bounds or to a selected DOM target
- `DialogPopup`
- `Notify`
- `TerminalStatusHeader`
- `TerminalSurface`
- `TerminalToolbar`
- `SearchableMultiSelect` exposes a labelled `listbox` / `option` contract with `aria-selected` instead of toggle-button semantics
- `RadioGroup` exposes a named `radiogroup` contract through an explicit label id
- `TerminalToolbar` moves focus into the search field explicitly when the search row opens
- `TerminalToolbar` keeps search ergonomics ahead of decorative status chrome: when terminal search opens, the search row takes over the trailing utility area and the renderer badge is intentionally hidden until search closes
- `TerminalStatusHeader` now has direct component coverage for default terminal meta rendering and compact `primaryText` mode without meta badges
- `TerminalStatusHeader` also supports the expanded body-header density used by `TerminalWidget`: stacked primary/secondary text for the live terminal identity, while compact Dockview tabs stay on the single-line variant

### Widgets

- Compose primitives and components
- Represent UI blocks
- Stay above shared UI layers
- Widget source is grouped by domain under `src/widgets/ai/`, `src/widgets/commander/`, `src/widgets/panel/`, `src/widgets/settings/`, `src/widgets/shell/`, `src/widgets/terminal/`, and `src/widgets/demo/`

### Layouts

- Compose widgets into isolated demo or shell surfaces
- Must not own backend semantics
- Must stay thinner than widgets and app orchestration

Current layouts:

- `CommanderDemoLayout`

## Dependency Direction

The dependency direction is one-way:

`tokens -> styles -> primitives -> components -> widgets -> layouts -> app`

Higher layers can depend on lower layers.
Lower layers must not depend on higher layers.

## Allowed Imports

- `styles -> tokens`
- `primitives -> tokens`
- `components -> primitives`
- `widgets -> styles + components + primitives`
- `layouts -> widgets`

## Path Aliases

- `@/* -> src/*`
- `@assets/* -> assets/*`
- active frontend source imports should use these aliases instead of multi-hop relative paths
- alias usage does not change the layer rules above; it only shortens the import surface

## Public API

- `src/shared/ui/primitives/index.ts`
- `src/shared/ui/components/index.ts`
- `src/widgets/index.ts`
- `src/layouts/index.ts`

## Current Shell Mapping

The active frontend shell example now consumes the UI layers instead of rendering
its visible shell blocks as raw HTML inside `App.tsx`.

- `App.tsx` owns Dockview wiring and UI state only.
- `ShellTopbarWidget` renders the top header block and now keeps workspace tabs plus the add-workspace affordance inside one compact grouped strip, instead of splitting the tab row and the create action into separate shell controls.
- `RightActionRailWidget` renders the full-height right rail.
- `WidgetBusyOverlayWidget` renders a widget-body busy state overlay with a centered AI marker and a `tsParticles` node-edge field.
- `CommanderWidget` renders the Total Commander-style dual-pane surface from a per-widget commander model.
- `CommanderPanelWidget` keeps the Dockview commander panel path inside the widget layer, so Dockview panel rendering does not import a layout.
- `CommanderDockviewTabWidget` now keeps commander tabs in the same compact workspace-level strip language as the rest of the shell: compact `commander` pill, readable `tool/tool N` title derived from the panel identity, and a per-tab close affordance only when that commander group actually has multiple tabs.
- The active commander read path now stays within the frontend/widget boundary but resolves through typed transport adapters: `shared/api/runtime.ts` discovers `baseUrl/authToken` plus `repo_root/home_dir`, and `features/commander/api/client.ts` maps `/api/v1/bootstrap`, `/api/v1/fs/list`, `/api/v1/fs/read`, and `/api/v1/fs/file` into widget-facing directory/file snapshots.
- `shared/api/runtime.ts` now also carries a bounded shell/runtime summary (`defaultShell`, `term`, `colorTerm`) from `/api/v1/bootstrap`, and `CommanderWidget` projects that metadata only through a narrow read-only surface (`CommanderRuntimeContext`) instead of treating commander as a general frontend env inspector.
- Commander keeps canonical backend paths in widget state and only applies `~` formatting plus `~/...` path-input expansion in the frontend view layer, so backend semantics stay in the Go runtime while the UI still renders human-friendly paths.
- Commander write operations now also resolve through typed backend adapters: `features/commander/api/client.ts` maps `/api/v1/fs/mkdir`, `/api/v1/fs/copy`, `/api/v1/fs/move`, `/api/v1/fs/delete`, `/api/v1/fs/rename`, and `PUT /api/v1/fs/file`, and the old fake-client transport layer is no longer part of the active tree.
- Commander blocked/non-text file dialogs now keep backend external-open handoff state visible inside the dialog after a successful `/api/v1/fs/open` request, and the same bounded dialog surface now exposes separate file and containing-folder handoff actions instead of collapsing both cases into one ambiguous opener action.
- Commander operations now pass through a widget-local pending confirm/cancel layer before mutating the backend path, so the UI can expose classic operator review flows without moving transport semantics into the pane widgets.
- Commander pane navigation now also keeps independent per-pane history stacks, exposed through active-pane back/forward header controls and `Alt+Left` / `Alt+Right`.
- Commander pending operations now also cover `rename` with an inline input prompt plus overwrite warnings for `copy/move/rename`, and the same-pane `F5` clone path now opens an inline target-name prompt when both panes point at the same directory; the preview/conflict state stays widget-local, but final mutation confirmation runs through the backend path.
- Commander widget runtime state now persists per `widgetId` in `localStorage`, but that persisted shape is intentionally limited to pane/widget runtime fields (`path`, history, cursor/selection, view toggles). Directory rows are no longer written into storage, so reload goes back through the backend list path instead of restoring a frontend-owned filesystem snapshot; legacy `client.directories` payloads are still accepted as a compatibility input on read.
- Commander persistence normalization now uses `zod` schemas in `features/commander/model/persistence.ts`, with per-widget parsing plus compatibility defaults for legacy pane fields, instead of a hand-written field-by-field validator.
- Commander store persistence now also attaches through an instance-local watcher controller in `store-persistence.ts`, so debounce/init state no longer leaks through module-level mutable variables when that persistence path is reused in tests.
- Commander selection semantics now also follow the frontend-only Total Commander contract more closely: `Shift+Arrow`, `Shift+PageUp/PageDown`, `Shift+Home/End`, and `Shift+click` extend selection ranges from a stable pane-local anchor, while `Space` and `Insert` still toggle the focused row through widget-local selection state.
- Commander keyboard handling now also includes type-to-jump within the active pane: printable key presses search the current pane by filename prefix and move the commander cursor without introducing backend search state.
- Commander rename flows now also support widget-local batch templates over the backend path: `Shift+F6` opens a mass-rename prompt, `Ctrl+PgDn` opens the focused entry from the keyboard, template tokens (`[N]`, `[E]`, `[F]`, `[C]`, `[C:n]`) drive rename previews, and duplicate target names are blocked before mutation.
- Commander batch rename now also exposes a richer preview tool surface in the pending bar: scrollable `Current / Next / Status` rows, template presets, summary badges, case modifiers (`[N:l]`, `[N:u]`, `[E:l]`, `[F:u]`), and extended counters like `[C:start:width:step]`, all scoped to the same widget-local preview model before backend mutation.
- Commander transfer conflicts now also stay explicit at the widget boundary: when `copy` or `move` finds target-name collisions inside the same widget, the pending bar switches into `Overwrite`, `Skip`, `Overwrite all`, and `Skip all` actions while the actual overwrite semantics remain backend-owned.
- Commander selection helpers now also follow classic Total Commander flows: `Num +` opens select-by-mask, `Num -` opens unselect-by-mask, `Num *` inverts the active pane selection immediately, and mask input supports `*`, `?`, and `;`-separated patterns.
- Commander panes now also support pane-local quick filtering: `Ctrl+F` opens a pending filter input, `Ctrl+Backspace` clears the active pane filter, filter state persists with the pane, and the same wildcard grammar (`*`, `?`, `;`) is reused for filter matching.
- Commander panes now also support inline path editing against the backend path model: `Ctrl+L` or clicking the active pane path opens an inline header input, `Enter` navigates the pane to the resolved path, and `Escape` cancels without mutating the other pane or introducing a second frontend path contract.
- Commander inline path editing now also exposes a widget-local autocomplete/history dropdown: the active pane path input suggests directories from the current backend-loaded pane listing plus pane history, `ArrowUp` / `ArrowDown` step through suggestions, and `Tab` accepts the highlighted path without leaving the inline edit flow.
- Commander sorting now also lives directly in the pane list headers instead of a detached control: clicking `T`, `Name`, `Size`, or `Modified` in either pane switches the widget-local sort mode for both panes while both panes rebuild from the current backend-loaded directory snapshots.
- Commander sort controls now also cover direction and folder grouping without leaving the widget shell: clicking the currently active header flips `asc/desc`, the active header renders the current direction marker, and a compact `dirs-first` toggle in the commander header keeps folder grouping widget-local over the backend-backed pane state.
- Commander panes now also support a richer quick-search flow: `Ctrl+S` opens a transient search input against the currently visible rows of the active pane, substring matches are previewed live in the pending bar, and `Enter` jumps the cursor to the first match without mutating pane filter state.
- Commander quick search now also supports lightweight hit stepping inside the same pending bar: `ArrowUp` and `ArrowDown` cycle through the current match set, the search summary shows the active hit position, and `Enter` confirms the currently selected hit instead of always choosing the first result.
- Commander files now also support backend `F3/F4` flows: `F3` opens a read-only preview modal backed by `/api/v1/fs/read`, text files render as bounded text and non-text/binary files render as bounded hex preview, while `F4` opens a UTF-8 text editor modal backed by `/api/v1/fs/file` and still blocks non-text/binary edit attempts explicitly. `Ctrl+S` persists the active UTF-8 edit buffer back through the backend before the pane reloads the saved entry metadata.
- Commander file dialogs now also expose a denser editor-style shell without adding a heavy editor dependency: the modal footer tracks live `Ln/Col` cursor position and character count, while dirty edit buffers intercept close attempts with an explicit discard-or-keep-editing prompt instead of silently dropping changes.
- Commander file dialogs now also use a wide workspace-biased layout instead of a small centered card: the overlay keeps roughly `5%` free space on the left/right and `3%` on the top/bottom, and the dialog itself expands to fill that available area.
- Commander keyboard handling now routes through focused pure handlers in `keyboard-handlers.ts`: file-dialog blocking, `Alt+Left/Right` history, ctrl-modifier shortcuts, pending-operation flows, numpad selection shortcuts, shift-range navigation, main navigation, and typeahead matching all have direct unit coverage, while `keyboard.ts` is now just the thin hook-level orchestration entrypoint.
- Commander pane wiring now also goes through `commander-pane-controller.ts`: `CommanderWidget` builds pane-scoped controller objects once, and `CommanderPane` consumes a single controller prop instead of a drilled mix of pane view state, sort state, path-edit state, and pane interaction callbacks.
- `TerminalWidget` renders the terminal-specific body composition for terminal panels and now owns the in-panel terminal chrome composition: live `TerminalStatusHeader`, interrupt/restart action slots, `TerminalToolbar`, and the xterm-backed `TerminalSurface`; the toolbar remains a local surface affordance layer for copy/paste/search/clear/jump actions instead of inventing a second backend contract for viewport-only behavior.
- `TerminalDockviewTabWidget` renders terminal-specific Dockview tab chrome for terminal panels and now uses the same compact action density as the body toolbar instead of the older elevated close-button treatment.
- `TerminalDockviewHeaderActionsWidget` keeps terminal-group `add/close` controls inside the same compact grouped action language as the terminal toolbar, so Dockview header actions and in-panel actions read as one system.
- `TerminalDockviewHeaderActionsWidget` now also splits its host-level wrap by panel type: terminal groups keep the slightly lowered action wrap that lines up with the terminal header chrome, while non-terminal groups reuse the same compact close-control language without inheriting that extra top offset.
- Dockview overflow affordances for terminal groups are also themed as part of that same system in `src/index.css`, so the overflow trigger/dropdown does not fall back to generic Dockview chrome when terminal tabs compress.
- `CommanderDemoLayout` mounts `CommanderWidget` into the isolated `tool` panel demo surface.
- `DialogPopup` provides the stateless shared dialog surface, including the wide settings-dialog variant and an optional body-content slot for host-provided settings widgets.
- `ClearBox` provides a neutral layout wrapper for shell/settings structure when a subtree needs DOM identity without inheriting the default glass-panel framing from `Box`.
- `Notify` provides the stateless shared notification surface.
- `ModalHostWidget` renders body-scoped and widget-scoped modal layers, while settings-specific body content is routed through an explicit modal `contentKey` path instead of hard-coding settings UI into the shared dialog shell.
- `PanelModalActionsWidget` exposes a widget-level demo path for modal opening.
- `SettingsShellWidget` now owns the shell-wide settings navigation inside the existing modal body, keeping `General`, `AI`, `Terminal`, `Remote`, `MCP`, and `Commander` as explicit sections without forking the shared dialog chrome; the `AI` subtree can collapse instead of permanently occupying vertical space, while the shell itself now presents a reference-like navigator/editor framing with a dedicated settings sidebar header and a single bordered content surface for the active section.
- `AiComposerSettingsSection` owns the `AI / Composer` settings slice and now reads/writes the keyboard-submit preference (`Enter` vs `Ctrl/Cmd+Enter`) through the runtime-owned agent settings contract (`shared/api/agent-settings.ts` plus `features/agent/model/use-ai-composer-preferences.ts`) instead of keeping that behavior in browser-local storage.
- `TerminalSettingsSection` now owns the `Settings -> Terminal` slice and reads/writes terminal font size, line height, theme mode, scrollback, plus cursor behavior through the runtime-owned terminal settings contract (`shared/api/terminal-settings.ts` plus `features/terminal/model/use-terminal-preferences.ts`), including a one-shot restore-to-defaults action that still persists through the same contract instead of inventing a reset-specific transport path. The shell therefore keeps live xterm density, palette mode, buffer depth, and cursor behavior in sync with backend state instead of treating those values as frontend-local storage.
- `RuntimeSettingsSection` now owns the live `General` content inside that shell and reads the real desktop runtime contract for `watcher_mode` plus bootstrap context, while still degrading honestly to a read-only browser fallback during the split `make dev` loop where Tauri-only mutation is unavailable.
- `MCPSettingsSection` owns the `Settings -> MCP` slice and reads/writes registered MCP server state through `features/mcp/api/client.ts`, keeping remote registration and lifecycle controls (`start`, `stop`, `restart`, `enable`, `disable`) in the backend-owned MCP contract instead of reintroducing a frontend-owned MCP registry.
- `AgentProviderSettingsWidget` now lives under `AI > Установленные приложения` inside that shell settings surface and supports an embedded rendering mode with flatter container framing by composing `ClearBox` for layout-only wrappers; the active provider setup surface now covers Codex CLI, Claude Code CLI, and one narrow OpenAI-compatible HTTP source kind, while `features/agent/api/provider-client.ts`, `features/agent/model/provider-settings-draft.ts`, and `features/agent/model/use-agent-provider-settings.ts` keep backend transport, draft serialization, and editor state outside the shared modal host.
- `DockviewPanelWidget` renders Dockview panel bodies and owns Dockview-specific DOM resolution such as the surrounding `.dv-groupview`, then passes mount/theme targets down as explicit props instead of making child widgets query Dockview internals themselves.
- `DockviewPanelWidget` now also owns the host-level body inset split between terminal and non-terminal panels: terminal panels keep the larger viewport padding needed by `TerminalWidget`, while non-terminal panels use a tighter top seam so commander-style headers sit closer to the Dockview tab strip without pushing that spacing rule down into each widget.
- `AiPanelWidget` renders the shell-managed AI panel body inside the left shell pane.
- `AiPanelWidget` now passes its own root element down as the widget-local mount target for modal and busy overlays instead of relying on global DOM lookups.
- `AiPanelHeaderWidget` renders the AI shell header strip.
- `AppAiSidebar` now owns one shared `useAgentPanel(...)` controller instance for the visible AI sidebar, and passes that controller into both `AiPanelHeaderWidget` and `AiPanelWidget` so the header's conversation controls and the body transcript/composer stay bound to the same backend conversation identity.
- `AiPanelHeaderWidget` now also owns the shell-visible conversation navigator chrome: active-thread summary trigger, scoped `Open / Archived / All` conversation views, server-backed scope/query filtering, `New` action, inline active-thread rename, and archive/restore/delete UX over the backend conversation list/create/activate/rename/archive/restore/delete contract; the navigator preserves the current scope/query state across close/reopen and row actions so archived-thread management does not collapse back to `recent` after each mutation.
- `AiPanelHeaderWidget` also keeps the active conversation pinned inside that navigator as a separate summary block above scope/search controls, so filtered list operations do not obscure which backend thread is currently live.
- `AiPanelHeaderWidget` also owns keyboard navigation inside that searchable conversation navigator: focus stays on the search field, the highlighted row is projected through `aria-activedescendant`, and `ArrowUp/ArrowDown/Home/End` plus `Enter` operate over the currently rendered filtered thread order instead of moving physical focus through option buttons.
- `AiPromptCardWidget` renders the prompt tiles inside the AI panel.
- `AiComposerWidget` renders the AI toolbar plus textarea composer block and owns both the visible provider/model selectors and the inline request-context dropdown for widget selection; backend provider/workspace discovery plus `widget_ids` request assembly remain in `features/agent/model/use-agent-panel.ts`, not in the widget layer.
- `useAgentPanel(...)` now also treats request-context selection as conversation-owned runtime state: widget-context enablement plus explicit widget ids are loaded from the backend conversation snapshot and persisted back through the conversation transport instead of being ephemeral widget-local state.
- `AiComposerWidget` now also keeps the request-context affordance visible even when the dropdown is closed: the toolbar trigger summarizes the effective context state, and the dropdown exposes `Use current` / `Only current` / `All widgets` / `Use default` quick actions as frontend-owned UX over the same workspace widget contract instead of inventing a second context model.
- `AiComposerWidget` now also surfaces explicit selected widgets directly in the composer body through a compact removable chip strip, so operators can narrow request context without reopening the dropdown; chip removal still feeds the same `selectedContextWidgetIDs` view state owned by `use-agent-panel.ts`.
- `AiComposerWidget` now also surfaces queued file attachment references as removable chips. The queue is shell-local (`shared/model/ai-attachments.ts`) and submit-time transport still goes through the backend conversation attachment contract, not through widget-local file reads.
- `useAgentPanel(...)` now also keeps workspace-widget discovery behind stable refs when the composer context menu opens, so quick actions like `Only current` can persist the current workspace widget even when the operator acts before the dropdown finishes reconciling React state.
- `useAgentPanel(...)` now keeps raw persisted conversation `widget_ids` separate from the filtered effective request selection, so stale workspace references can be surfaced and repaired in the UI without leaking missing widget ids into live request assembly.
- `useAgentPanel(...)` now also eagerly resolves workspace widgets when a conversation already has persisted `widget_ids`, so stale-context repair is visible in the closed composer body instead of only after opening the context dropdown.
- `AiComposerWidget` now groups toolbar chrome into a meta row plus a denser control strip with explicit `Source`, `Model`, and `Context` labels, keeping the selectors readable without extending the provider/runtime contract.
- `AiComposerWidget` now also renders its request-context dropdown with a denser grouped summary block, while `SearchableMultiSelect` provides tighter widget option rows and clearer selection-state chips for that dropdown without changing the underlying context-selection contract.
- `SearchableMultiSelect` now also groups AI request-context widget options by widget kind as a presentation-only refinement over the existing backend-loaded workspace widget list; this does not introduce a second widget-context transport model.
- `AiComposerWidget` now also mirrors the stale-widget repair notice into the closed composer body, so a persisted context mismatch is actionable before the operator reopens the dropdown.
- `AiComposerWidget` also owns the UI-side keyboard semantics for submit vs newline, but the selected mode is sourced from `features/agent/model/use-ai-composer-preferences.ts` so the widget stays a view over explicit shell preference state rather than reaching into storage directly.
- `AiComposerWidget` now projects active stream cancellation as a `Cancel response` action while `useAgentPanel(...)` owns the abort controller, local partial-output finalization, busy-state cleanup, and audit-row failure update for approved flows.
- `AiPanelWidget` now prefers an externally supplied controller when the AI sidebar owns shared conversation state; its internal `useAgentPanel(...)` fallback remains only for isolated/demo usage so header/body do not fork conversation state in the real shell.
- `ChatTextMessageWidget` now keeps assistant message chrome denser without changing message semantics: model/status metadata and the details toggle share one compact action row under the assistant bubble, and expanded details render inside a grouped inset panel with a small header plus per-field sections.
- `ChatTextMessageWidget` renders backend conversation attachment references as compact chips under the message bubble, so sent files remain visible after conversation reload without introducing managed attachment storage.
- `App.tsx` now uses `motion` only at the app shell boundary to animate the shell-managed AI panel width; the AI body itself remains a normal widget.
- `TerminalSurface`, `ModalHostWidget`, and `WidgetBusyOverlayWidget` now receive external mount/theme targets through props, so those lower layers no longer query for modal anchors or Dockview group wrappers on their own.

## DOM Identity

The frontend now uses a shared DOM identity contract from
`src/shared/ui/dom-id.tsx`.

- Every repo-owned frontend element should resolve to a readable DOM `id`.
- The canonical semantic locator is `data-runa-node`.
- The identity format is:
  - `<layout>-<widget>-<component>-<short-uid>` for `id`
  - `<layout>-<widget>-<component>` for `data-runa-node`
- Scope is inherited through `RunaDomScopeProvider`.
- Native primitives generate ids automatically and expose a minimal semantic
  contract by default: `id` plus `data-runa-node`.
- `RunaDomScopeProvider` may opt into verbose metadata with
  `metadata="verbose"` when a subtree also needs `data-runa-layout`,
  `data-runa-widget`, and `data-runa-component`.
- Widget/layout roots may also opt into subtree auto-tagging so raw DOM and
  third-party descendants inside that subtree also receive ids and the same
  configured metadata contract.

Lookup helpers exported from `src/shared/ui/dom-id.tsx`:

- `buildRunaNodeKey`
- `buildRunaNodeSelector`
- `findRunaNode`
- `findRunaNodes`

## Validation

### Commands

- `npm --prefix frontend run lint:active`
- `npm run lint:frontend`
- `npm run format:frontend:check`
- `npm --prefix frontend run test`
- `npm --prefix frontend run build`
- `curl -sf http://127.0.0.1:4193`
- `node --input-type=module -e "<headless Playwright localhost computed-style smoke for tokenized shell surfaces>"`
- `rg -n "React\.(HTMLAttributes|ButtonHTMLAttributes|InputHTMLAttributes|LabelHTMLAttributes|SelectHTMLAttributes|TextareaHTMLAttributes)" frontend/src/shared/ui/primitives`
- `rg -n "from '../primitives'|from '../shared/ui/primitives'|from '../shared/ui/components'" frontend/src/shared/ui/components frontend/src/widgets`
- `rg -n "export \* from './(expandable-textarea|radio-control|radio-group|searchable-multi-select|switcher-control|switcher-group|tabs)'" frontend/src/shared/ui/components/index.ts`
- `node --input-type=module -e "<headless Playwright DOM identity smoke against http://127.0.0.1:5173>"`

### Results

- Primitives are typed with native HTML prop types.
- Primitive coverage now includes `Label`, `Select`, `TextArea`, `Radio`, and `Checkbox` in addition to the original `Box`, `Button`, `Input`, and `Text`.
- Shared accessibility contracts now also cover browser zoom, labelled composite controls, and explicit focus handoff: `main.tsx` no longer suppresses zoom gestures and now mounts through a guarded `#root` lookup under `StrictMode`, `InputField` binds labels through `htmlFor/id`, shell window actions stay plain buttons outside the workspace tablist, `SearchableMultiSelect` and `RadioGroup` expose named ARIA containers, `TerminalToolbar` focuses its search field on open without raw `autoFocus`, and `index.css` provides `prefers-reduced-motion` plus `prefers-contrast: more` fallbacks.
- The shared token layer now also owns responsive shell/layout chrome sizing: shell frame padding, topbar offset, workspace tab minimum width, modal width, Dockview header height, and right rail/header dimensions all adapt through tablet/mobile token overrides instead of widget-local breakpoint constants.
- The shell environment layer now also exposes media-aware defaults: `prefers-color-scheme: light` rebinds the shared surface/text tokens for light environments, and `@media print` flattens shell chrome so Dockview surfaces print without glow, blur, or resize affordances.
- Primitive coverage now also includes `Badge`, `ScrollArea`, `Separator`, and `Surface` for dense built-in tool surfaces.
- Primitives contain native elements only and use CSS variable styles.
- The new form-control components added in this slice import primitives only.
- Widgets import shared components/primitives and may consume local style modules without reaching into app orchestration.
- `input-field.tsx` contains no raw HTML.
- `demo-widget.tsx` composes `InputField`, `Box`, `Text`, and `Button`.
- Barrel imports are active in `components` and `widgets`.
- `Button` supports `onClick` through `React.ButtonHTMLAttributes<HTMLButtonElement>`.
- `Box` now forwards refs, which allows `ExpandableTextArea` to measure and stretch against its parent or a selected host element.
- `TerminalViewport` keeps the terminal mount point as a typed primitive instead of letting widgets mount xterm into raw HTML.
- `SearchableMultiSelect` provides a query-filtered multiselect surface on top of primitives only.
- `Tabs` supports both horizontal and vertical layouts through a single shared component.
- `Tabs` now also has direct component coverage for selection switching and vertical orientation semantics, and its style surface lives in `tabs.styles.ts` instead of inline component constants.
- `RadioControl` and `RadioGroup` cover single and grouped radio selection.
- `SwitcherControl` and `SwitcherGroup` cover single and grouped boolean toggles.
- `ExpandableTextArea` keeps inline behavior by default and can expand to the parent bounds or to a selector target without introducing modal semantics.
- `TerminalStatusHeader` and `TerminalSurface` add the terminal renderer slice in the component layer, with `TerminalSurface` owning the frontend-only xterm mock session.
- `TerminalStatusHeader` now also keeps its title/meta layout chrome in `terminal-status-header.styles.ts` instead of carrying that style surface inline.
- `TerminalToolbar` adds the terminal-local addon controls layer for search, clipboard actions, and renderer status.
- `CommanderWidget` stays in the widget layer and still renders from a widget-scoped commander store, but the active read-only path now goes through typed HTTP adapters instead of a widget-local fake filesystem for directory/file reads.
- Commander boots both panes to `repo_root` by default in the backend path. `home_dir` is still carried through runtime bootstrap for display/path parsing, but it is not used as the default pane target because current policy may legitimately deny reads outside the workspace root.
- Commander now keeps a narrow Total Commander-style backend write slice as well: `F7` opens a pending input for the active pane, confirmation resolves through typed `POST /api/v1/fs/mkdir`, the pane reload remains async, and focus moves to the newly created directory when the backend confirms the mutation.
- Commander backend write support now also covers `F2/F5/F6/F8`: rename, copy, move, and delete all stay async in the hook-level gateway, resolve through typed `/api/v1/fs/*` endpoints, and reload only the affected panes instead of mutating widget state locally.
- Commander backend write support is still intentionally partial in one specific area: same-pane duplicate-name copy flows are not claimed yet, so the current backend slice is the opposite-pane Total Commander path rather than a full duplicate/clone workflow.
- Commander pending bars remain widget-local confirmation chrome, but the active backend path no longer hides async failures: pane-local `loading` and `error` state now render directly in the pane shell instead of silently falling back to stale rows.
- Commander widget state is now persisted per `widgetId`, which keeps pane paths, history, and view toggles stable across hard reloads without persisting directory contents themselves. Pane rows are rehydrated from the backend after restore, so the widget avoids carrying a second frontend-owned filesystem snapshot across reload boundaries.
- Commander pane history is widget-local and pane-local: each pane keeps its own back/forward stack, and switching panes preserves the other pane's navigation state.
- Commander selection range semantics are now also widget-local and pane-local: each pane keeps its own selection anchor so `Shift`-extended keyboard movement and `Shift+click` ranges can be rebuilt without leaking state into the opposite pane or another commander widget.
- Commander row focus chrome now uses an inset highlight ring instead of row borders, so keyboard navigation keeps the focused entry readable without leaving pale border artifacts on adjacent rows.
- Commander batch rename now stays frontend-only but behaves like a real tool flow: `Shift+F6` opens mass rename, `Ctrl+PgDn` opens the focused entry, template tokens (`[N]`, `[E]`, `[F]`, `[C]`, `[C:n]`) generate live previews, and duplicate target names block confirmation before the fake client mutates the pane.
- Commander batch rename now also renders a richer operator-facing preview: preset templates, summary badges, a scrollable preview table with explicit status columns, case transforms, and extended counters such as `[C:10:3]` and `[C:10:3:2]`.
- Commander transfer conflict handling now also stays explicit at the widget model layer: `copy/move` pending ops with name collisions no longer have a silent generic confirm path, and the shared pending bar exposes dedicated `Overwrite`, `Skip`, `Overwrite all`, and `Skip all` actions instead.
- Commander selection helpers now also stay widget-local and pane-local: `Num +` and `Num -` reuse the pending bar with mask previews/counts, `Num *` inverts the active pane selection immediately, and the model applies those mask matches without introducing backend search or cross-widget state.
- Commander quick filter now also stays widget-local and pane-local: `Ctrl+F` opens a pending filter flow, `Ctrl+Backspace` clears the active pane filter, pane headers render a `FILTER <mask>` badge while active, and filtering reuses the same wildcard grammar as mask-selection flows.
- Commander pending-input focus/select behavior now only selects once when a pending input operation opens, so follow-up typing in rename, mkdir, and filter flows no longer reselects the already-entered text after each character.
- Commander inline path edit now stays widget-local and pane-local as well: `Ctrl+L` or a click on the active pane path swaps the header label for an inline input, and confirming that input reloads only the targeted pane against the async commander API while preserving the other pane and widget-local persistence.
- Commander path suggestions stay in that same widget-local model too: the dropdown is derived from pane-local history plus known canonical paths already seen by the widget, while display labels still format through the runtime `home_dir` context instead of introducing a separate backend path-complete API.
- Commander sort state stays widget-local as well: the list-header buttons are only a UI affordance over the existing widget sort model, so either pane can switch the active order while both panes rebuild against the same fake-client sort contract and persistence keeps restoring that mode on reload.
- Commander sort direction and `dirs-first` grouping stay in that same persisted widget-local model: the store now carries both flags alongside `sortMode`, list headers only mutate those explicit fields, and fake-client directory reads rebuild both panes from that single sort contract.
- Commander quick search now also stays widget-local and pane-local: `Ctrl+S` opens a transient search flow over the current visible rows, uses case-insensitive substring matching instead of mutating the pane filter, previews the hit list in the same pending bar, and on confirmation moves the pane cursor to the first match so the next `Enter` opens it.
- Commander quick-search hit stepping also stays in that same widget-local pending model: the store tracks the currently selected search hit, keyboard `ArrowUp/ArrowDown` only rotate inside the visible match set for the active pane, and confirming the prompt resolves against that tracked hit rather than re-running a separate navigation path.
- Commander file viewing now stays widget-local in presentation but reads through the backend adapter: `F3` and double-click open a read-only modal backed by `/api/v1/fs/read`, while `F4` edit/save remains intentionally unwired in this slice.
- Commander file-dialog UX now also stays local to the widget shell: cursor metrics are derived from the active textarea selection rather than backend metadata, and dirty-close confirmation is resolved entirely in the modal layer before the widget store is asked to close the dialog.
- Commander file-dialog geometry now also stays explicit in the widget layer rather than a generic modal preset: the overlay owns the outer percentage insets and the inner surface stretches to the full remaining width/height.
- Commander store event wiring now also has a dedicated widget-scoped update helper in `src/features/commander/model/store-widget-state.ts`, so the main Effector store can reuse one `lookup -> guard -> merge-back` path for the simpler widget-local handlers instead of repeating that boilerplate inline.
- The pending-input reducer path now also lives in `src/features/commander/model/store-operations.ts`, so `setCommanderPendingOperationInput` no longer keeps the select/filter/search/rename branch tree inline inside the main Effector store file.
- The pending-confirmation reducer path now also lives in `src/features/commander/model/store-operations.ts`, so `confirmCommanderPendingOperation` no longer keeps the transfer/delete/mkdir/rename/search confirmation tree inline inside `store.ts`.
- The pending-conflict resolution path now also lives in `src/features/commander/model/store-operations.ts`, so `resolveCommanderPendingConflict` no longer keeps the overwrite/skip branch tree inline inside `store.ts`.
- The remaining pane-scoped cursor/navigation handlers and pending request/search-step flows now also route through the same widget-state helper layer, so `store.ts` no longer keeps direct `widgets[payload.widgetId]` lookup boilerplate in its regular event reducers.
- Commander pending-operation state now uses a discriminated union in `src/features/commander/model/types.ts` instead of one wide optional-field object, so transfer-only, rename-only, mkdir-only, and search/mask-only fields are enforced by `kind` rather than carried as invalid optional mixes across the widget model.
- Active app-shell and commander public entrypoints now also carry terse JSDoc contracts, so exported hooks, components, and coordinator utilities document their ownership boundaries without forcing readers to reconstruct intent from implementation details alone.
- `CommanderDemoLayout` keeps the demo mount in a layout layer instead of wiring the commander surface directly into app orchestration.
- `WidgetBusyOverlayWidget` stays in the widget layer and uses `@tsparticles/react` directly for the busy-field rendering instead of pushing imperative particle code into shared components, while the centered busy marker is now a panel-local composition of `Box` and `Avatar` instead of inline raw SVG/`foreignObject` markup.
- `TerminalWidget` stays in the widget layer and now owns the terminal body composition only: status header, restart action, toolbar search/clipboard affordances, and renderer surface wiring against the existing terminal session contract.
- `TerminalDockviewTabWidget` keeps terminal-specific Dockview tab composition in the widget layer, reusing `TerminalStatusHeader` in a compact mode instead of duplicating terminal chrome inside the body.
- Terminal Dockview tabs now use a shortened compact `cwd` label as the primary visible title, keep the full `cwd` in the title tooltip, and limit active-tab meta to connection/session pills while the local `+` action for adding another terminal tab stays at the group level.
- The current shell example routes its visible shell blocks through widgets and primitives instead of raw HTML in `App.tsx`.
- `App.tsx` remains responsible for shell composition, Dockview API orchestration, and Effector state wiring.
- The app-local Dockview workspace schema normalization now lives in `src/app/dockview-workspace.persistence.ts`, while `src/app/dockview-workspace.client.ts` provides the pluggable snapshot client contract and the current `localStorage` adapter.
- The default Dockview panel seed now also lives in `src/app/dockview-workspace.bootstrap.ts`, so the initial shell topology is expressed once outside the React lifecycle hook.
- Dockview layout sync and persistence subscription/runtime bookkeeping now also live in `src/app/dockview-workspace.runtime.ts`, including the debounced persistence controller used by the main hook.
- The Dockview ready-path decision tree now also lives in `src/app/dockview-workspace.ready.ts`, so the hook no longer mixes `onReady` lifecycle with the branching restore/bootstrap policy inline.
- Dockview snapshot capture/apply/tab-update helpers now also live in `src/app/dockview-workspace.snapshots.ts`, so the hook does not repeat raw `toJSON()/fromJSON()/clear()` and snapshot-tab patch logic inline.
- Workspace switching and workspace-add orchestration now also live in `src/app/dockview-workspace.actions.ts`, so the hook no longer owns the `persist -> activate -> restore` flow inline.
- The remaining resize/persist/cleanup effects now also live in `src/app/use-dockview-workspace-effects.ts`, leaving `use-dockview-workspace.ts` as the orchestration entrypoint instead of mixing effect wiring with state transitions.
- Modal state now lives in a dedicated `shared/model/modal.ts` store instead of being hidden inside widget-local React state.
- Tokens now cover dark canvas, glass surfaces, accent hues, spacing, radii, shell sizes, blur, and shadow.
- Shared primitives consume only semantic tokens instead of hardcoded `#111/#fff/#333` values.
- Shared components now include stateless `Notify` plus a reusable `DialogPopup` surface built primarily from shared primitives.
- `DialogPopup` now also accepts children for host-owned modal body content, but the component still owns only the generic shell/header/footer contract rather than any domain-specific settings logic.
- Shared components now also include `IconButton`, a generic square icon-only control composed from the shared `Button` primitive.
- Shared components may keep local style modules the same way widgets do when their inline style surface starts to grow; `Tabs` is the current baseline example of that pattern in the component layer.
- The same component-layer pattern now also covers `TerminalToolbar`, so its toolbar/search/badge chrome lives in `terminal-toolbar.styles.ts` instead of staying inlined in the render body.
- Shared components now also include the terminal renderer slice: a status header, toolbar, and xterm-based surface wrapped by `TerminalViewport`.
- The new form-control components added in this slice compose shared primitives only. The existing `DialogPopup` close glyph remains the current icon exception from the earlier shell slice.
- Live localhost smoke confirmed tokenized shell values in the DOM: `body/root` background `rgb(6, 17, 15)`, `AI` button backdrop `blur(10px)`, right rail width `40px`, and right rail glass background `rgba(11, 24, 22, 0.72)`.
- The shell-managed AI panel animation now uses `motion` at the app layer instead of CSS width transitions or manual `requestAnimationFrame`, keeping the animation concern at the shell boundary without pushing animation logic down into widgets or primitives.
- The shared DOM identity layer now provides readable ids plus semantic
  selectors through `data-runa-node`, backed by `RunaDomScopeProvider`,
  primitive-level auto identity, and subtree auto-tagging at widget/layout
  roots, while the extra `data-runa-layout/widget/component` metadata stays
  opt-in through `metadata="verbose"` instead of being emitted on every
  repo-owned element.
- Terminal panels now pass `params` as the local source of truth for title and session metadata, which allows the same terminal config to be reused by both the body widget and the custom Dockview tab widget.
- A fresh headless DOM smoke on `http://127.0.0.1:5173` confirmed `509`
  elements resolving both `id` and `data-runa-node`, including semantic roots
  like `shell-tool-commander-root`, `shell-terminal-header-terminal-widget-root`,
  `shell-workspace-shell-topbar-toggle-ai-panel`, and an xterm-managed
  descendant resolving as `shell-global-terminal-input`.
