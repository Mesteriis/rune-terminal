# Panels Parity Reference

Date: `2026-04-17`
Phase: `1.0.0-rc1` hardening

This document uses the Tide sources in the repository root as the primary reference for panel-domain parity work. Where the active RunaTerminal shell needs a closest-compatible adaptation instead of a literal Tide import, that adaptation is called out explicitly.

## Tide source files inspected

AI panel surface:
- `tideterm/frontend/app/aipanel/aipanel.tsx`
- `tideterm/frontend/app/aipanel/aipanelheader.tsx`
- `tideterm/frontend/app/aipanel/aipanelmessages.tsx`
- `tideterm/frontend/app/aipanel/aipanelinput.tsx`
- `tideterm/frontend/app/aipanel/aimode.tsx`
- `tideterm/frontend/app/aipanel/waveai-model.tsx`
- `tideterm/frontend/app/aipanel/airatelimitstrip.tsx`
- `tideterm/frontend/app/store/keymodel.ts`
- `tideterm/frontend/app/workspace/workspace.tsx`

Settings / utility surfaces:
- `tideterm/frontend/app/workspace/widgets.tsx`
- `tideterm/frontend/app/view/waveconfig/waveconfig-model.ts`
- `tideterm/frontend/app/view/waveconfig/waveconfig.tsx`
- `tideterm/frontend/app/view/waveconfig/settingscontent.tsx`
- `tideterm/frontend/app/view/waveconfig/secretscontent.tsx`
- `tideterm/frontend/app/view/helpview/helpview.tsx`

## Which files inform which target feature

### AI panel baseline surface

- `aipanel.tsx`
  - overall panel layout
  - left-panel structure
  - welcome state
  - message list vs welcome swap
  - dropped-file overlay
  - input placement
- `aipanelheader.tsx`
  - header density
  - widget-context toggle
  - overflow menu anchor
- `aipanelmessages.tsx`
  - mode strip placement above transcript
  - bottom-follow behavior for transcript
- `aipanelinput.tsx`
  - multiline composer behavior
  - explicit submit on `Enter`
  - file attach button
  - stop/send affordance placement
- `aimode.tsx`
  - compact mode dropdown behavior
  - explicit mode switching surface
- `waveai-model.tsx`
  - panel visibility/focus wiring
  - widget-context state
- `store/keymodel.ts`
  - keyboard focus/toggle expectations around the AI panel
- `workspace.tsx`
  - panel is left-side content, not a detached modal

### Settings utility surfaces

- `workspace/widgets.tsx`
  - settings/help entry point is a right-rail flyout attached to the dock button
  - Tide flyout is utility-level secondary UI, not a primary page
- `view/waveconfig/waveconfig-model.ts`
  - Tide settings breadth comes from `waveconfig` views opened as blocks
  - settings and secrets are distinct surfaces
- `view/waveconfig/waveconfig.tsx`
  - settings surfaces are structured with a sidebar and explicit selected view
- `view/waveconfig/settingscontent.tsx`
  - settings overview content is explicit form UI, not placeholder text
- `view/waveconfig/secretscontent.tsx`
  - secrets surface is a real management UI with list/detail/add states
- `view/helpview/helpview.tsx`
  - help is a dedicated surface, not a tooltip or stub

## Extracted Tide behavior

### AI panel structure

- The AI panel is a left-side shell panel that stretches to full panel height inside the workspace split.
- The header is dense and minimal:
  - title `TideTerm AI`
  - widget-context toggle in the header
  - overflow menu button on the right
- The body has a strict top-to-bottom order:
  - optional rate-limit strip
  - welcome state or transcript
  - error banner
  - dropped-file pills
  - input composer
- The transcript area always keeps a compact mode control strip at the top.
- The panel uses explicit focus management:
  - click background focuses the composer
  - keyboard shortcuts can reopen/focus the panel
  - panel visibility is tracked separately from transcript state

### AI panel controls

- Widget context is an explicit operator toggle, not implicit hidden behavior.
- AI mode is changed from a compact dropdown strip above the transcript or welcome state.
- The overflow menu exposes explicit actions such as new chat, configure modes, and hide panel.

### AI panel message flow

- Empty chat shows a welcome state, not an empty transcript shell.
- Once messages exist, the panel switches to a scrollable transcript view.
- Transcript scroll follows new content and also scrolls to bottom when the panel reopens.
- No automatic execution is implied by message rendering; sending remains explicit from the composer.

### AI panel input behavior

- Input is a multiline textarea.
- `Enter` submits.
- `Shift+Enter` keeps multiline editing.
- File attachment is explicit through the paperclip button.
- Send and stop buttons occupy the trailing input controls.
- Drag and drop overlays are explicit and only appear for supported file drops.

### Settings utility / help behavior

- Tide exposes `Settings & Help` from the right utility rail through a compact flyout.
- That flyout is a launcher/entry surface, not the full settings universe itself.
- The flyout items open dedicated surfaces:
  - `Settings`
  - `Tips`
  - `Secrets`
  - `Help`
- `Settings` and `Secrets` are real views backed by `waveconfig`.
- `Help` is a dedicated help view, not placeholder copy.
- Settings content is explicit form UI.
- Secrets content is explicit list/detail/add UI.

## Behaviors required for parity in this batch

### AI panel

- Preserve the Tide panel hierarchy:
  - dense header
  - explicit context control
  - compact mode/control strip above the transcript
  - transcript and composer in the same order as Tide
- Keep explicit input behavior:
  - user submits manually
  - no hidden auto-execution
  - no hidden context injection
- Keep left-panel placement, fill, and panel focus behavior aligned with Tide.

### Settings utility surfaces

- Keep settings entry as a secondary right-rail utility surface, not a new top-level product area.
- Replace legacy-only block-launch behavior on the active compat path with a real user-facing shell settings surface.
- The compat shell settings surface must present real content for:
  - `Overview`
  - `Trusted tools`
  - `Secret shield`
  - `Help`
- The `Trusted tools` and `Secret shield` views are a RunaTerminal compatibility adaptation, not direct Tide screens:
  - they are required by the active parity matrix and current release docs
  - they must use real backend policy/help data, not placeholders

## Explicitly out of scope

- Importing the whole Tide `waveconfig` product area into the compat shell
- Broad settings breadth beyond the release-tracked utility surfaces
- Builder-specific AI panel behavior
- Reworking the execution model, tool approval model, MCP model, or remote model
- General Tide `tips` parity

## Ambiguities found in source

- Tide’s inspected settings flyout only proves `Settings`, `Tips`, `Secrets`, and `Help` entry behavior. It does not provide a direct Tide reference for RunaTerminal-specific `Trusted tools` or `Secret shield` tabs.
- Tide’s AI mode control is a single mode dropdown, while the compat backend exposes profile/role/mode selections. Exact one-to-one control mapping is therefore not available from Tide source alone.
- Tide’s rate-limit strip is tied to TideTerm-hosted AI limits. The current compat runtime does not expose the same hosted-rate-limit contract.

## Reference note

The Tide repo-root source files listed above were inspected directly and used as the primary reference for this batch. Any compatibility adaptation in RunaTerminal should be read as a closest-compatible implementation layered on top of those inspected Tide behaviors, not as a memory-based reconstruction.
