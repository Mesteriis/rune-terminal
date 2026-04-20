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

- the frontend (`frontend/src/`) is being rewritten and currently runs
  against mocks / fake clients in several widgets
- the Tauri shell ships with `csp: null` today and must be tightened
  before any public release
- SSE for the terminal stream accepts the auth token via query parameter
  (ADR 0018 MVP tradeoff); migration to header-based auth is planned

Sensitive areas currently include:

- terminal execution
- remote/SSH launch paths
- policy and approval flows
- secret-protection / ignore-rule behavior
- local loopback transport between Tauri and Go core

When reporting issues in these areas, note whether the issue affects:

- confidentiality
- integrity
- availability
- auditability
