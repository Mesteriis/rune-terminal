# Structured Execution Gap Analysis

Date: `2026-04-17`
Phase: `1.0.0-rc1` hardening

Reference used:

- [structured-execution-reference.md](./structured-execution-reference.md)
- [execution-contract.md](./architecture/execution-contract.md)
- [current-behavior.md](./architecture/current-behavior.md)

## Summary

RunaTerminal already carries explicit `target_session` and `target_connection_id` fields on the active `/run` path, and it already rejects some local-vs-remote mismatches. The remaining gap is that the broader execution contract still accepts ambiguous or leaky target context in several places.

## Current weak points

### 1. Terminal command target can still fall back silently

- [`core/app/tool_helpers.go`](/Users/avm/projects/Personal/tideterm/runa-terminal/core/app/tool_helpers.go:167) resolves a missing `widget_id` by falling back to the active workspace widget.
- [`core/app/tool_terminal.go`](/Users/avm/projects/Personal/tideterm/runa-terminal/core/app/tool_terminal.go:187) only checks session mismatch if `target_session` or `target_connection_id` were supplied at all.
- Result:
  - a caller can omit explicit target fields and still execute `term.send_input`
  - this is weaker than the Tide-derived expectation that command authority stays attached to an explicit active terminal/session identity

### 2. Explain path still has an ambiguous widget fallback

- [`core/app/ai_terminal_command.go`](/Users/avm/projects/Personal/tideterm/runa-terminal/core/app/ai_terminal_command.go:49) resolves the widget by falling back from `request.WidgetID` to `conversationContext.ActiveWidgetID`.
- Active UI paths already send `widget_id` explicitly, but the backend still accepts an omitted widget target.
- Result:
  - structured-execution follow-up actions still tolerate a silent active-widget fallback

### 3. Plugin-backed tool execution does not declare an explicit non-terminal target contract

- [`core/toolruntime/plugin_execution.go`](/Users/avm/projects/Personal/tideterm/runa-terminal/core/toolruntime/plugin_execution.go:30) forwards workspace/widget/repo context into the plugin request but does not validate whether terminal-session target fields are inappropriate for that tool.
- [`frontend/app/workspace/widget-helpers.ts`](/Users/avm/projects/Personal/tideterm/runa-terminal/frontend/app/workspace/widget-helpers.ts:52) currently injects `target_session` and `target_connection_id` for any tool execution as long as the active widget is a terminal.
- Result:
  - plugin-backed tool requests can inherit terminal target fields that do not belong to the plugin execution contract
  - that leaks terminal target identity into a non-terminal execution path

### 4. MCP invoke does not require an explicit workspace target

- [`core/transport/httpapi/handlers_mcp.go`](/Users/avm/projects/Personal/tideterm/runa-terminal/core/transport/httpapi/handlers_mcp.go:140) accepts `/api/v1/mcp/invoke` without requiring `workspace_id`.
- [`core/app/mcp_runtime.go`](/Users/avm/projects/Personal/tideterm/runa-terminal/core/app/mcp_runtime.go:124) appends audit with whatever `workspace_id` was provided, including blank.
- Result:
  - MCP invocation is explicit as a button-driven action, but the request can still lack an explicit target workspace identity

## Ambiguous paths to close

1. `term.send_input` without explicit `widget_id`
2. `term.send_input` or `term.interrupt` without explicit `target_session` / `target_connection_id`
3. `term.send_input` where `context.active_widget_id` does not match `input.widget_id`
4. explain requests without explicit `widget_id`
5. plugin-backed tool requests carrying terminal target fields
6. MCP invoke requests without explicit `workspace_id`

## Closure target for this batch

To reach `FULL` parity for target-session guardrails, the active execution model needs these exact properties:

- terminal execution requires explicit widget + explicit terminal target identity
- backend never falls back to the active widget for command execution
- explain/replay flow keeps explicit widget identity
- plugin execution rejects terminal-target leakage and requires explicit workspace identity
- MCP invoke requires explicit workspace identity
- negative tests prove invalid cross-target usage is rejected instead of silently coerced
