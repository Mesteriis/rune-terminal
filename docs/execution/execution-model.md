# Execution Model

Date: `2026-04-17`
Phase: stability hardening

## What this document is

This is the canonical execution entrypoint for command/tool execution behavior.

## Core flow

1. User triggers explicit command intent (`/run <command>` or `run: <command>`).
2. Frontend sends tool execution through `POST /api/v1/tools/execute` (`term.send_input`).
3. Backend tool runtime applies schema decode, planning, policy checks, and approval handling.
4. If approval is required, backend returns `requires_confirmation` (`428`) and pending approval data.
5. Frontend confirms via `safety.confirm` (same tool execute route), receives approval token, retries unchanged intent.
6. Backend executes, writes audit, and explain flow can attach to resulting command output.

## Contract boundaries

- Approval is backend-issued and intent-bound (tool + normalized input + normalized context).
- Retry with changed intent is explicitly rejected (`approval_mismatch`).
- Audit is backend-written for blocked, confirm, and executed attempts.
- Structured execution blocks are a workflow layer over existing backend execution truth, not a second execution engine.

## APIs in active path

- `POST /api/v1/tools/execute`
- `POST /api/v1/agent/terminal-commands/explain`
- `GET /api/v1/execution/blocks`
- `GET /api/v1/execution/blocks/{id}`

## Current limits

- `/run` remains explicit grammar only.
- Execution target is active-widget/session scoped unless explicit target fields are provided.
- No generalized autonomous execution workflow is implemented today.

## Deep links

- Detailed contract: [../architecture/execution-contract.md](../architecture/execution-contract.md)
- Structured execution baseline: [history/structured-execution-baseline.md](./history/structured-execution-baseline.md)
- Structured execution regression baseline: [history/structured-execution-regression-baseline.md](./history/structured-execution-regression-baseline.md)
- Browser validation: [../validation/structured-execution-browser-validation.md](../validation/structured-execution-browser-validation.md)
