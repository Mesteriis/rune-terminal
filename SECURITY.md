# Security Policy

## Reporting a vulnerability

Please do **not** report security vulnerabilities through public GitHub issues.

Report security issues privately to:

- `security@runa-terminal.dev`

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

RunaTerminal is still in an active foundation phase.
Some subsystems, especially remote/SSH and AI-related flows, are evolving.
Please assume interfaces and guarantees may tighten over time.

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
