# Validation System

Date: `2026-04-18`

Validation is now organized by domain and each domain file uses the same structure:

1. `Last verified state`
2. `Commands/tests used`
3. `Known limitations`
4. `Evidence`

Do not append new free-form log blocks in this file. Update the relevant domain file instead.

## Domain entrypoints

- [agent.md](./agent.md)
- [settings-providers.md](./settings-providers.md)
- [execution.md](./execution.md)
- [terminal.md](./terminal.md)
- [workspace.md](./workspace.md)
- [remote.md](./remote.md)
- [mcp.md](./mcp.md)
- [plugins.md](./plugins.md)
- [workflow.md](./workflow.md)
- [ui.md](./ui.md)
- [infrastructure.md](./infrastructure.md)

## Focused parity validations

- [../navigation-parity-validation.md](../navigation-parity-validation.md)
- [../panels-parity-validation.md](../panels-parity-validation.md)
- [../shell-chrome-validation.md](../shell-chrome-validation.md)
- [../shell-stretch-baseline.md](../shell-stretch-baseline.md)
- [../tab-closure-validation.md](../tab-closure-validation.md)
- [../terminal-parity-validation.md](../terminal-parity-validation.md)
- [../ui-system-parity-validation.md](../ui-system-parity-validation.md) - current UI-system source of truth
- [../ui-parity-validation.md](../ui-parity-validation.md) - historical snapshot, superseded for current UI-system truth
- [../ui-system-validation.md](../ui-system-validation.md) - historical snapshot, superseded for current UI-system truth

## Legacy archive

The old monolithic log is retained for history only:
- [history/validation-log-legacy-2026-04-17.md](./history/validation-log-legacy-2026-04-17.md)
