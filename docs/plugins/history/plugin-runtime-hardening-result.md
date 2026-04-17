# Plugin Runtime Hardening Result

Date: `2026-04-16`

## 1. Contract added

- Handshake now uses an explicit manifest contract:
  - `plugin_id`
  - `plugin_version`
  - `protocol_version`
  - `exposed_tools`
  - optional `capabilities`
- Core validates:
  - manifest protocol version matches requested runtime protocol
  - manifest `plugin_id` matches the core-bound plugin spec
  - requested tool name is declared in `manifest.exposed_tools`

## 2. Lifecycle behavior hardened

- Launch hardening:
  - plugin command/path pre-validation (missing path, non-executable path, invalid working directory)
  - explicit launch timeout behavior
  - explicit handshake timeout behavior
- Execution hardening:
  - explicit per-call invocation timeout remains core-owned
  - explicit crash/malformed-response handling during protocol exchange
  - deterministic teardown wait after response with bounded teardown timeout and forced kill on overrun

## 3. Plugin error taxonomy

Runtime now classifies plugin-boundary failures with explicit codes:

- `launch_failed`
- `handshake_failed`
- `timeout`
- `crashed`
- `malformed_response`
- `tool_not_exposed`
- `protocol_version_mismatch`

Transport/runtime observability alignment:

- tool runtime maps plugin runtime boundary failures to `error_code: "plugin_failure"`
- HTTP transport maps `plugin_failure` to `502 Bad Gateway`
- audit error text now includes an explicit `plugin_failure:` marker for plugin-runtime boundary failures

## 4. Intentionally unimplemented

- plugin registry/discovery UI
- plugin install/update UX
- hot reload or long-lived process manager/pooling
- sandbox/container isolation engine
- broad plugin platform lifecycle redesign

## 5. Remaining risks

- Process model is still one-process-per-invocation; no pooled worker lifecycle.
- Plugin/runtime error details are normalized for safety but still string-forward in user-facing tool error text.
- Plugin capability flags remain declarative metadata, not an independent policy authority (core policy remains source of truth).
