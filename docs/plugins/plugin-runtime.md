# Plugin Runtime

Date: `2026-04-17`
Phase: `1.0.0-rc1` hardening

## What this document is

This is the canonical plugin entrypoint for runtime boundary and protocol behavior.

## Core model

- Plugins are separate processes launched by Go core.
- Core-plugin communication is explicit JSON protocol over stdio.
- Frontend never talks directly to plugins.
- Plugins extend tool execution capability without bypassing core policy/audit.

## Protocol contract

- One handshake exchange validates manifest (`plugin_id`, `plugin_version`, `protocol_version`, `exposed_tools`).
- Execute requests/responses are line-delimited JSON messages.
- Core classifies failures with explicit taxonomy:
  - `launch_failed`
  - `handshake_failed`
  - `timeout`
  - `crashed`
  - `malformed_response`
  - `tool_not_exposed`
  - `protocol_version_mismatch`

## Policy and audit boundaries

- Approval checks happen in core before plugin invocation.
- Plugins do not mint/validate approval tokens.
- Audit entries remain core-owned for both success and failure.
- Plugin output is normalized into tool-runtime response shape by core.

## Release-scope limits

- No plugin discovery/install ecosystem in this phase.
- Plugin runtime remains narrow and execution-path focused.

## Deep links

- Execution model: [plugin-execution-model.md](./plugin-execution-model.md)
- Protocol details: [plugin-runtime-protocol.md](./plugin-runtime-protocol.md)
- Boundary verification: [plugin-boundary-verification.md](./plugin-boundary-verification.md)
- Historical runtime slices: [history/](./history)
