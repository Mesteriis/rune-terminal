# Approval Intent Binding Result

## What changed

- The backend now computes a stable execution-intent binding from:
  - `tool_name`
  - normalized decoded tool `input`
  - normalized execution `context`
- Pending approvals and approval grants carry that binding internally in `core/toolruntime/approval.go`.
- Retry verification now compares the retried request against the approved intent instead of matching `tool_name` alone.
- A mismatched retry is rejected explicitly with HTTP `403`, `status:"error"`, and `error_code:"approval_mismatch"`.
- Frontend client types now recognize `approval_mismatch` as a structured tool-execute error.

## What contract is now enforced

- `safety.confirm` issues approval only for the exact execution intent that produced the approval challenge.
- A valid approval token can approve only the matching retry request.
- Changing the tool input or execution context on retry does not silently reuse approval.
- A mismatched retry does not consume the token for the original approved intent.
- The original matching retry can still succeed after a failed mismatched attempt, as long as the token remains unexpired.

## What remains intentionally deferred

- Approval persistence or resume across frontend reloads or backend restarts.
- Any approval UX redesign or new approval-management surface.
- Additional approval fields in the public `pending_approval` response.
- Remote-execution, plugin-process, or broader policy-model changes.

## Frontend compatibility

- The existing tools panel confirm-and-retry flow remained compatible.
- The active compat AI-panel `/run` confirm-and-retry flow remained compatible.
- No approval UI redesign was required for this hardening slice.
