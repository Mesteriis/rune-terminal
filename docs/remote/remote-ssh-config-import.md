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

Selector breadth is broader than the original direct-only baseline:

- `Include` is expanded in place, including relative globs
- wildcard / negated `Host` patterns can contribute defaults to concrete
  aliases without becoming imported profiles themselves
- `Match host ...` and `Match originalhost ...` can contribute supported
  profile fields for concrete aliases

Imported hosts become explicit saved remote profiles. Re-running the import is
idempotent by `Host` alias: an existing profile with the same name is updated
instead of duplicated.

## Intentionally unsupported

- `ProxyJump` / proxy chaining
- control socket / multiplexing directives
- broader `Match` criteria beyond `host` / `originalhost`
- agent/keychain integration
- password/passphrase handling
- two-way synchronization back into the user's SSH config
