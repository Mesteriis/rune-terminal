# Structured Execution Baseline

Date: `2026-04-17`  
Phase: `1.0.0-rc1` release hardening

## 1. What currently exists

- Terminal execution is already live through explicit `/run <command>` (and `run:` alias) in the AI panel.
- Command execution truth is backend-owned through `POST /api/v1/tools/execute` with `term.send_input`.
- Approval/confirm/retry semantics are backend policy-driven and auditable.
- Explain is already explicit and backend-owned through `POST /api/v1/agent/terminal-commands/explain`.
- Audit/provenance already records tool execution and explain events with target/session context.
- UI currently renders `/run` as transcript messages plus approval cards, not as a distinct execution-block surface.

## 2. What “structured execution block” means in this repo now

A structured execution block is a bounded operator-facing record layered on top of existing execution truth. It is not a new execution engine. For this repo, it should:

- represent one explicit command execution intent (`/run` command)
- show execution state/result grounded in backend execution and terminal output truth
- carry explain linkage/result from the existing explain route
- carry provenance linkage to audit identity/session target context
- coexist with current terminal and transcript flows

## 3. Wave/TideTerm behavior targeted in this batch

- Explicit command/result units that are easier to scan than raw mixed transcript.
- Block-level operator actions (explain, rerun, audit/provenance access) without hidden automation.
- Recognizable block-oriented workflow layer while preserving current Runa backend ownership boundaries.

## 4. Explicitly out of scope

- full IDE behavior
- full notebook/block editor
- terminal replacement
- massive UI redesign

## Execution block model

Minimal backend-owned block shape for this batch:

- `id`, `created_at`, `updated_at`
- `intent`:
  - `prompt`
  - `command`
- `target`:
  - `workspace_id`
  - `widget_id`
  - `repo_root`
  - `target_session`
  - `target_connection_id`
- `result`:
  - `state` (`executed` or `failed`)
  - `output_excerpt`
  - `from_seq`
- `explain`:
  - `state` (`available` or `failed`)
  - `message_id`
  - `summary`
  - `error`
- `provenance`:
  - `command_audit_event_id`
  - `explain_audit_event_id`

Model constraints:

- backend snapshot/store is the source of truth for block records
- block records link to existing execution/explain/audit truth; they do not replace it
- block records are a bounded workflow layer, not a full terminal history/event store

### API surface in this batch

- `POST /api/v1/agent/terminal-commands/explain`
  - continues existing explain behavior
  - appends one execution block for this `/run` explain flow when no `execution_block_id` is supplied
  - updates the existing block when `execution_block_id` is supplied and identity matches
  - returns `execution_block_id`, resolved `command_audit_event_id`, and `explain_audit_event_id`
- `GET /api/v1/execution/blocks?workspace_id=<id>&limit=<n>`
  - returns backend block snapshot list
- `GET /api/v1/execution/blocks/{blockID}`
  - returns one backend block snapshot entry
