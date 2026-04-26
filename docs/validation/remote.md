# Remote Validation

## Last verified state

- Date: `2026-04-17`
- State: `PARTIALLY VERIFIED` (core workflow hardening verified; external auth breadth remains limited)
- Scope:
  - saved profile create/list/select/check/open-shell flows
  - narrow one-way SSH config import for direct host profile fields
  - settings-shell remote profile create/edit/delete/list/import entrypoint
  - settings-shell remote preflight/default-target controls
  - remote session/tab binding and local-vs-remote guardrails
  - missing-profile restore error semantics
  - audit target-session truth for remote runs

## Commands/tests used

- Backend targeted tests:
  - `go test ./core/app -run 'TestCreateRemoteTerminalTabFromProfileReusesRunningSession|TestCreateRemoteTerminalTabFromProfileCreatesSSHSession|TestRemoteTerminalSessionPersistsAcrossTabSwitches|TestTermSendInputToolRejectsMismatchedSessionTarget|TestExplainTerminalCommandUsesExplicitCommandAuditEventID|TestObserveConnectionLaunchMarksLaunch(Failed|Succeeded)'`
  - `go test ./core/transport/httpapi -run 'TestRemoteProfilesEndpointsListSaveAndDelete|TestRemoteProfilesCreateSessionReturnsNotFoundForMissingProfile|TestRemoteProfilesDeleteReturnsNotFoundForMissingProfile'`
  - `go test ./core/transport/httpapi -run TestWriteTerminalErrorMapsConnectionNotFoundToNotFound`
  - `./scripts/go.sh test ./core/connections ./core/transport/httpapi -run 'TestImportSSHConfig|TestRemoteProfilesImportSSHConfig|TestRemoteProfilesEndpointsListSaveAndDelete' -count=1`
  - `npm --prefix frontend run test -- src/features/remote/api/client.test.ts src/widgets/settings/remote-profiles-settings-section.test.tsx`
  - `npm --prefix frontend run lint:active`
  - `npm --prefix frontend run build`
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
- SSH config import remains intentionally narrow: no `Match`, `Include`,
  wildcard expansion, proxy chaining, keychain/passphrase workflows, or
  two-way synchronization back to SSH config files.
- Advanced SSH auth/topology flows and long-lived remote-controller semantics are out of current scope.

## Evidence

- [Remote model](../remote/remote-model.md)
- [SSH config import scope](../remote/remote-ssh-config-import.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#remote-productivity-batch)
