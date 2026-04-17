# MCP Playground Validation

Date: `2026-04-16`  
Phase: `1.0.0-rc1` hardening

## Slice 1 — Real MCP setup (Context7)

### Real MCP chosen

- `Context7` (`@upstash/context7-mcp`)

### Real setup attempt (manual, existing system only)

1. verified standalone MCP process:
   - command: `npx -y @upstash/context7-mcp@latest`
   - observed: `Context7 Documentation MCP Server v2.1.8 running on stdio`
2. started `rterm-core` and listed MCP servers:
   - `GET /api/v1/mcp/servers`
   - observed list: only `mcp.example` in `stopped` state
3. attempted manual external MCP registration using existing HTTP surface:
   - `POST /api/v1/mcp/servers`
   - payload included:
     - `id: "mcp.context7"`
     - `endpoint_url: "https://mcp.context7.com/mcp"`
     - auth block (`bearer` placeholder)
   - observed response: `405 Method Not Allowed`
4. listed servers again:
   - `GET /api/v1/mcp/servers`
   - observed: still only `mcp.example` (`stopped`)

### Result

- Real external MCP process exists and starts standalone.
- Real user setup path to add it into current runtime was **not available** through existing MCP HTTP controls.
- Requirement check:
  - appears in MCP list: **FAILED**
  - initially stopped: only true for existing built-in `mcp.example`, not for added `Context7` (because add failed).

## Slice 2 — Lifecycle validation

### External MCP lifecycle (target: `mcp.context7`)

Manual lifecycle calls were executed against the target external ID:

- `POST /api/v1/mcp/servers/mcp.context7/start` -> `404 mcp_server_not_found`
- `POST /api/v1/mcp/servers/mcp.context7/stop` -> `404 mcp_server_not_found`
- `POST /api/v1/mcp/servers/mcp.context7/restart` -> `404 mcp_server_not_found`
- `POST /api/v1/mcp/servers/mcp.context7/enable` -> `404 mcp_server_not_found`
- `POST /api/v1/mcp/servers/mcp.context7/disable` -> `404 mcp_server_not_found`

Because external setup failed in Slice 1, lifecycle transitions for real external MCP were not reachable.

### Runtime control check (built-in control only)

To confirm lifecycle endpoints themselves still work on existing registered server:

- `mcp.example/start` -> `idle + active:true`
- `mcp.example/stop` -> `stopped + active:false`
- `mcp.example/restart` -> `idle + active:true`
- `mcp.example/disable` -> `enabled:false`
- `mcp.example/enable` -> `enabled:true`

Basic stability observation during this cycle:

- `rterm-core` RSS before/after cycle: `12528 KB -> 13008 KB`
- no crash observed

### Result

- External MCP lifecycle validation: **FAILED** (server not registered in runtime)
- Lifecycle API behavior on existing registered server: **WORKS**

## Slice 3 — Invocation validation

### External MCP invocation (target: `mcp.context7`)

- `POST /api/v1/mcp/invoke` with real query payload (`react useeffect`) and `server_id: "mcp.context7"` -> `404 mcp_server_not_found`

Because external MCP registration is not available in current runtime surface, direct invocation of `Context7` was not reachable.

### Invocation control check (registered MCP path)

To validate invocation pipeline behavior itself, invoke was tested on registered `mcp.example`:

- request: `POST /api/v1/mcp/invoke` with payload `{"text":"Context7 API usage examples"}`
- observed output:
  - `format: "mcp.normalized.v1"`
  - `payload_type: "object"`
  - `truncated: false`
  - `original_bytes: 134`
- response contained normalized structured fields (`object_fields`), not a raw unbounded dump.

### Result

- External MCP invocation: **FAILED** (server not registered)
- Invocation pipeline normalization/bounding on registered path: **WORKS**

## Slice 4 — Failure path validation

### Invalid endpoint / missing key (external add path)

Because external add API is not exposed in current runtime:

- `POST /api/v1/mcp/servers` with invalid endpoint payload -> `405 Method Not Allowed`
- `POST /api/v1/mcp/servers` with missing auth payload -> `405 Method Not Allowed`

The system returns explicit method-level failure and does not crash.

### Large response scenario

To validate response bounding on real invoke path:

- request: `POST /api/v1/mcp/invoke` with `server_id:"mcp.example"` and `payload.text` size `20000`
- observed bounded output:
  - `format: "mcp.normalized.v1"`
  - `payload_type: "non_json"`
  - `truncated: true`
  - `original_bytes: 20110`
  - notes include: `payload clipped to max bytes`
- size observation:
  - full invoke response: `516` bytes
  - `.output` block: `480` bytes

### Stability observation

- `GET /healthz` stayed `{"status":"ok"}`
- core process remained running (`state: S`) after failure-path checks
- no `context7-mcp` background process remained running after validation calls

### Result

- invalid endpoint / missing key: explicit error behavior present (`405`)
- large response: bounded/truncated safely
- crash/hang path in this run: **NOT OBSERVED**

## Slice 5 — Workflow integration

### MCP result usage in AI (explicit only)

This slice was run with real model endpoint `http://192.168.1.2:11434` using `RTERM_OLLAMA_MODEL=llama3.2:3b`.

Steps and observations:

1. conversation message count before invoke:
   - `GET /api/v1/agent/conversation` -> `0`
2. explicit MCP invoke:
   - `POST /api/v1/mcp/invoke` (`server_id:"mcp.example"`, payload text `workflow explicit handoff check`)
3. conversation message count after invoke:
   - `GET /api/v1/agent/conversation` -> `0`
   - no auto-injection from MCP invoke into conversation
4. explicit manual handoff to AI:
   - `POST /api/v1/agent/conversation/messages` with prompt containing MCP result text -> HTTP `200`
5. conversation message count after manual AI submit:
   - `GET /api/v1/agent/conversation` -> `2` (user + assistant)
   - assistant status: `complete`

### Result

- explicit usage only: **WORKS**
- no automatic MCP context injection: **WORKS**
- bounded MCP output remained explicit/manual for AI usage: **WORKS**
