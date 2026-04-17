# Workspace Validation

## Last verified state

- Date: `2026-04-17`
- State: `VERIFIED`
- Scope:
  - split/focus/restore window behavior
  - outer-zone drop + center swap semantics
  - layout composition save/switch/restore
  - workspace navigation regression script

## Commands/tests used

- `./scripts/go.sh test ./core/workspace ./core/app ./core/transport/httpapi -count=1`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint:active`
- `npm run test:ui -- e2e/window-behavior.spec.ts`
- `npm run test:ui`
- `npx playwright test -c e2e/playwright.config.ts e2e/window-behavior.spec.ts --headed`
- `python3 scripts/validate_workspace_navigation.py`

## Known limitations

- Validation is strong for active split/layout behavior but does not claim full IDE-style workspace breadth.
- Last-tab closure behavior and some tab-group edge cases remain product limitations, not validation gaps.
- Remote checks within workspace runs are typically shape/regression checks, not full SSH launch sweeps.

## Evidence

- [Window behavior validation](../workspace/window-behavior-validation.md)
- [Workspace model](../workspace/workspace-model.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#window-behavior-parity)
