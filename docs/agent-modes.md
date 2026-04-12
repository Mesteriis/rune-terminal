# RunaTerminal Agent Modes

## Position

Work modes are a policy-bearing execution posture, not a UI label and not a free-form prompt suffix.

Work modes are intentionally transient. They answer "what kind of work is happening right now?" rather than "what kind of operator is this agent overall?".

Each mode contributes three things:

- prompt guidance
- capability overlay
- approval/security posture

## Built-in Modes

- `explore`
  Read-heavy discovery mode. Removes `terminal:input` and `policy:write`.
- `implement`
  Normal implementation mode. Keeps baseline capabilities.
- `review`
  Mutation-averse review mode. Removes mutating capabilities and disables trusted auto-approve.
- `debug`
  Interactive debugging mode. Keeps terminal access but raises mutation posture to at least `moderate`.
- `ops`
  Operational maintenance mode. Keeps operator capabilities under audit.
- `incident`
  Incident response mode. Keeps terminal access while enforcing at least `moderate` mutation posture.
- `secure`
  Hardened security mode. Removes `terminal:input`, raises mutation posture to `dangerous`, disables trusted auto-approve.
- `release`
  Controlled release mode. Removes casual terminal mutation and disables trusted auto-approve.

## Why Modes Exist In Core

Modes must influence the same policy pipeline that guards tools. If they only changed prompt text, the system would drift into security theater.

## Persistence

The active mode is stored in `agent-state.json` alongside the active prompt profile and role preset.

## Management Surface

Modes are transport-accessible through:

- `GET /api/v1/agent`
  Lists profiles, roles, modes and the active selection.
- `PUT /api/v1/agent/selection/mode`
  Sets the active mode using `{"id":"<mode-id>"}`.

The same catalog response includes the effective merged policy profile so transport and UI can observe the actual posture instead of guessing from labels.
