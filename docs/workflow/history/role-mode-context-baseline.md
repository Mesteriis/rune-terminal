# Role/Mode Context Baseline

Date: `2026-04-16`

## Where role/mode comes from now

- The active role and mode live in the backend agent store:
  - `core/agent/store.go`
  - `core/agent/types.go`
- `agent.Selection().EffectivePolicyProfile()` materializes:
  - `prompt_profile_id`
  - `role_id`
  - `mode_id`
  - `security_posture`
  - capability and approval overlays

## Where it is implicitly injected

- `core/toolruntime.Executor` currently accepts a `PolicyProfileProvider`.
- `core/toolruntime/executor_prepare.go` calls `e.profiles.PolicyProfile()` during execution preparation.
- That means tool execution policy context is not fully present in the request or envelope that the executor receives.
- The current `ExecuteRequest.Context` carries:
  - `workspace_id`
  - `repo_root`
  - `active_widget_id`
- It does not carry:
  - `role_id`
  - `mode_id`

## Current effect on execution and audit

- Policy evaluation uses the implicitly fetched profile to compute:
  - effective capabilities
  - effective approval tier
  - trusted-rule auto-approval disablement
  - security posture
- Audit records `role_id`, `mode_id`, `prompt_profile_id`, and `security_posture`, but those values currently come from the implicit executor profile lookup rather than from explicit execution context.

## Why this is a boundary problem

- The executor has a hidden dependency on backend agent selection state.
- A future external execution boundary cannot rely on that implicit lookup being available inside the execution engine.
- The current execution envelope normalizes workspace/widget/repo identity, but role/mode identity is still injected out-of-band.
