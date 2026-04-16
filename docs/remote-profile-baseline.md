# Remote Profile Baseline

Date: `2026-04-16`

## 1. Fields currently needed to open a remote SSH session

Current remote tab/session creation is connection-ID based:

- `connection_id` (SSH connection entry ID)

The underlying SSH entry currently carries:

- `host` (required)
- `name` (optional, defaults to host)
- `user` (optional)
- `port` (optional)
- `identity_file` (optional path reference)

No secret material is stored in the runtime state for this path.

## 2. Fields that belong in a reusable saved profile

For this batch, reusable remote profile fields should be:

- `id`
- `name`
- `host`
- `port` (optional)
- `user` (optional)
- `identity_file` (optional path reference)
- `description` (optional, derived or explicit label only)

Runtime/transient status (`check_status`, `launch_status`, timestamps, errors) stays runtime-owned and is not profile identity.

## 3. Out of scope for this batch

- keychain/credential manager integration
- secret/password/private-key storage in profile state
- advanced SSH config semantics (`Match`, `Include`, `ProxyJump`, etc.)
- connection pooling/multiplexing

## 4. Minimal saved profile shape for this batch

```json
{
  "id": "profile_xxx",
  "name": "Prod",
  "host": "prod.example.com",
  "user": "deploy",
  "port": 22,
  "identity_file": "~/.ssh/id_ed25519",
  "description": "deploy@prod.example.com"
}
```

This shape is intentionally narrow and maps directly to the existing SSH launch path.
