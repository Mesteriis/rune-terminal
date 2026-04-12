# RunaTerminal System Prompt Profiles

## Position

System prompts are stored as structured profiles, not as ad-hoc strings embedded in UI state.

The system prompt subsystem has three layers:

1. prompt profile
2. role preset
3. work mode

The effective prompt is the ordered composition of those layers. The effective policy posture is the merged overlay of those same layers.

## Prompt Profiles

- `balanced`
  General-purpose engineering baseline.
- `hardened`
  Least-privilege baseline with stricter mutation posture.
- `ops-control`
  Operational baseline for runtime and service work.
- `review-strict`
  Read-heavy baseline for architecture and code review.

## Role Presets

Required built-ins:

- `developer`
- `devops`
- `sre`
- `secops`
- `architect`
- `reviewer`
- `release-manager`

Each role adds domain framing and may remove or add capabilities. Example: `reviewer` removes `terminal:input` and `policy:write`, while `secops` also disables trusted auto-approval.

## Policy Integration

The effective selection projects into the policy engine as:

- capability additions/removals
- mutation approval floor
- approval escalation
- trusted-rule auto-approval posture
- named security posture

This makes prompt selection observable, testable and audit-friendly.
