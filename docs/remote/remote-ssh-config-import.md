# Remote SSH Config Import Scope

Date: `2026-04-26`

## Implemented scope

The runtime now exposes a narrow one-way import path:

- `POST /api/v1/remote/profiles/import-ssh-config`
- request body: `{ "path": "/absolute/path/to/config" }`
- if `path` is omitted, the runtime reads `<home_dir>/.ssh/config`

Supported directives are intentionally limited:

- `Host`
- `HostName`
- `User`
- `Port`
- `IdentityFile`

Imported hosts become explicit saved remote profiles. Re-running the import is
idempotent by `Host` alias: an existing profile with the same name is updated
instead of duplicated.

## Intentionally unsupported

- `Match`
- `Include`
- wildcard / negated host expansion beyond reporting skipped hosts
- `ProxyJump` / proxy chaining
- control socket / multiplexing directives
- agent/keychain integration
- password/passphrase handling
- two-way synchronization back into the user's SSH config
