# Security Policy

## Reporting a vulnerability

Please do **not** report security vulnerabilities through public GitHub issues.

Report security issues privately to:

- `security@rune-terminal.dev`

Include as much detail as possible:

- affected version or commit
- environment
- reproduction steps
- impact assessment
- any suggested mitigation

## Response expectations

The project will try to:

- acknowledge receipt in a reasonable timeframe
- investigate the issue privately
- coordinate a fix before public disclosure where appropriate

## Current security posture notes

rune-terminal is pre-release and still in an active foundation phase.
Some subsystems, especially remote/SSH and AI-related flows, are evolving.
Please assume interfaces and guarantees may tighten over time.

Additional pre-release caveats:

- the frontend (`frontend/src/`) is being rewritten; several widgets are still
  intentionally narrower than the final product surface
- the Tauri shell now uses an explicit local-runtime CSP, but every CSP change
  still needs build/config validation and, for UI changes, a fresh desktop smoke
- the active terminal stream path uses bearer-header auth; query-token auth
  remains available only as the constrained ADR 0018 fallback for clients that
  cannot send headers
- plugins are local child processes, not OS-sandboxed code; plugin environment
  variables must be passed explicitly, but plugin binaries still run with the
  operating-system permissions of the current user

Sensitive areas currently include:

- terminal execution
- remote/SSH launch paths
- plugin process execution
- policy and approval flows
- secret-protection / ignore-rule behavior
- local loopback transport between Tauri and Go core

When reporting issues in these areas, note whether the issue affects:

- confidentiality
- integrity
- availability
- auditability
