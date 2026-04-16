# Plugin Boundary Verification

Date: `2026-04-16`

Scope:

- code inspection against the current execution path
- no runtime or behavior changes
- verification against the future separate-process plugin model defined in `docs/plugin-execution-model.md`

## 1. No hidden shared state assumptions

Status: `PARTIAL`

- `MATCHES`
  - execution truth is backend-owned through `POST /api/v1/tools/execute` and `core/toolruntime.Executor`
  - approval truth is backend-owned through `core/policy`, `core/toolruntime/approval.go`, and `safety.confirm`
  - explain approval truth is backend-derived from audit in `core/app/ai_terminal_command.go`
  - audit truth is backend-owned through `core/audit/log.go` and `/api/v1/audit`
- `PARTIAL`
  - pending approval retry continuity for the current AI panel and tools window is still held in frontend in-memory maps in `frontend/app/approval/continuity.ts`
  - a full frontend reload drops that retry context even though the already-executed backend truth remains intact

Conclusion:

- The current system does not depend on frontend memory to decide whether execution happened, whether approval was valid, or what audit was written.
- It still depends on frontend memory for one part of the user interaction flow: reusing a pending approval challenge after remount or reload.

## 2. Tool runtime compatibility

Status: `PARTIAL`

- `MATCHES`
  - tool contracts are explicit in `core/toolruntime/types.go`:
    - metadata
    - schemas
    - plan
    - execute
    - execution context
  - transport already treats tool execution as a stable backend surface through:
    - `GET /api/v1/tools`
    - `POST /api/v1/tools/execute`
  - policy, approval, and audit wrap execution from the outside instead of being hidden inside tool handlers
- `PARTIAL`
  - actual tool handlers are still in-process closures over `*app.Runtime` services such as `r.Terminals`, `r.Workspace`, `r.Policy`, and `r.Executor`
  - the registry in `core/toolruntime/registry.go` is in-process only; there is no current external provider registration seam
  - the current tool request context carries `workspace_id`, `repo_root`, and `active_widget_id`, while role/mode come from the backend agent store rather than the tool request itself

Conclusion:

- The runtime already has an explicit execution wrapper that can conceptually sit in front of plugin processes.
- Current tool implementations are not process-boundary-ready by themselves; externalization would require explicit adapters rather than reusing today's closures unchanged.

## 3. Approval integrity

Status: `MATCHES`

- `MATCHES`
  - approval is enforced in the core before tool execution in `core/toolruntime/executor_prepare.go` and `core/policy/stage_approval.go`
  - confirmation is core-owned through `safety.confirm` in `core/app/tool_policy.go`
  - approved retry validation is core-owned and intent-bound in `core/toolruntime/approval.go` and `core/toolruntime/intent.go`
  - mismatched retry is rejected before handler execution in `core/toolruntime/executor.go`
  - the frontend does not decide whether approval is required and cannot self-issue approval
- `VIOLATES`
  - none observed

Conclusion:

- The current approval model already matches the future plugin boundary requirement that approval be enforced before execution and not depend on UI trust.

## 4. Audit integrity

Status: `MATCHES`

- `MATCHES`
  - tool execution audit is appended by the backend in `core/toolruntime/executor_audit.go`
  - explain audit is appended by the backend in `core/app/ai_terminal_command.go`
  - audit persistence is backend-owned JSONL in `core/audit/log.go`
  - the frontend only reads audit through `GET /api/v1/audit`
  - the current explain flow already ignores frontend-supplied `approval_used` and derives it from backend audit truth
- `VIOLATES`
  - none observed

Conclusion:

- The current system already satisfies the future plugin requirement that audit remains backend-driven and cannot be forged by the frontend.

## 5. Identify violations

- Frontend approval retry continuity across a full reload: `PARTIAL`
  - execution truth remains backend-owned, but the active retry UI context is still frontend-memory-only
- Tool handler implementation independence from in-process services: `PARTIAL`
  - the runtime wrapper is explicit, but current tool handlers still close over in-process runtime services
- Approval ownership before execution: `MATCHES`
  - the current system already enforces this in the core
- Audit ownership after execution: `MATCHES`
  - the current system already enforces this in the core
- Hard violation of the future separate-process plugin boundary: `VIOLATES: none observed`
