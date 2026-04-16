# RunaTerminal Policy Model

## Goals

The policy model exists to make tool execution:

- safe
- explicit
- auditable
- low-friction for repeated trusted actions

## Core Concepts

## Capabilities

Capabilities remain explicit even in a single-user desktop app.

Examples:

- `workspace:read`
- `widget:focus`
- `terminal:read`
- `terminal:input`
- `policy:read`
- `policy:write`
- `audit:read`

## Approval Tiers

- `safe`
- `moderate`
- `dangerous`
- `destructive`

`dangerous` and `destructive` actions require confirmation unless a trusted rule can safely reduce friction. `destructive` operations never become silent.
Approval grants are single-use and intent-bound: confirming an approval consumes the pending approval record, and the returned approval token can approve only the matching execution intent on its first successful verification attempt.

Role presets, work modes and system prompt profiles can raise the effective approval tier for a mutation or disable trusted auto-approval entirely.

## Trusted Rules

Trusted rules support:

- scopes: `global`, `workspace`, `repo`
- matcher types: `exact`, `glob`, `regex`, `structured`
- revocation through explicit deletion
- audit trail on both mutation and use

The tool contract for trusted-rule mutation is explicit:

- `safety.add_trusted_rule` requires `scope`, `subject_type`, and `matcher_type`
- non-`structured` matcher types require `matcher`
- `structured` matcher types require `structured`

## Ignore Rules

Ignore rules protect secret-bearing or restricted paths.

Default protected patterns:

- `.env`
- `.env.*`
- `secrets.*`
- `*.pem`
- `*.key`
- `*.p12`
- `id_rsa`
- `id_ed25519`

Modes:

- `deny`
- `metadata-only`
- `redact`

Default mappings:

- `.env`, `.env.*`, `secrets.*` -> `metadata-only`
- `*.pem`, `*.key`, `*.p12`, `id_rsa`, `id_ed25519` -> `deny`

The tool contract for ignore-rule mutation is explicit:

- `safety.add_ignore_rule` requires `scope`, `matcher_type`, `pattern`, and `mode`
- `matcher_type` is limited to `exact`, `glob`, or `regex`
- `mode` is limited to `deny`, `metadata-only`, or `redact`

## Allowed Roots

Allowed roots constrain path-based tools to the current repo or explicitly trusted locations. The repo root is seeded into the default policy state, but future file tools still need explicit path planning.

## Evaluation Pipeline

The policy engine is intentionally decomposed into explicit stages:

1. capability stage
2. allowed roots stage
3. ignore rule stage
4. trusted rule stage
5. approval stage

This keeps decisions explainable and lets role/mode overlays slot into the pipeline without turning policy into a giant branching function.

Operational precedence matters:

- capability failures are hard denials
- outside-root access is confirmable
- `deny` ignore rules win before trusted-rule auto-approval
- trusted rules can reduce approval friction only after the earlier boundary checks pass

## Audit

All mutating or approval-sensitive tool executions are logged to a JSONL audit stream with enough context to reconstruct:

- what was attempted
- which prompt profile, role and mode were active
- who approved it
- what rule matched
- whether it succeeded
