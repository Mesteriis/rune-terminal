# Plugin Runtime

Date: `2026-04-17`
Phase: stability hardening

## What this document is

This is the canonical plugin entrypoint for runtime boundary and protocol behavior.

## Core model

- Plugins are separate processes launched by Go core.
- Core-plugin communication is explicit JSON protocol over stdio.
- Frontend never talks directly to plugins.
- Plugins extend tool execution capability without bypassing core policy/audit.

## Protocol contract

- One handshake exchange validates manifest (`plugin_id`, `plugin_version`,
  `protocol_version`, `exposed_tools`, explicit `capabilities` when the
  core-bound plugin spec grants capabilities).
- Plugin `capabilities` are a request declaration, not authority: core rejects
  missing declarations, malformed declarations and any requested capability
  outside the plugin binding's allow-list.
- Execute requests/responses are line-delimited JSON messages.
- Core classifies failures with explicit taxonomy:
  - `launch_failed`
  - `handshake_failed`
  - `timeout`
  - `crashed`
  - `malformed_response`
  - `tool_not_exposed`
  - `protocol_version_mismatch`
  - `capability_not_declared`
  - `capability_not_allowed`

## Policy and audit boundaries

- Approval checks happen in core before plugin invocation.
- Plugins do not mint/validate approval tokens.
- Audit entries remain core-owned for both success and failure.
- Plugin output is normalized into tool-runtime response shape by core.
- Plugin process environment is explicit: `ProcessConfig.Env` is the only
  environment passed to the child process, so parent process environment
  variables are not inherited by default.
- This is not a full OS sandbox. Plugin binaries are still local executables
  running as the current user unless a future sandbox layer changes that
  boundary.

## Release-scope limits

- No plugin discovery/install ecosystem in this phase.
- No plugin marketplace trust model in this phase.
- No container/chroot/seccomp/AppArmor-style plugin sandbox in this phase.
- Plugin runtime remains narrow and execution-path focused.

## Deep links

- Execution model: [plugin-execution-model.md](./plugin-execution-model.md)
- Protocol details: [plugin-runtime-protocol.md](./plugin-runtime-protocol.md)
- Boundary verification: [plugin-boundary-verification.md](./plugin-boundary-verification.md)
- Permission boundary ADR: [../architecture/adr/0027-plugin-process-permission-boundary.md](../architecture/adr/0027-plugin-process-permission-boundary.md)
- Historical runtime slices: [history/](./history)
