# Window Parity Completion Baseline

Date: `2026-04-17`  
Phase: `1.0.0-rc1` release hardening  
Scope: remaining release-blocking window parity only

## Remaining required behaviors

From the reference window model (`tideterm/frontend/layout/lib/{utils.ts,layoutTree.ts}`), the remaining missing behaviors are:

1. Outer drop zones on window drag/drop:
- `outer-top`
- `outer-right`
- `outer-bottom`
- `outer-left`

These are distinct from inner `top/right/bottom/left` and are selected when dropping near outer edges.

2. Center drop swap:
- `center` drop performs swap semantics between dragged and target windows, not a split insert.

## Why this is release-blocking

- `docs/window-behavior-validation.md` explicitly records these as remaining mismatches versus required reference behavior.
- Window drag/drop semantics are part of first-release parity requirements, not optional polish.
- Shipping without `outer*` and `center` semantics leaves the interaction model materially different from the reference product.

## Strict boundary for this slice

- No broad layout rewrite.
- No new layout feature domains.
- No shell redesign.
- No weakening of existing working split behavior.
- Parity completion only: implement `outer*` zones and `center` swap, then revalidate and cover with targeted UI tests.
