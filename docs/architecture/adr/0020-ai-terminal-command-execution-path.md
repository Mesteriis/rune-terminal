# 0020 — AI Terminal Command Execution Path

## Status

Accepted

## Context

`1.0.0` requires one genuinely useful AI feature, not a broad autonomous-agent platform.
The stability-critical requirement is narrow:

- a user can ask the AI panel to run a terminal command
- the command executes through the real runtime/tool/policy path
- dangerous execution still respects approval
- the panel shows a real assistant-side explanation of the observed result

The existing AI panel already had:

- a real backend conversation path
- a TideTerm-derived transcript and composer shell
- a runtime action feed
- approvals and policy in the tool runtime

What was missing was a single explicit bridge between the AI panel and terminal command execution.

## Decision

RunaTerminal `1.0.0` introduces one narrow, explicit AI terminal execution grammar:

- `/run <command>`
- `run: <command>`

This flow works only against the active terminal widget.

The execution model is:

1. the frontend recognizes the explicit `/run` grammar
2. it captures the active terminal snapshot sequence
3. it calls the real `term.send_input` tool through `/api/v1/tools/execute`
4. policy and approval behave exactly as they do for any other tool call
5. after execution, the frontend waits for terminal output from the captured sequence
6. it calls a backend explanation route
7. the backend appends a real assistant message to the persisted conversation transcript using the current prompt profile, role, and mode context

The backend explanation route is intentionally non-authoritative for execution:

- it does not run commands
- it explains observed output after the runtime already executed the command

## Consequences

Positive:

- `1.0.0` gets one honest AI daily-driver feature without introducing a hidden agent planner
- command execution remains auditable and policy-controlled
- approval stays visible and one-time
- role/mode/profile still project into the backend prompt path
- the AI panel becomes materially more useful without redesigning the shell

Negative:

- the command grammar is intentionally narrow and explicit
- this is not a general natural-language command planner
- frontend orchestration still coordinates execution and explanation timing
- streaming output and richer tool-use rendering remain future work

## Alternatives considered

### 1. Let the provider decide commands from arbitrary natural language

Rejected for `1.0.0`.
It expands the problem into planning, tool selection, risk, and prompt-control issues that are not necessary to ship one useful release feature.

### 2. Execute commands directly inside the frontend without the tool runtime

Rejected.
It would bypass policy, approvals, audit, and the new architecture’s explicit runtime boundaries.

### 3. Have the backend both execute and explain commands in one opaque agent endpoint

Rejected for `1.0.0`.
It would hide the real tool/runtime path and blur the line between user-visible execution and assistant explanation.

### 4. Delay AI command execution entirely until a larger autonomous-agent system exists

Rejected.
`1.0.0` needs one concrete, useful AI feature, and this narrow explicit execution path meets that requirement without broadening scope.
