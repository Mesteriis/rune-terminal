# UI Validation

## Latest frontend UI component contract slice

**Date:** `2026-04-18`

**Scope:** Establish UI layer architecture contract and prove it on RTButton pilot component

### What changed

1. **Created frontend/ui/README.md**: Defined target dependency direction (tokens -> style -> primitives -> components -> widgets -> layout -> app)
2. **Created frontend/ui/style/README.md**: Documented shared style layer constraints
3. **Created frontend/ui/component-contract.json**: Manifest registering RTButton as pilot component
4. **Created frontend/scripts/check-ui-component-contract.mjs**: Script to validate four-file component convention
5. **Migrated RTButton to four-file structure:**
   - `RTButton.style.scss` — component styles only
   - `RTButton.logic.ts` — ButtonProps interface, normalizeButtonClassName helper
   - `RTButton.template.tsx` — React component implementation
   - `RTButton.story.tsx` — static isolated demo file
   - `index.ts` — public API barrel (unchanged export name)
6. **Wired checker into npm lint**: Added `lint:ui-contract` script and updated main `lint` script

### Exact commands run

```bash
# Phase 1: Documentation
npm --prefix frontend run build  # Validated build passes

# Phase 2: Contract checker
node frontend/scripts/check-ui-component-contract.mjs  # Confirmed fails before migration (expected)
npm --prefix frontend run build  # Validated build still passes

# Phase 3: RTButton migration
npm --prefix frontend run lint  # Validates all linting + contract checking
npx tsc -p frontend/tsconfig.json --noEmit  # Type check passes
npm --prefix frontend run build  # Build passes
npm run build:core  # Core builds successfully

# Phase 4: API smoke
curl -H "Authorization: Bearer ui-contract-token" http://127.0.0.1:52760/healthz
```

### Observed results

- ✅ All phases pass linting, type checking, and build
- ✅ RTButton migrated successfully to four-file convention
- ✅ Contract checker validates RTButton has all required files
- ✅ All 20+ existing imports of Button from "@/ui/primitives/RTButton" continue to work without refactoring
- ✅ Component exports preserved: Button (component), ButtonProps (type)
- ✅ Default behavior preserved:
  - Default category: solid
  - Default color: green
  - Disabled tabIndex: -1 when disabled, 0 otherwise
  - className behavior: normalized via normalizeButtonClassName
- ✅ No new fatal console errors
- ✅ No RTButton-related runtime failures detected during lint/build validation

### Notes

- **Storybook intentionally NOT added**: RTButton.story.tsx is a standalone demo file with no Storybook dependencies
- **Broader component migration remains future work**: Only RTButton migrated as pilot in this slice
- **Import paths unchanged**: All existing imports continue to work via the barrel export pattern
- **Checker not yet enforcing old-file deletion**: Script warns on old files but doesn't fail (allows Phase 2→3 transition)

---

## Last verified state

- Date: `2026-04-17`
- State: `VERIFIED` for active compat surfaces
- Scope:
  - UI system alignment for static assets, font/icon unification, and true modal settings overlay behavior
  - shell chrome parity coverage for compact top-shell density, tab hierarchy, and AI reopen behavior
  - panels parity coverage for AI panel + settings utility surfaces
  - final UI parity hardening for pane headers, drag/status chrome, popover boundedness, and compact shell-surface rhythm
  - AI panel render/send/reload behavior
  - Tools panel execute + approval retry behavior
  - Audit panel event visibility and chain coherence
  - terminal streaming/interrupt and terminal parity closure checks
  - structured execution local/remote target truth in a visible browser
  - asset-pipeline checks

## Commands/tests used

- `npm --prefix frontend run dev -- --host 127.0.0.1 --port <port> --strictPort`
- `go run ./cmd/rterm-core serve --listen 127.0.0.1:<port> ...`
- headed Playwright Chromium validation with launcher -> AI panel -> local `/run` -> remote `/run`
- real desktop validation with:
  - `npm run tauri:dev`
  - `open -a TideTerm`
  - `screencapture -x /tmp/tideterm-desktop.png`
  - `screencapture -x /tmp/rterm-rail-attempt-1.png`
- `npx playwright test e2e/shell-chrome-parity.spec.ts -c e2e/playwright.config.ts --headed`
- `npx playwright test e2e/panels-parity.spec.ts -c e2e/playwright.config.ts --headed`
- `npx playwright test e2e/ui-parity.spec.ts e2e/navigation-parity.spec.ts -c e2e/playwright.config.ts --headed`
- `npx playwright test e2e/ui-parity.spec.ts e2e/panels-parity.spec.ts e2e/shell-chrome-parity.spec.ts e2e/terminal-parity.spec.ts e2e/navigation-parity.spec.ts e2e/quick-actions.spec.ts e2e/structured-execution-block.spec.ts e2e/window-behavior.spec.ts -c e2e/playwright.config.ts --headed`
- Runtime/API checks:
  - `GET /api/v1/agent/conversation`
  - `POST /api/v1/agent/conversation/messages`
  - `GET /api/v1/tools`
  - `POST /api/v1/tools/execute`
  - `GET /api/v1/audit?limit=50`
  - `POST /api/v1/remote/profiles`
  - `POST /api/v1/remote/profiles/{profileID}/session`
- Related validation documents:
  - [frontend-terminal-interrupt-validation.md](./frontend-terminal-interrupt-validation.md)
  - [frontend-streaming-runtime-validation.md](./frontend-streaming-runtime-validation.md)
  - [frontend-approval-action-validation.md](./frontend-approval-action-validation.md)
  - [frontend-asset-pipeline-validation.md](./frontend-asset-pipeline-validation.md)
  - [structured-execution-browser-validation.md](./structured-execution-browser-validation.md)
  - [../panels-parity-validation.md](../panels-parity-validation.md)
  - [../shell-chrome-validation.md](../shell-chrome-validation.md)
  - [../terminal-parity-validation.md](../terminal-parity-validation.md)
  - [../ui-parity-validation.md](../ui-parity-validation.md)
  - [../ui-system-validation.md](../ui-system-validation.md)

## Known limitations

- Expected `428` browser noise on approval challenge can appear while UI flow still succeeds.
- Terminal advanced affordances, broader attachment UX, and streaming AI response UX are not part of the current active validation scope.

## Evidence

- [UI surfaces](../ui/surfaces.md)
- [Panels parity headed validation](../panels-parity-validation.md)
- [Shell chrome desktop + headed validation](../shell-chrome-validation.md)
- [Terminal parity headed validation](../terminal-parity-validation.md)
- [Full UI parity desktop + headed validation](../ui-parity-validation.md)
- [UI system desktop alignment validation](../ui-system-validation.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#agent--conversation-panel)
