# Plugin Runtime

Date: `2026-04-29`
Phase: stability hardening

## What this document is

This is the canonical plugin entrypoint for runtime boundary and protocol behavior.

## Core model

- Plugins are separate processes launched by Go core.
- Core-plugin communication is explicit JSON protocol over stdio.
- Frontend never talks directly to plugins.
- Plugins extend tool execution capability without bypassing core policy/audit.
- The repository keeps a Go reference plugin (`plugins/example`) and a
  Python reference plugin (`plugins/python_reference`) to validate that the
  protocol is process/language-neutral.

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
- Local catalog lifecycle changes are also audit-owned by core: install,
  update, enable, disable, and delete append `plugin.*` audit events for both
  success and failure paths, with the actor, source, resulting status, and
  install root represented in the event summary/path fields.
- Plugin output is normalized into tool-runtime response shape by core.
- Plugin process environment is explicit: `ProcessConfig.Env` is the only
  environment passed to the child process, so parent process environment
  variables are not inherited by default.
- This is not a full OS sandbox. Plugin binaries are still local executables
  running as the current user unless a future sandbox layer changes that
  boundary.

## Release-scope limits

- No online plugin marketplace trust model in this phase.
- Plugin installation is intentionally narrow: backend-owned local catalog
  records plus explicit install sources (`git` repository URL or `zip`
  archive URL), not broad discovery.
- Zip installation is bounded before manifest validation: archive downloads
  have a compressed-size cap for both remote downloads and `file://` sources,
  extracted payloads have total byte and entry count budgets, and entries must
  remain under the extraction root by root-relative path checks.
- The staged bundle copy into the install root rejects symlink entries and
  applies the same total byte / entry-count budget, so `git` sources cannot
  smuggle external filesystem contents into an installed plugin through a
  symlink or unbounded repository payload. Failed staged copies remove their
  `.staging-*` directory before returning.
- Plugin delete removes the install root before removing the catalog record;
  if filesystem removal fails, the record remains visible for retry instead of
  orphaning files outside the catalog.
- The Python reference plugin remains a protocol fixture; it does not imply
  marketplace-style distribution.
- No container/chroot/seccomp/AppArmor-style plugin sandbox in this phase.
- Plugin runtime remains execution-path focused even as operator install UX
  broadens.

## Deep links

- Execution model: [plugin-execution-model.md](./plugin-execution-model.md)
- Protocol details: [plugin-runtime-protocol.md](./plugin-runtime-protocol.md)
- Boundary verification: [plugin-boundary-verification.md](./plugin-boundary-verification.md)
- Permission boundary ADR: [../architecture/adr/0027-plugin-process-permission-boundary.md](../architecture/adr/0027-plugin-process-permission-boundary.md)
- Historical runtime slices: [history/](./history)
