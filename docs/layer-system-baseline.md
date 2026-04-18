# Layer System Baseline

Date: `2026-04-17`
Phase: stability hardening

This document records only the shell-layer issues that materially affected navigation surfaces in this batch.

## Issues found

1. Right-rail flyouts in [`frontend/app/workspace/widgets.tsx`](/Users/avm/projects/Personal/tideterm/runa-terminal/frontend/app/workspace/widgets.tsx:1) were controlled by separate booleans, so launcher, files, tools, audit, apps, and settings surfaces could remain mounted at the same time.
2. Launcher-triggered transitions into other shell surfaces did not consistently dismiss the launcher first, which left overlapping interactive overlays on the same right-edge anchor lane.
3. The compat workspace flex chain in [`frontend/app/workspace/workspace.tsx`](/Users/avm/projects/Personal/tideterm/runa-terminal/frontend/app/workspace/workspace.tsx:1) was missing `min-h-0` / `min-w-0` guards on key wrappers, which made stretch and overflow inheritance unstable under the AI-panel split and right-rail layout.

## Fixed in this batch

1. The right utility rail now uses one shared flyout target, so only one of `apps`, `tools`, `audit`, `files`, `launcher`, or `settings` can be open at a time.
2. Launcher actions that open other surfaces or move operator focus now close the previous flyout explicitly instead of leaving layered overlays behind.
3. Compat workspace wrappers now carry the required `min-h-0` / `min-w-0` constraints through the workspace root, panel container, AI wrapper, main panel, and main content row.
4. Live runtime checks against the compat shell confirmed the user-visible result:
   - launcher and files flyouts stayed inside a `1600x1000` viewport
   - opening `Files` after `Launcher` closed the launcher surface instead of stacking it
   - the workspace switcher stayed anchored to the top-left shell button without clipping
   - the right utility rail stretched to the same `967px` content height as the compat main row
5. The same layer expectations held in the final headed validation sweep:
   - `npx playwright test e2e/navigation-parity.spec.ts e2e/quick-actions.spec.ts e2e/structured-execution-block.spec.ts e2e/window-behavior.spec.ts e2e/terminal-parity.spec.ts -c e2e/playwright.config.ts --headed`
   - result: `11 passed (35.1s)`

## Intentionally outside scope

1. Replacing the current launcher adaptation with Tide's block-replacement launcher model.
2. Broad shell visual polish or general z-index cleanup outside the navigation surfaces touched in this batch.
3. Rewriting the layout/window system beyond the min-size and overlay-state fixes needed for workspace switcher and launcher usability.
