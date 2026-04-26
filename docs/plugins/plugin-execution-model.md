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

## 5. Plugin Process Contract

The plugin process contract is between the Go core and the plugin process.
It is not a frontend contract.

### 5.1 Invocation model

- The core invokes a plugin only after:
  - tool resolution
  - input decoding
  - operation planning
  - policy evaluation
  - approval verification when approval is required
- The minimal invocation envelope is:
  - `tool_name`
  - `input`
  - `context`
- Before that invocation envelope is sent, the plugin handshake must explicitly
  declare the capabilities/resources it requests in `manifest.capabilities`
  whenever the core-bound plugin spec grants capabilities.
- Core validates that requested capability set against the plugin binding's
  allow-list. A plugin cannot gain authority by declaring a new capability in
  the manifest.
- `context` must carry the execution identity that the current runtime already treats as explicit:
  - `workspace_id`
  - `widget_id`
    - derived from the current widget-scoped target, which is `active_widget_id` in today's tool request contract
  - `repo_root`
  - `role_id`
  - `mode_id`
- If the active prompt selection matters to downstream behavior, the core may also include backend-derived selection fields such as:
  - `prompt_profile_id`
  - `security_posture`
- These fields are derived by the core from backend state. They are not trusted just because the frontend requested execution.

### 5.2 Response model

- A plugin returns a normalized execution result to the core, not an HTTP response.
- Success shape:
  - `status: "ok"`
  - `output`
  - `structured` optional machine-readable data
- Failure shape:
  - `status: "error"`
  - `error`
  - `error_code` optional plugin-local classification
- A plugin response must not contain:
  - `pending_approval`
  - `approval_token`
  - transport status codes
  - audit fields such as `approval_used`
- The core remains responsible for mapping plugin output into the current tool-runtime `ExecuteResponse` shape.

### 5.3 Approval integration

- A plugin must not bypass approval.
- Approval is enforced by the core before the plugin is invoked.
- A plugin receives only:
  - a request that required no approval, or
  - a request whose approval has already been verified by the core
- A plugin must not:
  - validate approval tokens
  - mint approval tokens
  - run its own confirm flow
  - downgrade the effective approval tier of a request

### 5.4 Audit integration

- Plugin execution is logged by the core.
- The plugin cannot write directly to the audit log.
- The plugin cannot decide whether `approval_used` is true.
- Audit identity remains core-owned:
  - tool name
  - operation summary
  - workspace/widget/path scope
  - success/failure
  - policy/approval context

### 5.5 Failure model

- Timeout:
  - the core treats plugin timeout as execution failure
  - the core must not assume partial success
- Crash or broken pipe:
  - the core treats plugin process loss as execution failure
- Malformed response:
  - the core rejects the response as invalid
  - the core must not treat malformed output as a successful execution
- The current runtime has no plugin-specific transport error family.
  Plugin failures should therefore normalize through the existing tool-runtime error path unless a later slice introduces narrower explicit codes.

### 5.6 Security model

- A plugin gets no shared-memory access to core services.
- A plugin gets no direct access to the policy store, audit log, agent store, workspace store, or terminal session state except through the explicit contract the core chooses to send.
- A plugin must not be assumed to have uncontrolled environment access.
- Any future filesystem, terminal, network, or OS-level power exposed to a plugin must come from an explicit core-owned execution contract, not from ambient trust.
- High-level sandbox assumption:
  - the plugin process is an isolated execution peer
  - the core validates both request boundaries and response boundaries
