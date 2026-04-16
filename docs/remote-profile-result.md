# Remote Profile Result

Date: `2026-04-16`

## 1. Profile model that exists now

Saved remote connection profiles are backend-owned and map to the SSH launch contract:

- `id`
- `name`
- `host`
- `user` (optional)
- `port` (optional)
- `identity_file` (optional path reference)
- `description` (derived as `user@host` when listed)

## 2. What is persisted

- profile identity and SSH target fields listed above
- profile list across restarts via the existing connection state persistence path
- create/list/delete behavior through explicit APIs:
  - `GET /api/v1/remote/profiles`
  - `POST /api/v1/remote/profiles`
  - `DELETE /api/v1/remote/profiles/{profileID}`
- profile-to-session launch path:
  - `POST /api/v1/remote/profiles/{profileID}/session`

## 3. What is NOT persisted

- passwords, passphrases, private key material, agent tokens, or any other secret values
- per-session runtime state (`pid`, output chunks, launch status, check status)
- approval tokens or transient `/run` execution context

## 4. SSH config import status

No `~/.ssh/config` import is implemented in this batch.

Future narrow scope (if enabled) is documented in `docs/remote-ssh-config-import.md` and limited to:

- `Host`
- `HostName`
- `User`
- `Port`
- `IdentityFile`

## 5. Intentionally unsupported after this batch

- keychain/credential manager integration
- full SSH config semantics (`Match`, `Include`, `ProxyJump`, advanced wildcard behavior)
- connection pooling/multiplexing
- broad SSH manager UI beyond minimal saved-profile usability
