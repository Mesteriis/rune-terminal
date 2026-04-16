# Approval Continuity Baseline

## Where pending approval is stored now

- Backend pending approvals and approval grants live only in the in-memory maps inside `core/toolruntime/approval.go`.
- The active AI panel keeps `/run` retry context only in `pendingRunApprovals` component state inside `frontend/app/aipanel/aipanel-compat.tsx`.
- The tools floating window keeps tool retry context only in `pendingApproval` component state inside `frontend/app/workspace/tools-floating-window.tsx`.

## How retry works now

- Initial execution returns `status:"requires_confirmation"` plus `pending_approval`.
- Frontend stores:
  - the backend `pending_approval`
  - the original execution request or `/run` command/context needed to replay it
- Confirm uses `safety.confirm` and receives `approval_token`.
- Retry replays the original request from component state with that `approval_token`.

## What breaks on reload or remount

- Closing or remounting the AI panel drops the stored `/run` request even if the backend pending approval still exists.
- Closing or remounting the tools window drops the stored tool request even if the backend pending approval still exists.
- If the component loses state after confirm starts, the retry path still depends on the local async closure that captured the request.
- A full frontend reload loses the local retry request.
- A core restart loses backend pending approvals and grants entirely because `core/toolruntime/approval.go` is in-memory only.
