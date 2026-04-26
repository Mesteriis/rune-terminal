# Remote Model

Date: `2026-04-26`
Phase: daily-driver SSH closure

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
- Saved SSH profiles can now choose a narrow launch policy:
  - plain shell (`launch_mode = "shell"`)
  - tmux-backed resume (`launch_mode = "tmux"`) with a persisted
    `tmux_session` name
- tmux-backed profiles resume through the same SSH launch path by opening
  `tmux new-session -A -s <session>` on the remote host; this adds resume
  semantics without introducing a separate remote controller object.
- The active settings shell can also browse discovered tmux sessions for a
  saved tmux-backed profile and load one back into the profile editor as
  the next resume target.
- Connection lifecycle is explicit:
  - profile state
  - preflight status (`runtime.check_status`)
  - launch status (`runtime.launch_status`)
  - shell-facing usability summary
- Preflight and launch failures are normalized into operator-facing SSH
  diagnostics instead of leaking raw PTY/setup noise directly into the
  settings shell.
- Editing a saved profile's target/auth fields resets stale launch state
  before the next explicit shell launch.

## Contract boundaries

- Selecting active connection only changes default target for future tabs.
- Existing sessions are not migrated by changing active connection.
- Preflight result and launch result are separate truths and must not be collapsed into one fake “connected” flag.

## Current remote limits

- No persistent live remote controller object yet.
- No separate tmux session catalog/manager UI yet; the current scope is a
  profile-owned resume policy plus narrow session discovery, not a broader
  remote session browser.
- Narrow one-way `~/.ssh/config` import is available through
  `POST /api/v1/remote/profiles/import-ssh-config`; it supports direct
  `Host`, `HostName`, `User`, `Port`, and `IdentityFile` profile fields,
  plus `Include`, wildcard-host defaults, and `Match host/originalhost`
  when deriving concrete saved profiles.
- No advanced auth/proxy-jump/agent workflows implemented yet.

## Deep links

- SSH config import scope: [remote-ssh-config-import.md](./remote-ssh-config-import.md)
- Baseline remote model: [history/remote-model-baseline.md](./history/remote-model-baseline.md)
- Profile baseline/result: [history/remote-profile-baseline.md](./history/remote-profile-baseline.md), [history/remote-profile-result.md](./history/remote-profile-result.md)
- Restore edge-case baseline: [history/remote-restore-error-baseline.md](./history/remote-restore-error-baseline.md)
