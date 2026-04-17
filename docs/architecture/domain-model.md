# RunaTerminal Domain Model

## Core Entities

## Workspace

A workspace is the durable interaction surface presented to the user.

Fields:

- `id`
- `name`
- `widgets`
- `active_widget_id`

Responsibilities:

- list widgets
- expose the current active widget
- accept focus changes

## Widget

A widget is a typed workspace element. In the MVP, widgets are terminal-backed.

Fields:

- `id`
- `kind`
- `title`
- `description`
- `terminal_id` for terminal widgets

Future widget kinds can include file explorer, diff, preview or AI conversation panes, but the workspace service only manages generic widget metadata and focus semantics.

## TerminalSession

A terminal session is a runtime object owned by the terminal service.

Fields:

- `widget_id`
- `session_id`
- `shell`
- `pid`
- `status`
- `started_at`
- `last_output_at`
- `exit_code`

Responsibilities:

- start PTY-backed processes
- accept input
- send interrupts
- publish output chunks
- expose current state

## ToolDefinition

The tool runtime works with typed definitions rather than ad-hoc callbacks.

Fields:

- `name`
- `description`
- `input_schema`
- `output_schema`
- `capabilities`
- `approval_tier`
- `mutating`
- `target_kind`

Responsibilities:

- decode input
- declare operational intent as an `Operation`
- execute against the domain services

## Operation

The normalized execution unit shared across planning, transport responses and audit context.

Fields:

- `summary`
- `affected_paths`
- `affected_widgets`
- `required_capabilities`
- `approval_tier`

## TrustedRule

Represents an approval-memory rule.

Fields:

- `id`
- `scope`
- `scope_ref`
- `subject_type`
- `matcher_type`
- `matcher`
- `structured`
- `enabled`

## IgnoreRule

Represents secret and restricted-path protection.

Fields:

- `id`
- `scope`
- `scope_ref`
- `matcher_type`
- `pattern`
- `mode`
- `enabled`

Default secret posture is split:

- `.env`, `.env.*`, `secrets.*` -> `metadata-only`
- `*.pem`, `*.key`, `*.p12`, `id_rsa`, `id_ed25519` -> `deny`

## PromptProfile

Built-in system prompt baseline with policy overlay.

Fields:

- `id`
- `name`
- `description`
- `system_prompt`
- `overlay`

## RolePreset

Task-domain posture that affects both prompt framing and policy overlay.

Fields:

- `id`
- `name`
- `description`
- `prompt`
- `overlay`

## WorkMode

Execution posture for the current task slice.

Fields:

- `id`
- `name`
- `description`
- `prompt`
- `overlay`

## AuditEvent

Immutable record of a tool execution or safety-sensitive action.

Fields:

- `id`
- `tool_name`
- `summary`
- `workspace_id`
- `prompt_profile_id`
- `role_id`
- `mode_id`
- `security_posture`
- `approval_tier`
- `effective_approval_tier`
- `trusted_rule_id`
- `ignore_rule_id`
- `affected_paths`
- `affected_widgets`
- `success`
- `error`
- `timestamp`

## Approval

Approvals are intentionally explicit.

Two related objects exist:

- `PendingApproval`
  Created when a tool requires confirmation.
- `ApprovalGrant`
  Short-lived token produced by `safety.confirm` and consumed on retry.
