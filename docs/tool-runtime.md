# RunaTerminal Tool Runtime

## Position

The tool runtime is a first-class platform subsystem. AI features consume it; they do not own it.

## Tool Definition Shape

Each tool definition carries:

- human-facing description
- input schema
- output schema
- capability list
- approval tier
- mutating flag
- execution target
- planner
- executor

Dangerous policy-mutation tools must publish explicit input schemas that match their decode/runtime contract. In the current runtime this applies at minimum to:

- `safety.add_trusted_rule`
- `safety.add_ignore_rule`

Those schemas now expose the real enum fields (`scope`, `subject_type`, `matcher_type`, `mode`) and the structured matcher payload shape instead of a generic object placeholder.

## Tool Adapter Boundary

Tool handlers should depend on an adapter boundary, not on `*app.Runtime` directly.

Minimal adapter responsibilities:

- execution-facing context helpers
  - resolve active widget fallback
  - resolve repo/workspace scope fallback
- terminal operations
  - get state
  - send input
  - interrupt
- workspace operations
  - inspect tabs/widgets
  - focus/move/rename/pin/close tabs
  - create terminal tabs
- connection operations
  - list/select/check/save connection profiles
- policy operations
  - confirm pending approval
  - add/list/remove trusted rules
  - add/list/remove ignore rules

Illustrative shape:

```go
type ToolAdapter interface {
    ResolveWidgetID(widgetID string) (string, error)
    NormalizeScopeRef(scope policy.Scope, scopeRef string, execCtx toolruntime.ExecutionContext) string

    TerminalGetState(widgetID string) (any, error)
    TerminalSendInput(widgetID string, text string, appendNewline bool) (any, error)
    TerminalInterrupt(widgetID string) error

    WorkspaceSnapshot() any
    WorkspaceFocusWidget(widgetID string) (any, error)

    ConfirmApproval(id string) (toolruntime.ApprovalGrant, error)
}
```

Tool handlers must not access:

- the full runtime object graph
- the audit log directly
- the policy engine directly
- the agent store directly
- transport-layer concerns such as HTTP request or response state

The runtime may still back the adapter in-process today, but the handler contract should be narrow enough that the execution target can later move behind a different boundary.

## Execution Pipeline

1. Resolve tool definition by name.
2. Decode and validate the input payload.
3. Build an operation plan:
   - summary
   - affected widgets
   - affected paths
   - capability requests
   - approval tier
4. Evaluate the plan through the policy engine.
5. If policy requires confirmation, emit a `pending_approval`.
6. If an approval token is supplied, verify it against the approved execution intent.
7. Execute the tool handler.
8. Write an audit event.
9. Return normalized output.

The transport response now carries the same `Operation` shape used inside planning, so the caller can see the final summary, affected widgets/paths and effective approval tier without reverse-engineering tool-specific payloads.

## Registry Rules

- tool names are globally unique
- tool metadata is queryable through the transport layer
- tool handlers do not reach around the policy engine
- tool registration is split by domain (`workspace`, `terminal`, `policy`) rather than collected in a single bucket file

## MVP Tool Set

- `workspace.list_widgets`
- `workspace.get_active_widget`
- `workspace.focus_widget`
- `term.get_state`
- `term.send_input`
- `safety.confirm`
- `safety.add_trusted_rule`
- `safety.list_trusted_rules`
- `safety.remove_trusted_rule`
- `safety.add_ignore_rule`
- `safety.list_ignore_rules`
- `safety.remove_ignore_rule`

## Why Not Attach Tools Directly To Chat

The TideTerm audit showed that chat-driven tool callbacks become difficult to reason about once approvals, secrets and audit enter the picture. The new runtime keeps tools stable and reusable regardless of whether the caller is the UI, an AI agent or future automation.
