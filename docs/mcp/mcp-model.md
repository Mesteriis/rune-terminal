# MCP Model

Date: `2026-04-17`
Phase: stability hardening

## What this document is

This is the canonical MCP entrypoint for runtime lifecycle and usage rules.

## Core model

- MCP servers are runtime-managed resources in Go core.
- Lifecycle is explicit and stateful per server:
  - `stopped`, `starting`, `active`, `idle`, `stopped_auto`
- Registration and lifecycle actions are API-driven, not implicit background behavior.
- The active settings shell provides the narrow operator UI for remote server registration plus lifecycle controls; it is a view over the same backend registry, not a second frontend MCP registry.
- Backend onboarding helpers can expose a bounded template catalog and draft probe surface, but they remain operator-driven and do not auto-register or auto-invoke anything.
- Active onboarding can prefill bounded templates and auth-header helpers before registration, but the final register/start decision remains explicit.

## Usage rules

- MCP invocation is explicit (`POST /api/v1/mcp/invoke`).
- MCP output is normalized into bounded schema (`mcp.normalized.v1`).
- MCP output is not auto-injected into AI conversation context.
- AI usage of MCP results requires explicit operator action.

## Contract boundaries

- Startup does not auto-spawn all MCP servers.
- Idle auto-stop is runtime-owned and observable.
- In-flight invokes are protected from stop/restart interruption.

## Release-scope limits

- Current setup remains narrow and does not claim broad external MCP onboarding parity.
- No generalized discovery/catalog UX or broad provider matrix in this phase.

## Deep links

- MCP baseline model: [history/mcp-model-baseline.md](./history/mcp-model-baseline.md)
- Registration baseline: [history/mcp-registration-baseline.md](./history/mcp-registration-baseline.md)
- UI/usability baselines: [history/mcp-ui-baseline.md](./history/mcp-ui-baseline.md), [history/mcp-usability-result.md](./history/mcp-usability-result.md)
- Playground validation: [mcp-playground-validation.md](./mcp-playground-validation.md)
