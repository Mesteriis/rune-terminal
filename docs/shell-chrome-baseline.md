# Shell Chrome Baseline

Date: `2026-04-17`

This baseline records the specific shell-chrome issues corrected in the shell parity batch.

## Issues fixed in this batch

- The active compat top bar no longer renders the extra `Add Remote Tab` and `Remote Profiles` buttons that made the Tide-derived action zone heavier than the reference shell.
- The AI top-shell control now updates compat layout truth when opening or hiding the AI panel:
  - opening AI in focus mode promotes `ai` to the active surface
  - opening AI when the surface was hidden adds it back to the active layout
  - hiding AI removes it from the active compat layout and falls back to the next visible surface
- Tab width calculation now accounts for every rendered header control, including the legacy remote buttons when they are present outside compat mode.

## Where the issues were visible before

- In the active compat shell header, the extra remote controls created a three-button cluster after the tab strip and reduced the Tide-like tab-first hierarchy.
- In compat focus mode, clicking the top-shell `AI` control after hiding the panel left the AI surface closed even though the control visually implied it would reopen.
- In non-compat mode, tab width calculation did not reserve space for the additional remote buttons, which risked header misalignment when the full control set was visible.

## Intentionally outside this batch

- broad theme or color redesign
- remote feature redesign
- window layout engine changes
- terminal-stage redesign beyond shell-chrome interaction
