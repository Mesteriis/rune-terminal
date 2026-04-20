# UI Architecture

## Layer Rules

### Tokens

- CSS variables only
- No React code
- Shared visual values live in `src/shared/ui/tokens/index.css`

Current token families:

- dark canvas and glass surface colors
- accent colors for dark emerald and cold-tea tones
- text and border tiers
- spacing, gap, padding, and margin scales
- radii, control sizes, and shell sizes
- glass blur and shadow values

### Styles

- Style modules keep presentational constants separate from rendering logic
- Style modules use CSS variables and plain style objects only
- Style modules must not import app state, backend contracts, or widget runtime logic

Current isolated style modules:

- `CommanderWidget` local dense-surface styles in `src/widgets/commander-widget.styles.ts`

### Primitives

- Wrap native HTML elements
- Use tokens only
- Must be typed with native HTML props
- No business logic

Current primitives:

- `Box`
- `Badge`
- `Button`
- `Checkbox`
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

### Widgets

- Compose primitives and components
- Represent UI blocks
- Stay above shared UI layers

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

## Public API

- `src/shared/ui/primitives/index.ts`
- `src/shared/ui/components/index.ts`
- `src/widgets/index.ts`
- `src/layouts/index.ts`

## Current Shell Mapping

The active frontend shell example now consumes the UI layers instead of rendering
its visible shell blocks as raw HTML inside `App.tsx`.

- `App.tsx` owns Dockview wiring and UI state only.
- `ShellTopbarWidget` renders the top header block.
- `RightActionRailWidget` renders the full-height right rail.
- `WidgetBusyOverlayWidget` renders a widget-body busy state overlay with a centered AI marker and a `tsParticles` node-edge field.
- `CommanderWidget` renders the frontend-only Total Commander-style dual-pane surface from a per-widget commander model backed by a local fake filesystem client.
- The fake commander client now supports widget-local `copy/move/delete/mkdir` mutations between the left and right panes of the same widget instance, without backend calls or cross-widget filesystem sharing.
- Commander operations now pass through a widget-local pending confirm/cancel layer before mutating the fake filesystem, so the UI can expose classic operator review flows without backend approvals yet.
- Commander pane navigation now also keeps independent per-pane history stacks, exposed through active-pane back/forward header controls and `Alt+Left` / `Alt+Right`.
- Commander pending operations now also cover `rename` with an inline input prompt plus overwrite warnings for `copy/move/rename`, but they still stay entirely inside the local fake client and a single widget instance.
- Commander runtime state and fake filesystem state now persist per `widgetId` in `localStorage`, so reload restores pane paths, history stacks, cursor/selection, view toggles, and fake-client mutations for each commander widget without introducing backend state.
- Commander selection semantics now also follow the frontend-only Total Commander contract more closely: `Shift+Arrow`, `Shift+PageUp/PageDown`, `Shift+Home/End`, and `Shift+click` extend selection ranges from a stable pane-local anchor, while `Space` and `Insert` still toggle the focused row with the existing fake-client cursor flow.
- Commander keyboard handling now also includes type-to-jump within the active pane: printable key presses search the current pane by filename prefix and move the commander cursor without introducing backend search state.
- Commander rename flows now also support frontend-only batch templates on the fake client: `Shift+F6` opens a mass-rename prompt, `Ctrl+PgDn` opens the focused entry from the keyboard, template tokens (`[N]`, `[E]`, `[F]`, `[C]`, `[C:n]`) drive rename previews, and duplicate target names are blocked before mutation.
- Commander batch rename now also exposes a richer preview tool surface in the pending bar: scrollable `Current / Next / Status` rows, template presets, summary badges, case modifiers (`[N:l]`, `[N:u]`, `[E:l]`, `[F:u]`), and extended counters like `[C:start:width:step]`, all still scoped to the same widget-local fake client.
- Commander transfer conflicts now also stay frontend-only but explicit: when `copy` or `move` finds target-name collisions inside the same widget, the pending bar switches into `Overwrite`, `Skip`, `Overwrite all`, and `Skip all` actions instead of silently applying overwrite semantics.
- Commander selection helpers now also follow classic Total Commander flows on the fake client: `Num +` opens select-by-mask, `Num -` opens unselect-by-mask, `Num *` inverts the active pane selection immediately, and mask input supports `*`, `?`, and `;`-separated patterns.
- Commander panes now also support pane-local quick filtering on the fake client: `Ctrl+F` opens a pending filter input, `Ctrl+Backspace` clears the active pane filter, filter state persists with the pane, and the same wildcard grammar (`*`, `?`, `;`) is reused for filter matching.
- Commander panes now also support inline path editing on the fake client: `Ctrl+L` or clicking the active pane path opens an inline header input, `Enter` navigates the pane to the resolved path, and `Escape` cancels without mutating the other pane or introducing backend path state.
- Commander inline path editing now also exposes a widget-local autocomplete/history dropdown on the fake client: the active pane path input suggests known directories from that widget's fake filesystem plus pane history, `ArrowUp` / `ArrowDown` step through suggestions, and `Tab` accepts the highlighted path without leaving the inline edit flow.
- Commander sorting now also lives directly in the pane list headers instead of a detached control: clicking `T`, `Name`, `Size`, or `Modified` in either pane switches the widget-local sort mode for both panes, and the fake client now supports explicit `size` ordering in addition to `name`, `ext`, and `modified`.
- Commander panes now also support a richer quick-search flow on the fake client: `Ctrl+S` opens a transient search input against the currently visible rows of the active pane, substring matches are previewed live in the pending bar, and `Enter` jumps the cursor to the first match without mutating pane filter state.
- Commander quick search now also supports lightweight hit stepping inside the same pending bar: `ArrowUp` and `ArrowDown` cycle through the current match set, the search summary shows the active hit position, and `Enter` confirms the currently selected hit instead of always choosing the first result.
- Commander files now also support frontend-only `F3/F4` flows on the fake client: `F3` opens a read-only file viewer modal, `F4` opens an editable text modal, `Ctrl+S` persists edits back into the widget-local fake filesystem, and the saved file contents then participate in the same commander `localStorage` persistence model as the rest of the widget state.
- Commander file dialogs now also expose a denser editor-style shell without adding a heavy editor dependency: the modal footer tracks live `Ln/Col` cursor position and character count, while dirty edit buffers intercept close attempts with an explicit discard-or-keep-editing prompt instead of silently dropping changes.
- Commander file dialogs now also use a wide workspace-biased layout instead of a small centered card: the overlay keeps roughly `5%` free space on the left/right and `3%` on the top/bottom, and the dialog itself expands to fill that available area.
- `TerminalWidget` renders the terminal-specific body composition for terminal panels.
- `TerminalDockviewTabWidget` renders terminal-specific Dockview tab chrome for terminal panels.
- `CommanderDemoLayout` mounts `CommanderWidget` into the isolated `tool` panel demo surface.
- `DialogPopup` provides the stateless shared dialog surface, including the wide settings-dialog variant.
- `Notify` provides the stateless shared notification surface.
- `ModalHostWidget` renders body-scoped and widget-scoped modal layers.
- `PanelModalActionsWidget` exposes a widget-level demo path for modal opening.
- `DockviewPanelWidget` renders Dockview panel bodies.
- `AiPanelWidget` renders the shell-managed AI panel body inside the left shell pane.
- `AiPanelHeaderWidget` renders the AI shell header strip.
- `AiPromptCardWidget` renders the prompt tiles inside the AI panel.
- `AiComposerWidget` renders the AI toolbar plus textarea composer block.
- `App.tsx` now uses `motion` only at the app shell boundary to animate the shell-managed AI panel width; the AI body itself remains a normal widget.

## DOM Identity

The frontend now uses a shared DOM identity contract from
`src/shared/ui/dom-id.tsx`.

- Every repo-owned frontend element should resolve to a readable DOM `id`.
- The canonical semantic locator is `data-runa-node`.
- The identity format is:
  - `<layout>-<widget>-<component>-<short-uid>` for `id`
  - `<layout>-<widget>-<component>` for `data-runa-node`
- Scope is inherited through `RunaDomScopeProvider`.
- Native primitives generate ids and semantic attrs automatically.
- Widget/layout roots may also opt into subtree auto-tagging so raw DOM and
  third-party descendants inside that subtree also receive ids and
  `data-runa-*` attrs.

Lookup helpers exported from `src/shared/ui/dom-id.tsx`:

- `buildRunaNodeKey`
- `buildRunaNodeSelector`
- `findRunaNode`
- `findRunaNodes`

## Validation

### Commands

- `npm --prefix frontend run lint:active`
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
- `RadioControl` and `RadioGroup` cover single and grouped radio selection.
- `SwitcherControl` and `SwitcherGroup` cover single and grouped boolean toggles.
- `ExpandableTextArea` keeps inline behavior by default and can expand to the parent bounds or to a selector target without introducing modal semantics.
- `TerminalStatusHeader` and `TerminalSurface` add the terminal renderer slice in the component layer, with `TerminalSurface` owning the frontend-only xterm mock session.
- `TerminalToolbar` adds the terminal-local addon controls layer for search, clipboard actions, and renderer status.
- `CommanderWidget` stays in the widget layer, renders from a widget-scoped commander store plus a fake filesystem client, and still does not introduce backend calls or real filesystem behavior.
- Commander write operations remain intentionally local to one widget instance: source and target panes can mutate against the same fake client, but different commander widgets do not share mutations or copy paths.
- Commander write operations now also expose a frontend-only pending confirmation contract: `F5/F6/F7/F8` open a pending bar first, `Enter` confirms, and `Escape` cancels without mutating the fake client.
- Commander widget state is now persisted per `widgetId`, which keeps pane paths, history, view toggles, cursor/selection, and local fake-client mutations stable across hard reloads while still avoiding cross-widget state sharing.
- Commander pane history is widget-local and pane-local: each pane keeps its own back/forward stack, and switching panes preserves the other pane's navigation state.
- Commander selection range semantics are now also widget-local and pane-local: each pane keeps its own selection anchor so `Shift`-extended keyboard movement and `Shift+click` ranges can be rebuilt without leaking state into the opposite pane or another commander widget.
- Commander row focus chrome now uses an inset highlight ring instead of row borders, so keyboard navigation keeps the focused entry readable without leaving pale border artifacts on adjacent rows.
- Commander batch rename now stays frontend-only but behaves like a real tool flow: `Shift+F6` opens mass rename, `Ctrl+PgDn` opens the focused entry, template tokens (`[N]`, `[E]`, `[F]`, `[C]`, `[C:n]`) generate live previews, and duplicate target names block confirmation before the fake client mutates the pane.
- Commander batch rename now also renders a richer operator-facing preview: preset templates, summary badges, a scrollable preview table with explicit status columns, case transforms, and extended counters such as `[C:10:3]` and `[C:10:3:2]`.
- Commander transfer conflict handling now also stays explicit at the widget model layer: `copy/move` pending ops with name collisions no longer have a silent generic confirm path, and the shared pending bar exposes dedicated `Overwrite`, `Skip`, `Overwrite all`, and `Skip all` actions instead.
- Commander selection helpers now also stay widget-local and pane-local: `Num +` and `Num -` reuse the pending bar with mask previews/counts, `Num *` inverts the active pane selection immediately, and the model applies those mask matches without introducing backend search or cross-widget state.
- Commander quick filter now also stays widget-local and pane-local: `Ctrl+F` opens a pending filter flow, `Ctrl+Backspace` clears the active pane filter, pane headers render a `FILTER <mask>` badge while active, and filtering reuses the same wildcard grammar as mask-selection flows.
- Commander pending-input focus/select behavior now only selects once when a pending input operation opens, so follow-up typing in rename, mkdir, and filter flows no longer reselects the already-entered text after each character.
- Commander inline path edit now stays widget-local and pane-local as well: `Ctrl+L` or a click on the active pane path swaps the header label for an inline input, and confirming that input rebuilds only the targeted pane against the fake client while preserving the other pane and widget-local persistence.
- Commander path suggestions stay in that same widget-local model too: the dropdown is derived from the widget's fake-client directory graph plus pane-local history stacks, so multiple commander widgets do not leak path suggestions into each other and no backend path-complete API is introduced.
- Commander sort state stays widget-local as well: the list-header buttons are only a UI affordance over the existing widget sort model, so either pane can switch the active order while both panes rebuild against the same fake-client sort contract and persistence keeps restoring that mode on reload.
- Commander quick search now also stays widget-local and pane-local: `Ctrl+S` opens a transient search flow over the current visible rows, uses case-insensitive substring matching instead of mutating the pane filter, previews the hit list in the same pending bar, and on confirmation moves the pane cursor to the first match so the next `Enter` opens it.
- Commander quick-search hit stepping also stays in that same widget-local pending model: the store tracks the currently selected search hit, keyboard `ArrowUp/ArrowDown` only rotate inside the visible match set for the active pane, and confirming the prompt resolves against that tracked hit rather than re-running a separate navigation path.
- Commander file viewing and editing now also stay widget-local and fake-client-backed: `F3` opens a read-only modal for the focused file, `F4` opens the same surface in editable mode, saves write back into the fake client rather than any backend adapter, and the resulting file content is restored by the existing commander persistence layer on reload.
- Commander file-dialog UX now also stays local to the widget shell: cursor metrics are derived from the active textarea selection rather than backend metadata, and dirty-close confirmation is resolved entirely in the modal layer before the widget store is asked to close the dialog.
- Commander file-dialog geometry now also stays explicit in the widget layer rather than a generic modal preset: the overlay owns the outer percentage insets and the inner surface stretches to the full remaining width/height.
- `CommanderDemoLayout` keeps the demo mount in a layout layer instead of wiring the commander surface directly into app orchestration.
- `WidgetBusyOverlayWidget` stays in the widget layer and uses `@tsparticles/react` directly for the busy-field rendering instead of pushing imperative particle code into shared components.
- `TerminalWidget` stays in the widget layer and now owns the terminal body only: toolbar, panel actions, and renderer surface.
- `TerminalDockviewTabWidget` keeps terminal-specific Dockview tab composition in the widget layer, reusing `TerminalStatusHeader` in a compact mode instead of duplicating terminal chrome inside the body.
- Terminal Dockview tabs now use `cwd` as the primary visible label, while only the active terminal tab exposes connection/session/shell pills plus the local `+` action for adding another terminal tab into the same group.
- The current shell example routes its visible shell blocks through widgets and primitives instead of raw HTML in `App.tsx`.
- `App.tsx` remains responsible for Dockview API orchestration and Effector state wiring.
- Modal state now lives in a dedicated `shared/model/modal.ts` store instead of being hidden inside widget-local React state.
- Tokens now cover dark canvas, glass surfaces, accent hues, spacing, radii, shell sizes, blur, and shadow.
- Shared primitives consume only semantic tokens instead of hardcoded `#111/#fff/#333` values.
- Shared components now include stateless `Notify` plus a reusable `DialogPopup` surface built primarily from shared primitives.
- Shared components now also include `IconButton`, a generic square icon-only control composed from the shared `Button` primitive.
- Shared components now also include the terminal renderer slice: a status header, toolbar, and xterm-based surface wrapped by `TerminalViewport`.
- The new form-control components added in this slice compose shared primitives only. The existing `DialogPopup` close glyph remains the current icon exception from the earlier shell slice.
- Live localhost smoke confirmed tokenized shell values in the DOM: `body/root` background `rgb(6, 17, 15)`, `AI` button backdrop `blur(10px)`, right rail width `40px`, and right rail glass background `rgba(11, 24, 22, 0.72)`.
- The shell-managed AI panel animation now uses `motion` at the app layer instead of CSS width transitions or manual `requestAnimationFrame`, keeping the animation concern at the shell boundary without pushing animation logic down into widgets or primitives.
- The shared DOM identity layer now provides readable ids plus semantic
  selectors through `data-runa-node`, backed by `RunaDomScopeProvider`,
  primitive-level auto identity, and subtree auto-tagging at widget/layout
  roots.
- Terminal panels now pass `params` as the local source of truth for title and session metadata, which allows the same terminal config to be reused by both the body widget and the custom Dockview tab widget.
- A fresh headless DOM smoke on `http://127.0.0.1:5173` confirmed `509`
  elements resolving both `id` and `data-runa-node`, including semantic roots
  like `shell-tool-commander-root`, `shell-terminal-header-terminal-widget-root`,
  `shell-workspace-shell-topbar-toggle-ai-panel`, and an xterm-managed
  descendant resolving as `shell-global-terminal-input`.
