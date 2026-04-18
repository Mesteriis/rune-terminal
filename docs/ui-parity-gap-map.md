# Full UI Parity Gap Map

Status: historical snapshot. Do not treat this file as current UI-system closure. Current screenshot-backed truth lives in [ui-system-parity-gap-map.md](./ui-system-parity-gap-map.md) and [ui-system-parity-validation.md](./ui-system-parity-validation.md), which still record remaining visible mismatch in terminal badge weight, overlay heaviness, and whole-window composition vs Tide.

Date: `2026-04-17`
Phase: stability hardening

This document maps the active compat UI against the Tide reference extracted in [ui-parity-reference.md](./ui-parity-reference.md).

The gaps below are limited to the remaining stability-relevant UI parity issues. They do not reopen broader deferred domains such as multi-session terminal UX breadth, streaming AI response UX, or attachment-manager feature breadth.

## Current UI baseline

At batch start, the active compat shell already matched Tide closely in:

- top-shell tab bar density and workspace-switcher/launcher integration
- AI panel baseline placement and controls
- settings/help/trust/secret availability as real operator surfaces
- shell-level utility flyout anchoring and non-stacking behavior
- shell stretch/fill contract in the active layout

The remaining visible parity misses at batch start were concentrated inside the compat content panes and the right-side utility surface styling/structure. They are retained below as the pre-fix gap map for traceability.

## Gaps identified at batch start

### 1. Compat split panes do not use Tide-like block header chrome

Current behavior:

- Compat panes render as rounded bordered regions with content filling the full pane.
- There is no compact `30px` header strip at the top of terminal or files panes.
- There is no icon/title zone, no connection pill zone, and no compact end-icon cluster.

Tide reference:

- Tide surfaces inherit compact block headers from `blockframe.tsx` and `block.scss`.
- The header is the local chrome layer that establishes pane identity and hierarchy.

Why this matters:

- The shell currently reads as “custom compat panes inside a Tide-like shell” instead of a consistently Tide-like product.
- This is the largest remaining structural mismatch in the active UI.

Affected parity dimensions:

- structure
- density
- spacing
- shell feel

Stability-critical:

- yes

### 2. Terminal status and actions are rendered as large in-content overlays instead of compact header indicators

Current behavior:

- Compat terminals show lifecycle text in the top-left of the terminal body.
- Restart and explain are large bordered buttons floating in the top-right of the terminal body.
- Status detail/error text is stacked under those overlays.

Tide reference:

- Tide terminal chrome puts status and actions into the compact block header.
- Routine status uses icons and short header text, not persistent body overlays.
- Connection issues are the special case that can appear below the header.

Why this matters:

- The current overlay controls make the terminal body feel heavier and less Tide-like.
- They also compete visually with the terminal output itself.

Affected parity dimensions:

- structure
- iconography
- density
- bounds/anchoring
- shell feel

Stability-critical:

- yes

### 3. Drag affordance is not visible as pane chrome

Current behavior:

- The whole compat pane is draggable for split moves.
- The user does not get a distinct header zone or obvious chrome-level drag affordance.
- The `Split Right` action is an absolute button floating over the pane body.

Tide reference:

- Drag behavior is associated with the block header via `dragHandleRef`.
- Pane actions and pane movement are visually grouped in the header, not floating over the working surface.

Why this matters:

- Split panes behave functionally, but not with the same local chrome grammar as Tide.
- The current body-overlay action makes the content region look like an instrumented test surface rather than a polished operator surface.

Affected parity dimensions:

- drag affordance
- structure
- spacing
- shell feel

Stability-critical:

- yes

### 4. Settings utility surface is functionally correct but not structured like a Tide utility-to-surface flow

Current behavior:

- The compat settings flyout is a wide single-card surface with a chip row and large explanatory copy.
- Overview, trusted tools, secret shield, and help all live inside the same generic card layout.

Tide reference:

- Tide keeps utility entry compact and moves real settings content into a structured surface.
- Settings/secrets/help views have clear navigation structure and denser content framing.

Why this matters:

- The current flyout is accurate in data and actions, but still feels like a compatibility dashboard rather than a Tide-like utility surface.
- This is especially visible when switching between overview, trust, secret, and help states.

Affected parity dimensions:

- structure
- density
- spacing
- hierarchy

Stability-critical:

- yes

### 5. Right-rail utility windows do not share one compact bounded frame rhythm

Current behavior:

- Launcher, files, and settings surfaces each use their own width, header, and padding rhythm.
- Settings is `26rem`, launcher is `32rem`, and files has its own internal section spacing.
- All are bounded, but they do not yet read as one cohesive Tide-derived utility family.

Tide reference:

- Tide utility popovers are compact, tightly anchored, and visually consistent.
- Popover framing stays small-radius and low-padding unless a dedicated full surface is opened.

Why this matters:

- The shell already behaves correctly, but the remaining variation in frame rhythm still makes utility surfaces feel custom.

Affected parity dimensions:

- bounds/anchoring
- spacing
- shell feel

Stability-critical:

- yes

### 6. Compat pane interior spacing still lacks Tide’s frame-to-content rhythm

Current behavior:

- Pane borders and body content are present, but the frame does not step through Tide’s header-plus-content padding rhythm.
- Content reads as flush to the outer pane frame once the floating overlay buttons are removed from consideration.

Tide reference:

- Tide uses a clear sequence:
  - rounded outer frame
  - compact header
  - padded content region
  - special overlays only when necessary

Why this matters:

- The product already behaves correctly, but the local surface feel still looks thinner and more improvised than Tide.

Affected parity dimensions:

- spacing
- hierarchy
- shell feel

Stability-critical:

- yes

## Out of scope for this batch

- Multi-session terminal sidebar breadth
- Broader attachment-management feature breadth
- Streaming assistant-response UX
- Non-release visual polish outside the concrete gaps above

## Fixed in this batch

- Slice 3 replaced the broad single-card settings/dashboard feel with a compact Tide-like utility frame, bounded popover family, and structured navigation between Overview, Trusted tools, Secret shield, and Help.
- Slice 4 moved compat terminal actions and status out of floating body overlays into compact pane headers, added visible drag affordances, and aligned pane chrome with Tide’s block-header grammar.
- Slice 5 tightened the remaining shell-surface rhythm by:
  - applying symmetric `3px` shell framing around compat tab content
  - reducing compat split gaps to the same compact rhythm instead of wider ad hoc spacing
  - switching compat pane corners to the Tide block-radius token
  - aligning files-pane content padding to the same `5px` frame-to-content step already used by the terminal host
- Slice 6 validated the result in the visible Tauri desktop app plus headed browser runs captured in [ui-parity-validation.md](./ui-parity-validation.md).
- Slice 7 added focused UI coverage in [e2e/ui-parity.spec.ts](../e2e/ui-parity.spec.ts) and updated the broader navigation fill assertions to the final compact-frame contract.
- Final state:
  - all stability-critical UI parity gaps listed above are closed on the active compat shell
  - no remaining UI-domain release mismatch was observed in the final desktop capture, headed 17-test sweep, or `npm run validate`
