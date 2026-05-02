# UI Theme Style Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove theme-hostile raw colors and misplaced presentational style constants from the focused frontend surfaces found during the style audit.

**Architecture:** Keep the ADR/UI architecture direction intact: tokens define shared visual values, style modules own reusable presentational objects, and widgets/components only compose those styles. This plan does not redesign the UI or change backend/runtime semantics.

**Tech Stack:** React 19, TypeScript, Vitest, CSS custom properties.

---

## Files

- Modify: `frontend/src/shared/ui/tokens/index.css`
  - Add terminal ANSI/contrast palette tokens and busy-particle palette tokens with dark/light values.
- Modify: `frontend/src/shared/ui/components/terminal-surface.tsx`
  - Resolve xterm adaptive/contrast colors from CSS variables instead of raw literals.
- Modify: `frontend/src/shared/ui/components/terminal-status-header.tsx`
  - Use the existing danger token without a hard-coded fallback.
- Modify: `frontend/src/shared/ui/components/terminal-status-header.styles.ts`
  - Use the existing menu shadow token instead of a raw fallback.
- Modify: `frontend/src/widgets/terminal/terminal-widget.styles.ts`
  - Remove raw shadow fallback from terminal widget chrome.
- Create: `frontend/src/widgets/panel/widget-busy-overlay-widget.styles.ts`
  - Move busy overlay/marker presentational style objects and dynamic style builders out of widget render files.
- Modify: `frontend/src/widgets/panel/widget-busy-overlay-widget.tsx`
  - Consume busy style module and resolved particle palette tokens.
- Modify: `frontend/src/widgets/panel/widget-busy-marker.tsx`
  - Consume busy marker style builders from the style module.
- Modify: `frontend/src/widgets/settings/settings-shell-widget.styles.ts`
  - Add shared error text and inline label styles.
- Modify: `frontend/src/widgets/settings/settings-shell-widget.tsx`
- Modify: `frontend/src/widgets/settings/plugins-settings-section.tsx`
- Modify: `frontend/src/widgets/settings/runtime-settings-section.tsx`
- Modify: `frontend/src/widgets/settings/mcp-settings-section.tsx`
- Modify: `frontend/src/widgets/settings/remote-profiles-settings-section.tsx`
- Modify: `frontend/src/widgets/settings/agent-provider-settings-widget.styles.ts`
  - Replace duplicate raw danger/text fallbacks with style-layer tokens.
- Create: `frontend/src/shared/ui/style-theme-contracts.test.ts`
  - Contract-test the audited files so raw colors do not creep back above tokens/style boundaries.
- Modify: `frontend/docs/ui-architecture.md`
  - Record the terminal/busy/settings style cleanup in the current style-layer notes.
- Create or modify: `docs/validation/ui.md`
  - Add validation evidence for this UI style/theme pass.

## Task 1: Regression Contract

- [ ] **Step 1: Add failing test**

Create `frontend/src/shared/ui/style-theme-contracts.test.ts` with source checks for:

```ts
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const rawColorPattern = /#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(/
const source = (path: string) => readFileSync(`${process.cwd()}/${path}`, 'utf8')

describe('frontend style theme contracts', () => {
  it('keeps audited component/widget files free of raw color literals', () => {
    const files = [
      'src/shared/ui/components/terminal-surface.tsx',
      'src/shared/ui/components/terminal-status-header.tsx',
      'src/shared/ui/components/terminal-status-header.styles.ts',
      'src/widgets/terminal/terminal-widget.styles.ts',
      'src/widgets/panel/widget-busy-overlay-widget.tsx',
      'src/widgets/panel/widget-busy-marker.tsx',
      'src/widgets/settings/settings-shell-widget.tsx',
      'src/widgets/settings/plugins-settings-section.tsx',
      'src/widgets/settings/runtime-settings-section.tsx',
      'src/widgets/settings/mcp-settings-section.tsx',
      'src/widgets/settings/remote-profiles-settings-section.tsx',
      'src/widgets/settings/agent-provider-settings-widget.styles.ts',
    ]

    for (const file of files) {
      expect(source(file), file).not.toMatch(rawColorPattern)
    }
  })

  it('defines token-owned palettes for terminal and busy surfaces', () => {
    const tokens = source('src/shared/ui/tokens/index.css')

    expect(tokens).toContain('--runa-terminal-ansi-red')
    expect(tokens).toContain('--runa-terminal-contrast-background')
    expect(tokens).toContain('--runa-busy-particle-primary')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix frontend run test -- src/shared/ui/style-theme-contracts.test.ts --run
```

Expected: FAIL because audited files currently contain raw hex/rgb fallbacks and the token file does not yet define the new palettes.

## Task 2: Terminal Theme Tokens

- [ ] **Step 1: Add token variables**

Add terminal ANSI and contrast variables to `frontend/src/shared/ui/tokens/index.css` in the default root, plus light adaptive overrides in both light sections.

- [ ] **Step 2: Update terminal surface resolution**

Change `TerminalSurface` to resolve adaptive and contrast xterm colors through token names, falling back only to other resolved token values, never raw literals.

- [ ] **Step 3: Remove terminal raw fallbacks**

Update terminal status/header/widget style values to use `--color-danger-text`, `--shadow-menu-popover`, and `--color-shadow` without raw fallbacks.

- [ ] **Step 4: Run focused test**

Run:

```bash
npm --prefix frontend run test -- src/shared/ui/style-theme-contracts.test.ts --run
```

Expected: still FAIL until busy/settings cleanup lands.

## Task 3: Busy Overlay Style Module

- [ ] **Step 1: Create style module**

Create `frontend/src/widgets/panel/widget-busy-overlay-widget.styles.ts` with overlay, marker, ring, dot, and particle palette helpers. Use CSS variables, `color-mix()`, and token-resolved particle colors only.

- [ ] **Step 2: Wire overlay and marker widgets**

Update `WidgetBusyOverlayWidget` and `WidgetBusyMarker` to import the style objects/builders from the style module. Keep runtime sizing and particles behavior in the widget files.

- [ ] **Step 3: Run focused test**

Run:

```bash
npm --prefix frontend run test -- src/shared/ui/style-theme-contracts.test.ts --run
```

Expected: still FAIL only on settings files until settings cleanup lands.

## Task 4: Settings Style De-Dupe

- [ ] **Step 1: Add shared settings styles**

Add `settingsShellErrorTextStyle` and `settingsShellInlineLabelStyle` to `frontend/src/widgets/settings/settings-shell-widget.styles.ts`.

- [ ] **Step 2: Replace duplicate inline fallbacks**

Use those styles in the settings shell, plugins, runtime, MCP, and remote profile sections. Remove the raw fallback from `providerSettingsErrorMessageStyle`.

- [ ] **Step 3: Run focused test**

Run:

```bash
npm --prefix frontend run test -- src/shared/ui/style-theme-contracts.test.ts --run
```

Expected: PASS.

## Task 5: Docs And Verification

- [ ] **Step 1: Update docs**

Update `frontend/docs/ui-architecture.md` with the new theme-contract cleanup note and add `docs/validation/ui.md` evidence.

- [ ] **Step 2: Run final verification**

Run:

```bash
npm --prefix frontend run test -- src/shared/ui/style-theme-contracts.test.ts --run
npm --prefix frontend run test -- src/widgets/panel/panel-dom-mount.test.tsx src/widgets/settings/runtime-settings-section.test.tsx src/shared/ui/components/terminal-status-header.test.tsx --run
npm --prefix frontend run lint:active
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Commit and push**

Run:

```bash
git add frontend/src/shared/ui/tokens/index.css frontend/src/shared/ui/components/terminal-surface.tsx frontend/src/shared/ui/components/terminal-status-header.tsx frontend/src/shared/ui/components/terminal-status-header.styles.ts frontend/src/widgets/terminal/terminal-widget.styles.ts frontend/src/widgets/panel/widget-busy-overlay-widget.styles.ts frontend/src/widgets/panel/widget-busy-overlay-widget.tsx frontend/src/widgets/panel/widget-busy-marker.tsx frontend/src/widgets/settings/settings-shell-widget.styles.ts frontend/src/widgets/settings/settings-shell-widget.tsx frontend/src/widgets/settings/plugins-settings-section.tsx frontend/src/widgets/settings/runtime-settings-section.tsx frontend/src/widgets/settings/mcp-settings-section.tsx frontend/src/widgets/settings/remote-profiles-settings-section.tsx frontend/src/widgets/settings/agent-provider-settings-widget.styles.ts frontend/src/shared/ui/style-theme-contracts.test.ts frontend/docs/ui-architecture.md docs/validation/ui.md docs/superpowers/plans/2026-05-02-ui-theme-style-cleanup.md
git commit -m "fix: clean up frontend theme style contracts"
git push origin main
```
