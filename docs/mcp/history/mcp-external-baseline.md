# MCP external baseline

Date: `2026-04-16`  
Phase: `1.0.0-rc1` hardening

## How external MCP responds today

Current runtime MCP invoke path is explicit (`POST /api/v1/mcp/invoke`) and lifecycle-gated, but output handling is still weak for external integration safety:

- `mcp.example` can be started/stopped/enabled/disabled explicitly.
- invoke returns:
  - `server_id`
  - `output` (currently raw/opaque from invoker path)
  - optional `context` (bounded through adapter when `include_context=true`)

Observed live baseline (`mcp.example`, explicit start + invoke):

- `output`: `{}` (opaque placeholder in current default wiring)
- full invoke response size: `117` bytes
- context payload size: `3` bytes (`{}`)

## Typical response size profile

From current baseline behavior:

- small payloads are currently common (`{}` / tiny objects).
- bounded context path is already size-limited.
- raw `output` path has no dedicated normalization contract yet, so real external MCP payload size can vary widely once richer invokers are wired.

## Mismatch with current execution model

Current execution model expects controlled, structured, policy-visible data paths. External MCP output currently mismatches this in key ways:

- output shape is not normalized into a stable internal schema.
- output can be semantically opaque for tools/agent reuse.
- context path is bounded, but output path is not explicitly modeled as untrusted external data.

## Risks

- large payload:
  - external MCP may return oversized payloads that are expensive to render/process.
- inconsistent schema:
  - top-level shape/field meanings can vary by server and call.
- irrelevant data:
  - debug/noise/nested blobs can dominate useful signal and inflate context.
