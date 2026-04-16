# Remote Model Baseline

Date: `2026-04-16`

## 1. Remote Session In The Current System

A remote session is a normal terminal session whose widget is bound to an SSH connection profile (`connection_id`) and launched with `connection.kind = "ssh"`.

Current runtime path:

- SSH profiles are stored in `core/connections`.
- `core/app` resolves the selected profile into `terminal.ConnectionSpec`.
- `core/terminal` launches the system `ssh` binary in the same PTY/session model used by local terminals.
- Session output/input/interrupt/snapshot/stream reuse the same terminal service contracts.

There is no long-lived remote controller object. The source of truth remains the Go runtime terminal session plus connection catalog state.

## 2. How It Differs From Local Terminal

Both local and remote are PTY-backed terminal sessions, but they differ in launch target and runtime semantics:

- Local:
  - launches the local login shell
  - keeps local working directory semantics
  - connection kind is `local`
- Remote (SSH):
  - launches `ssh` with saved host/user/port/identity options
  - working directory is not interpreted as local runtime truth
  - connection kind is `ssh`
  - connection catalog tracks preflight and launch outcomes for the profile

The terminal model itself (chunks, sequence IDs, snapshots, subscriptions, input) is intentionally shared.

## 3. Missing For Parity

Remote is real but still narrow. Gaps that remain after this baseline:

- no `~/.ssh/config` import
- no credential/key manager flows
- no advanced auth strategy orchestration
- no long-lived remote controller/agent session model
- no remote workspace/file surfaces parity
- no connection pooling or multi-hop orchestration
- `/run` targeting is still effectively active-widget scoped unless the execution envelope carries explicit session target semantics

These gaps are tracked as explicit non-goals for this release-hardening slice.

## 4. Mapping Into Existing Contracts

### Workspace mapping

- Workspace widgets carry `connection_id`.
- Active connection in catalog is only the default target for future tab creation.
- Existing widgets/sessions remain bound to their own `connection_id` after creation.

### Widget mapping

- Terminal widget is the binding point between UI tab and runtime session.
- Local and remote both use widget ID as session ID in the current model.
- Remote widget rendering should remain identical to local rendering; only session metadata differs.

### Execution-context mapping

- Tool execution currently uses `workspace_id`, `repo_root`, and `active_widget_id`.
- For remote parity, execution envelope must be explicit about session target (`local` vs `remote/ssh`) so `/run` and audit can prove which terminal context received execution.
- Runtime routing must resolve target widget/session first, then reuse existing tool/policy/audit flow.

This keeps backend ownership explicit and avoids frontend-owned remote semantics.
