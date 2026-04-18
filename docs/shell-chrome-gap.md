# Shell Chrome Parity Gap

Date: `2026-04-17`
Phase: stability hardening

This document maps the current active compat shell against the repo-root Tide shell chrome reference in [shell-chrome-reference.md](./shell-chrome-reference.md).

Status: the stability-critical gaps recorded here were closed in this batch and validated in [shell-chrome-validation.md](./shell-chrome-validation.md).

## Current shell chrome behavior

Visible current shell characteristics in the active compat shell:

- The top tab bar still uses Tide-derived base sizing:
  - bar height observed at `33px`
  - workspace switcher button observed at `41x26`
  - AI button observed at `42x26`
  - add-tab button observed at `38x27`
- The top bar order is broadly Tide-shaped:
  - AI button
  - workspace switcher
  - scrollable tab strip
  - add-tab and status area
- The right utility rail remains slim at `48px` wide in the inspected browser viewport and stays visually secondary to the center content.
- The AI panel and right-rail panels still fit into the shell without clipping in the default split layout.

## Reference shell chrome behavior

From the inspected Tide source:

- The top bar is compact and tab-first.
- The workspace switcher is a small shell affordance, not a dominant header.
- The tab strip is the primary visual object in the top chrome.
- The add-tab button is the only compact creation affordance shown in the inspected Tide top bar.
- The visible shell files do not add separate remote-shell buttons to the top bar.
- The AI toggle is a real shell affordance that coherently opens the AI column when used.

## Exact gaps

### 1. Extra remote controls overweight the top action zone

Current:

- The compat top bar adds two extra icon buttons after add-tab:
  - `Add Remote Tab`
  - `Remote Profiles`
- In the live shell this produces a three-button creation/remote cluster (`+`, server, bookmark) in the same visual lane as the compact Tide add-tab affordance.

Reference:

- The inspected Tide top bar only places the add-tab control in that zone.
- Remote-shell controls are not part of the inspected Tide top chrome.

Why this is a parity gap:

- The extra remote buttons make the top shell read heavier and more custom than Tide.
- They also reduce the dominance of the tab strip by claiming extra top-bar width and attention.

Visible mismatch area:

- top bar center-right action cluster immediately after the tab strip

Stability-critical:

- yes

### 2. AI top-shell control is not layout-coherent in compat focus mode

Current:

- In split mode the AI control opens and closes the panel normally.
- In focus mode, hiding AI and then clicking the AI button again does not reopen the panel.
- Reproduced in the live compat shell:
  1. open shell
  2. hide AI
  3. switch layout mode to `Focus`
  4. click the top-shell `AI` control
  5. AI panel remains closed

Reference:

- The Tide AI top-shell control is a true shell affordance for opening the AI column.
- The shell control and panel state stay coherent.

Why this is a parity gap:

- A core top-shell control stops performing the shell action it visually promises.
- This breaks recognizable Tide shell behavior and directly undermines panel integration.

Visible mismatch area:

- top-left shell control zone / AI toggle interaction

Stability-critical:

- yes

### 3. Header action hierarchy drifts once remote controls are present

Current:

- Tabs, add-tab, remote-tab, and remote-profiles all occupy the same compact line.
- This causes the right side of the tab strip to read as a mixed navigation-plus-operations zone.

Reference:

- Tide keeps the top bar visually simpler:
  - tabs dominate the header
  - add-tab is the compact creation affordance
  - secondary operations move elsewhere in the shell

Why this is a parity gap:

- The current header hierarchy is still understandable, but it no longer reads as distinctly Tide-like.
- The chrome starts to look like an operator console bar rather than a compact tab shell.

Visible mismatch area:

- relationship between tab strip and right-side header actions

Stability-critical:

- yes

## Gaps that are not stability-critical in this batch

- The workspace switcher button size and base tab metrics already align closely with the inspected Tide values and do not require redesign.
- The right utility rail width and bounded panel anchoring already read close enough to the Tide-derived shell grammar for this batch.
- Dev-only badges and development-only runtime indicators are not treated as release shell-chrome gaps.

## Summary

The current compat shell was already close to Tide at the primitive level because the tab and switcher components remained Tide-derived. The stability-critical shell chrome gaps were concentrated in the active top-shell action zone and in the broken AI-open behavior that made the shell control hierarchy unreliable. Those gaps are now closed on the active compat shell.
