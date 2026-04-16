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
