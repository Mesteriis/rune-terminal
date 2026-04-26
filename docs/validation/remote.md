# Remote Validation

## Last verified state

- Date: `2026-04-26`
- State: `PARTIALLY VERIFIED` (core workflow hardening verified; external auth breadth remains limited)
- Scope:
  - saved profile create/list/select/check/open-shell flows
  - saved profile tmux launch policy (`shell` vs `tmux`) and persisted
    tmux session naming for resume-oriented SSH launches
  - profile-scoped tmux session discovery in settings plus loading a
    discovered session back into the profile editor
  - one-way SSH config import with `Include`, wildcard-host default
    application, and `Match host/originalhost` support for concrete aliases
  - normalized SSH preflight and launch diagnostics for missing keys,
    public-key misuse, passphrase/auth failures, timeout, host-key, and
    host-reachability failures
  - stale launch-state reset when saved profile target/auth fields change
  - settings-shell remote profile create/edit/delete/list/import entrypoint
  - settings-shell remote preflight/default-target controls plus launch
    status visibility
  - filterable saved-profile inventory inside the active settings shell
  - remote session/tab binding and local-vs-remote guardrails
  - missing-profile restore error semantics
  - audit target-session truth for remote runs

## Commands/tests used

- Backend targeted tests:
  - `go test ./core/app -run 'TestCreateRemoteTerminalTabFromProfileReusesRunningSession|TestCreateRemoteTerminalTabFromProfileCreatesSSHSession|TestRemoteTerminalSessionPersistsAcrossTabSwitches|TestTermSendInputToolRejectsMismatchedSessionTarget|TestExplainTerminalCommandUsesExplicitCommandAuditEventID|TestObserveConnectionLaunchMarksLaunch(Failed|Succeeded)'`
  - `go test ./core/transport/httpapi -run 'TestRemoteProfilesEndpointsListSaveAndDelete|TestRemoteProfilesCreateSessionReturnsNotFoundForMissingProfile|TestRemoteProfilesDeleteReturnsNotFoundForMissingProfile'`
  - `go test ./core/transport/httpapi -run TestWriteTerminalErrorMapsConnectionNotFoundToNotFound`
  - `./scripts/go.sh test ./core/connections ./core/transport/httpapi -run 'TestImportSSHConfig|TestRemoteProfilesImportSSHConfig|TestRemoteProfilesEndpointsListSaveAndDelete' -count=1`
  - `./scripts/go.sh test ./core/connections -count=1`
  - `./scripts/go.sh test ./core/connections ./core/terminal ./core/app ./core/transport/httpapi -run 'TestBuildCommandAddsTmuxResumeCommandForSSHProfiles|TestRemoteProfilesCanBeSavedListedAndDeleted|TestRemoteProfilesNormalizeTmuxLaunchPolicy|TestCreateRemoteTerminalTabFromProfileCarriesTmuxLaunchPolicy|TestRemoteProfilesEndpointsListSaveAndDelete' -count=1`
  - `./scripts/go.sh test ./core/transport/httpapi ./core/app -run 'TestConnectionsEndpointsListSelectAndSave|TestRemoteProfilesEndpointsListSaveAndDelete|TestObserveConnectionLaunchMarksLaunch(Failed|Succeeded)' -count=1`
  - `npm --prefix frontend run test -- src/features/remote/api/client.test.ts src/widgets/settings/remote-profiles-settings-section.test.tsx --reporter=verbose`
  - `frontend/node_modules/.bin/vitest run src/widgets/settings/remote-profiles-settings-section.test.tsx --reporter=verbose`
  - `npm --prefix frontend run test -- src/widgets/settings/remote-profiles-settings-section.test.tsx --reporter=verbose`
  - `npm --prefix frontend run lint:active`
  - `npm --prefix frontend run build`
  - `npm run test:ui -- --reporter=line e2e/shell-workspace.spec.ts --grep "remote settings surface normalized preflight failures and default-target state"`
  - `npm run test:ui -- --reporter=line e2e/shell-workspace.spec.ts --grep "remote settings persist tmux resume launch policy"` (attempted; Playwright hung in teardown after the test body ran, so this path is not claimed as a clean pass yet)
  - `npm run test:ui -- --reporter=line e2e/shell-workspace.spec.ts --grep "remote settings browse tmux sessions and load one into the profile editor"` (attempted; Playwright hung in teardown after the test body ran, so this path is not claimed as a clean pass yet)
- External reachability/auth probe example:
  - `ssh -o BatchMode=yes -o ConnectTimeout=5 -p 22 192.168.1.2 exit`
- Runtime/API checks in validation runs:
  - `POST /api/v1/remote/profiles`
  - `POST /api/v1/remote/profiles/import-ssh-config`
  - `GET /api/v1/remote/profiles`
  - `POST /api/v1/workspace/tabs/remote`
  - `GET /api/v1/terminal/{widget}`
  - `POST /api/v1/tools/execute` (`term.send_input`)

## Known limitations

- Some runs verified guardrails and session semantics without authenticated real-host SSH command execution.
- SSH config import remains intentionally narrower than a full SSH manager:
  no `ProxyJump`, broader `Match` criteria, keychain/passphrase workflows,
  or two-way synchronization back to SSH config files.
- Advanced SSH auth/topology flows and long-lived remote-controller semantics remain out of current scope and move to `Phase 5`.
- tmux resume currently means "profile-owned attach-or-create on launch".
  There is now a narrow profile-scoped session discovery list in settings,
  but there is still no separate tmux session catalog, broader named-session
  browser, or detached-session manager UI on top of that backend path.

## Evidence

- [Remote model](../remote/remote-model.md)
- [SSH config import scope](../remote/remote-ssh-config-import.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#remote-productivity-batch)
