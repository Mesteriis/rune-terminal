# Remote SSH Config Import Scope

Date: `2026-04-16`

## Decision for this batch

No `~/.ssh/config` import is implemented in this batch.

Reason:

- the batch goal is saved profile usability with explicit backend-owned contracts
- adding parser behavior now would increase ambiguity around unsupported directives
- current profile create/list/delete/session flow is complete without config parsing

## Narrow import scope if enabled later

If enabled in a future narrow slice, supported directives should be limited to:

- `Host`
- `HostName`
- `User`
- `Port`
- `IdentityFile`

Mapping should be one-way into explicit saved profiles, with no secret persistence.

## Intentionally unsupported

- `Match`
- `Include`
- `ProxyJump` / proxy chaining
- control socket / multiplexing directives
- agent/keychain integration
- password/passphrase handling
- wildcard expansion semantics beyond trivial host aliases
