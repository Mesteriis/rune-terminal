# Plugin Execution Model

## 1. What is a plugin

- A plugin is a separate process from the Go core.
- A plugin communicates with the core only through an explicit request/response contract.
- A plugin does not share memory with the core runtime, frontend, policy store, audit log, terminal state, or conversation state.
- The frontend does not talk to plugins directly. The current frontend contract remains the core HTTP API.

## 2. How plugins fit into the execution pipeline

Current execution model:

`User -> Agent -> Tool Runtime -> Execution -> Audit -> Explain`

Plugin-compatible execution model:

`User -> Agent -> Tool Runtime -> (Plugin?) -> Execution -> Audit -> Explain`

Rules:

- The tool runtime remains the entry point for execution.
- The agent remains a selector and explanation layer; it does not call plugins directly.
- Policy and approval stay in the core before any plugin execution is allowed.
- Audit stays in the core after execution is attempted.
- Explain stays downstream of execution truth and audit truth, exactly as it does today.

Plugin roles inside that pipeline:

- Plugin as tool provider:
  - the plugin can supply executable capability behind a tool name
  - the core still owns the tool-facing contract exposed to `/api/v1/tools` and `/api/v1/tools/execute`
- Plugin as execution backend:
  - a core-owned tool can delegate its execution step to a plugin process after planning, policy, and approval checks
- Plugin as extension point:
  - plugins extend what can be executed without changing the frontend transport model or the agent/tool/audit ordering

## 3. Plugin categories

- Command plugins:
  - perform explicit actions
  - may be mutating
  - fit the same approval and audit path as existing tools
- Data/query plugins:
  - return structured read-oriented results
  - should normally map to safe or moderate tool semantics unless policy elevates them
- Execution plugins:
  - provide a backend execution surface for work that the core chooses not to implement directly
  - still execute only through a core-owned tool contract

## 4. Non-goals

- No UI contract is defined here.
- No IPC protocol or transport implementation is defined here.
- No process lifecycle manager is defined here.
- No plugin registry, discovery, or installation flow is defined here.
- No execution behavior changes are introduced by this document.
