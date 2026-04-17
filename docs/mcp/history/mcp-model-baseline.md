# MCP Runtime Model Baseline

Date: `2026-04-16`
Phase: `1.0.0-rc1` hardening

## Goal

Define MCP servers as controlled runtime resources with explicit lifecycle boundaries.

## Core model

- An MCP server is a process owned by the Go core runtime.
- MCP processes are lifecycle-managed resources, not passive integrations.
- MCP availability is never implicit or global by default.

## Lifecycle states

The runtime tracks one state per MCP server:

- `stopped`: process is not running.
- `starting`: process launch has been requested and is in progress.
- `active`: process is running and currently serving explicit MCP work.
- `idle`: process is running but has no in-flight work.
- `stopped_auto`: process was stopped by idle timeout policy.

`stopped` and `stopped_auto` are both non-running states; `stopped_auto` exists for observability and operator control.

## Activation rules

- Activation is explicit.
- MCP servers are not auto-loaded on core startup.
- MCP servers are not auto-spawned from generic prompts.
- Optional on-demand start is allowed only for an explicit MCP action.

## Context rules

- MCP responses are not injected into agent context automatically.
- Context inclusion of MCP output must be explicit and bounded.
- MCP response payloads must be adapted to minimal context-safe shapes before reuse.

## Non-goals in this slice

- No MCP discovery catalog.
- No persistence of runtime process state.
- No broad UI redesign.
- No uncontrolled background spawning.
