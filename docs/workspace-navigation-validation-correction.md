# Workspace Navigation Validation Correction

Date: `2026-04-16`
Scope: corrective slice for validation truth only

## Reconstructed failing script assertion

The previously reported traceback was reproduced with the original workspace-navigation validation script shape.

Observed traceback:

```text
Traceback (most recent call last):
  File "<stdin>", line 130, in <module>
AssertionError
```

Failing assertion at line 130:

```python
mcp_servers = request("GET", "/api/v1/mcp/servers")
assert isinstance(mcp_servers, list)
```

## Actual response payload shape

Actual `GET /api/v1/mcp/servers` response is:

```json
{
  "servers": [
    {
      "id": "mcp.example",
      "state": "stopped",
      "last_used": "0001-01-01T00:00:00Z",
      "active": false,
      "enabled": true
    }
  ]
}
```

So the top-level value is an object with a `servers` array, not an array itself.

## Root cause classification

- Classification: `stale validation script drift` (script expected an outdated response shape).
- Not a runtime filesystem/terminal/MCP behavior bug.
- Not a new workspace-navigation feature gap.

## Strict corrective boundary

- no new workspace/file features
- no UI redesign
- no broad cleanup/refactor
- only validation contract correction and truthful validation log update

## Canonical validation script (single source)

- Canonical script: `python3 scripts/validate_workspace_navigation.py`
- Script contract checks:
  - `GET /api/v1/fs/list`
  - `GET /api/v1/fs/read`
  - `POST /api/v1/agent/conversation/attachments/references`
  - `POST /api/v1/agent/conversation/messages` (with explicit attachment)
  - `/run`-equivalent via `POST /api/v1/tools/execute` + `POST /api/v1/agent/terminal-commands/explain`
  - `GET /api/v1/mcp/servers` (expects object with `servers` array)
  - `GET /api/v1/remote/profiles` (expects object with `profiles` array)

## Clean canonical run result

- Date: `2026-04-16`
- Command: `python3 scripts/validate_workspace_navigation.py`
- Exit code: `0`
- Result summary:
  - `fs_list`: `ok`
  - `fs_read`: `ok`
  - `attachment_reference`: `ok`
  - `conversation_with_attachment`: `ok`
  - `run_equivalent_file_path_flow`: `ok`
  - `mcp_servers_regression_shape`: `ok`
  - `remote_profiles_regression_shape`: `ok`
- Scope note: remote coverage in this script is endpoint regression-only (no remote session launch).
