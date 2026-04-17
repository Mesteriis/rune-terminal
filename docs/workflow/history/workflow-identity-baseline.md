# Workflow identity baseline

## Current explain identity path

Current terminal explain identity is inferred, not directly carried:

1. Terminal surface explain action (`frontend/app/view/term/compat-terminal.tsx`) fetches recent audit events and selects a command via `findLatestWidgetCommand(...)`.
2. The selected command is parsed from `term.send_input` audit summary text (`send input to <widget>: <command>`), then sent to `POST /api/v1/agent/terminal-commands/explain`.
3. Backend explain handling (`core/app/ai_terminal_command.go`) computes `approval_used` by scanning recent audit history for the latest successful `term.send_input` event matching widget + summary text (+ workspace/widget checks).
4. Explain audit is then written as `agent.terminal_command`.

## Exact ambiguity

The current identity path can be ambiguous when multiple executions share the same command text and widget:

- frontend chooses "latest" matching command by timestamp and parsed summary text
- backend chooses "latest" matching execution again from audit history by summary text
- there is no explicit execution identity token linking the intended `term.send_input` event to the explain request

This means explain identity can drift to another matching execution if repeated commands exist in the same recent window.

## Strict slice boundary

This hardening slice is intentionally narrow:

- no terminal UI redesign
- no broad audit/event-model rewrite
- no new UX domain
- no hidden context injection

Scope is limited to explicit command identity carry-over for existing explain workflows, while preserving current behavior and operator-facing flow.
