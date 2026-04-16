# Remote Workflow Baseline

Date: `2026-04-17`  
Phase: `1.0.0-rc1` hardening

## 1. Current user workflow

Remote daily flow today is explicit and profile-driven:

1. save or pick SSH profile in `Remote Profiles` modal (`host`, optional `user/port/identity_file`)
2. open shell from profile (`POST /api/v1/remote/profiles/{profileID}/session`)
3. backend creates a new remote tab/widget bound to `connection_id = profile_id`
4. terminal session starts through SSH launcher (`connection_kind = "ssh"`)
5. operator runs commands directly in terminal or via AI `/run`
6. explain path and audit use existing widget/session context (`target_session`, `target_connection_id`)

## 2. Friction points in current usage

### Reconnect friction

- Opening the same profile repeatedly creates additional remote tabs/sessions instead of preferring an already-live one.
- There is no explicit profile-session identity in open-session response, so operators cannot quickly tell whether they got a reused session vs a new one.

### Switching friction

- Session switching is tab/widget based, but profile intent is profile based.
- UI flow does not make profile -> active session linkage obvious while navigating between local and remote tabs.

### Repeated sessions friction

- Profile open action is conservative but duplicates can accumulate during repeated profile opens.
- Daily usage requires manually tracking which tab is “the real remote session” for a profile.

## 3. What is missing for daily usage

- stable, explicit remote session identity contract (`session_id`, `profile_id`, `connection_id`)
- safe session reuse when a live session for the same profile already exists
- clearer profile <-> session linkage in operator-facing actions
- explicit remote-focused handoff actions for `/run`, file-path-to-`/run`, and explain flow
- visible lifecycle truth in session-facing UI for connection loss/disconnect/error states

## 4. Scope boundary for this batch

This batch is intentionally narrow:

- keep existing SSH runtime and terminal architecture
- no SSH manager/keychain/pooling/multiplexing
- no remote file manager domain expansion
- no broad UI redesign
