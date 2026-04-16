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
