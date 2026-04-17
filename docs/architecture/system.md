# System Architecture

Date: `2026-04-17`
Phase: `1.0.0-rc1` hardening

## What this document is

This is the canonical architecture entrypoint for the current system.
It defines the runtime ownership model and links to deeper architecture docs.

## Runtime ownership model

- Go core owns product/runtime truth: workspace, terminal, execution, policy, audit, remote, MCP, plugins.
- Transport is an adapter (`HTTP`/`SSE`), not the product model.
- Tauri owns desktop shell/process boundary only.
- Frontend composes UI surfaces and consumes backend state/contracts.

## Layer boundaries

1. `frontend` (React/TypeScript):
   - shell/UI composition
   - operator interaction surfaces
   - explicit action routing to backend APIs
2. `apps/desktop` (Tauri):
   - windowing/bootstrap
   - local runtime discovery
3. `core` + `cmd/rterm-core` (Go):
   - all domain semantics and durable runtime truth

## Core invariants

- Execution is policy-gated and audit-backed.
- Approval is backend-owned (`safety.confirm` + intent-bound retry).
- Workspace/tab/widget/layout state is backend-owned and persisted.
- Terminal sessions are widget-scoped and connection-aware (`local`/`ssh`).
- MCP and plugin execution are explicit runtime resources, never implicit background behavior.

## Deep links

- Architecture baseline: [architecture.md](./architecture.md)
- Domain entities: [domain-model.md](./domain-model.md)
- Execution contract: [execution-contract.md](./execution-contract.md)
- Runtime invariants: [current-behavior.md](./current-behavior.md)
- ADRs: [adr/](./adr)
