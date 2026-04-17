# Remote Model

Date: `2026-04-17`
Phase: `1.0.0-rc1` hardening

## What this document is

This is the canonical remote entrypoint for local-vs-SSH runtime behavior.

## Core model

- Remote is implemented as connection-aware terminal sessions, not a separate remote controller runtime.
- Connection catalog is backend-owned and includes:
  - built-in `local`
  - saved SSH profiles
  - one active default target for new tabs
- Widgets bind to `connection_id`; sessions stay bound after creation.

## Runtime semantics

- Local and SSH both use the same terminal session model and PTY output pipeline.
- SSH sessions launch system `ssh` inside the terminal PTY using saved profile fields.
- Connection lifecycle is explicit:
  - profile state
  - preflight status (`runtime.check_status`)
  - launch status (`runtime.launch_status`)
  - shell-facing usability summary

## Contract boundaries

- Selecting active connection only changes default target for future tabs.
- Existing sessions are not migrated by changing active connection.
- Preflight result and launch result are separate truths and must not be collapsed into one fake “connected” flag.

## Release-scope limits

- No persistent live remote controller object yet.
- No `~/.ssh/config` import in current release path.
- No advanced auth/proxy-jump/agent workflows in scope.

## Deep links

- SSH config import scope: [remote-ssh-config-import.md](./remote-ssh-config-import.md)
- Baseline remote model: [history/remote-model-baseline.md](./history/remote-model-baseline.md)
- Profile baseline/result: [history/remote-profile-baseline.md](./history/remote-profile-baseline.md), [history/remote-profile-result.md](./history/remote-profile-result.md)
- Restore edge-case baseline: [history/remote-restore-error-baseline.md](./history/remote-restore-error-baseline.md)
