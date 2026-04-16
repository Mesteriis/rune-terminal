# MCP Usability Result

Date: `2026-04-16`
Phase: `1.0.0-rc1` hardening

## What operators can do now

- Open MCP controls from the existing `Tools` floating window (no new shell surface).
- See MCP servers from backend runtime truth:
  - `id`
  - runtime state (`active`, `idle`, `stopped`, `disabled`)
  - `last_used` (when available)
- Run explicit lifecycle actions per server:
  - `start`
  - `stop`
  - `restart`
  - `enable`
  - `disable`
- Run explicit manual MCP invoke from UI:
  - choose server ID
  - provide JSON payload
  - opt into `allow on-demand start`
  - view invoke result/error in the same Tools panel

## Intentionally missing in this batch

- No MCP dashboard or shell redesign.
- No registry/discovery UI.
- No bulk server operations.
- No auto-start/auto-load toggles.
- No implicit MCP integration in agent flows.

## Control guarantees

- MCP remains explicit and operator-controlled from UI actions.
- No hidden auto-loading or background spawn loop was added.
- MCP invoke remains explicit; no prompt-driven implicit activation path was added.
- MCP invoke output is not auto-injected into agent context.
- Context returned from invoke stays bounded through the existing adapter path and remains visible in explicit invoke output only.
