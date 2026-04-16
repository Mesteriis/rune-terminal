# Dangerous Tool Schema Baseline

## Current weak schemas

- `safety.add_trusted_rule`
  - current `InputSchema`: generic `{"type":"object"}`
- `safety.add_ignore_rule`
  - current `InputSchema`: generic `{"type":"object"}`

## Why these matter

- Both tools are `policy:write` mutations.
- Both are `dangerous` approval-tier operations.
- Both change long-lived approval/protection state.

## Missing schema fields

- `safety.add_trusted_rule` is missing explicit schema for:
  - `scope`
  - `scope_ref`
  - `subject_type`
  - `matcher_type`
  - `matcher`
  - `structured`
  - `note`
  - required-field and enum constraints
- `safety.add_ignore_rule` is missing explicit schema for:
  - `scope`
  - `scope_ref`
  - `matcher_type`
  - `pattern`
  - `mode`
  - `note`
  - required-field and enum constraints

## Slice boundary

- No tool UX redesign
- No new tools
- No approval redesign
