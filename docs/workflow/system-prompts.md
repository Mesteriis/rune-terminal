# rune-terminal System Prompt Profiles

## Position

System prompts are stored as structured profiles, not as ad-hoc strings embedded in UI state.

The system prompt subsystem has three layers:

1. prompt profile
2. role preset
3. work mode

The effective prompt is the ordered composition of those layers. The effective policy posture is the merged overlay of those same layers.

## Prompt Profiles

- semantic role:
  baseline system contract and default security posture for the session
- `balanced`
  General-purpose engineering baseline.
- `hardened`
  Least-privilege baseline with stricter mutation posture.
- `ops-control`
  Operational baseline for runtime and service work.
- `review-strict`
  Read-heavy baseline for architecture and code review.

## Role Presets

- semantic role:
  durable professional responsibility lens such as developer, reviewer, or secops
Required built-ins:

- `developer`
- `devops`
- `sre`
- `secops`
- `architect`
- `reviewer`
- `release-manager`

Each role adds domain framing and may remove or add capabilities. Example: `reviewer` removes `terminal:input` and `policy:write`, while `secops` also disables trusted auto-approval.

## Work Modes

- semantic role:
  current execution posture for the active task, such as explore, implement, or release
- modes are more transient than roles
- modes may harden or relax approvals even when the role stays the same

## Policy Integration

The effective selection projects into the policy engine as:

- capability additions/removals
- mutation approval floor
- approval escalation
- trusted-rule auto-approval posture
- named security posture

This makes prompt selection observable, testable and audit-friendly.

## Management API

Minimal management is exposed over HTTP:

- `GET /api/v1/agent`
  Returns all available prompt profiles, role presets, work modes, and the active selection.
- `PUT /api/v1/agent/selection/profile`
- `PUT /api/v1/agent/selection/role`
- `PUT /api/v1/agent/selection/mode`

Each `PUT` request takes `{"id":"<selection-id>"}` and returns the updated catalog with the effective prompt and effective policy overlay.

The same catalog is surfaced in the desktop UI so the visible selection state, effective prompt preview, and policy posture stay aligned with the backend source of truth.
