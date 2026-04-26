# 0027. Plugin Process Permission Boundary

- Status: Accepted

## Context

The plugin runtime now launches side-process tools over the
`rterm.plugin.v1` JSON-line stdio protocol. The core validates plugin
identity, protocol version, exposed tools, requested capabilities, timeouts,
message size and response shape before returning plugin output through the
normal tool-runtime path.

This is a process boundary, but it is not an operating-system sandbox. Without
an explicit decision, it would be easy to overstate the current security model
or accidentally grant plugins ambient runtime state such as inherited
environment variables.

## Decision

The current plugin permission boundary is layered:

- Core policy and approval run before plugin invocation.
- Core audit records the attempted execution after invocation.
- Plugin manifest capabilities are request declarations checked against the
  core-bound plugin allow-list.
- Plugin stdio messages remain bounded and schema-validated.
- Plugin processes are launched with explicit `ProcessConfig.Env` only; they do
  not inherit the parent process environment by default.
- Plugin process launch still validates executable path, working directory,
  launch timeout, handshake timeout, invocation timeout and teardown timeout.

The current boundary is intentionally not a full sandbox:

- no chroot, container, seccomp, AppArmor, sandbox-exec or equivalent
  confinement is configured
- no core-owned filesystem broker blocks direct filesystem access by the plugin
  process itself
- no network broker blocks direct network access by the plugin process itself
- no resource quota beyond the existing process timeout and protocol message
  size limits is claimed

Therefore plugin binaries must be treated as trusted local code for this
pre-release phase. Capability declarations constrain what the plugin can do
through the core runtime contract; they do not remove OS permissions the plugin
process already has as a local child process.

## Consequences

Positive:

- The project no longer implies sandbox strength it does not yet provide.
- Parent-process secrets are not leaked to plugins through inherited
  environment variables by default.
- Future plugin sandbox work has a clear baseline: add OS confinement or a
  brokered filesystem/network model rather than weakening the current wording.

Negative:

- Plugins that need environment variables must receive them explicitly.
- Existing local executables can still access resources directly according to
  the operating-system user account.
- A true plugin marketplace remains out of scope until the sandbox and trust
  model are substantially stronger.

## Alternatives considered

### Keep inheriting the parent environment

Rejected. It makes local development convenient, but it silently exposes
secrets and runtime bootstrap values to every plugin process.

### Claim capability declarations as a sandbox

Rejected. Capability declarations are core-runtime policy metadata. They cannot
constrain direct OS access by an already-launched local process.

### Add a full OS sandbox in this slice

Deferred. That requires platform-specific design and validation. The current
slice tightens the ambient environment leak and documents the actual boundary
without expanding runtime scope.
