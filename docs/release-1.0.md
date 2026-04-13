# RunaTerminal 1.0.0 Release Scope

## What 1.0.0 means

RunaTerminal `1.0.0` is a new-architecture, TideTerm-compatible daily-driver release.

It does not mean complete parity with every TideTerm feature or every terminal-adjacent product surface.
It means a user can switch to RunaTerminal for the core daily workflow:

- launch the app reliably
- work in tabs and terminal sessions without shell instability
- use one honest remote SSH path
- use the AI panel for one genuinely useful command-and-explain flow
- use launcher, settings, audit, trust, and secret-shield surfaces without hidden runtime traps

## Release-blocking scope

The following areas are `1.0.0` release blockers:

- clean app launch with a reproducible development and packaged-shell path
- usable shell, tabs, workspace, and terminal behavior
- stable local terminal sessions with visible status and usable shell controls
- one honest remote SSH shell path with clear success and failure feedback
- AI panel backed by a real conversation path
- AI can execute at least one terminal command through the existing tool/runtime/policy path
- dangerous execution still respects approval and policy
- settings/control surfaces, launcher, and widget discovery are usable
- trusted rules, ignore rules, secret shielding, and audit exist and remain visible
- docs and validation remain truthful

## Explicit non-goals for 1.0.0

The following are intentionally out of scope for `1.0.0`:

- builder parity
- proxy parity
- preview zoo
- code editor parity
- broad settings universe parity
- `.ssh/config` import
- password-auth expansion beyond the current honest path
- advanced SSH auth and network topologies such as proxy jump
- full remote workspace/controller parity
- file attachments in the AI panel
- full AI model orchestration matrix
- speculative autonomous-agent redesign
- plugin ecosystem work
- perfect multi-session terminal parity

## Current readiness by area

| Area | Readiness | Notes |
| --- | --- | --- |
| App launch and shell startup | `partial` | Launch path is real and documented; release hardening and packaged-path confidence still need closure. |
| Tabs/workspace shell | `partial` | Strong enough for daily shell use, but still needs release-control tracking and bug closure. |
| Terminal daily-driver behavior | `partial` | Good enough to move off the main parity path, but still needs final release hardening. |
| Remote SSH | `partial` | One honest happy path exists; failure handling is clearer; still not broad remote parity. |
| AI conversation | `partial` | Real backend conversation exists, and `/run <command>` now executes through the real runtime path and returns a backend summary. Remaining gap is daily-driver hardening, not missing capability. |
| Settings/control/launcher | `partial` | Usable and shell-visible, but still needs release triage rather than more broad parity drift. |
| Audit/trust/secret shield | `partial` | Present and usable; must remain stable through the release slices. |
| Docs/validation discipline | `done` | Current process is truthful; must be maintained through release work. |

## Current blockers

Current release blockers, in priority order:

1. AI terminal command execution now exists, but still needs daily-driver hardening and broader shell-visible validation.
2. Remote SSH is honest but still needs stronger launch/retry/daily-driver confidence.
3. Terminal and shell slices need a final release-hardening pass rather than more parity expansion.
4. Release control documents must stay aligned with real validation as slices land.

## Release checklist

- [ ] Release scope is locked and tracked in release documents.
- [ ] Parity matrix includes release priority, release gap, and next step by area.
- [ ] Roadmap to `1.0.0` is explicit and milestone-based.
- [ ] Shell launches cleanly and remains stable under normal use.
- [ ] Tabs/workspace flows are usable for daily work.
- [ ] Terminal is stable enough for daily-driver use.
- [ ] One honest remote SSH path is validated with clear shell feedback.
- [ ] AI panel supports one real command-execute-and-explain path and has release-worthy user validation.
- [ ] Approvals and policy still gate dangerous execution.
- [ ] Settings/control/launcher surfaces remain usable.
- [ ] Audit and secret-shield behavior remain visible.
- [ ] Validation report reflects what was actually checked.
