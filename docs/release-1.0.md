# RunaTerminal `1.0.0` Release Scope

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

## Release-control docs

`1.0.0-rc1` is controlled by:

- `docs/release-1.0.md`
- `docs/release-checklist-1.0.md`
- `docs/known-limitations.md`
- `docs/parity-matrix.md`
- `docs/validation.md`

## Current readiness by area

| Area | Readiness | Notes |
| --- | --- | --- |
| App launch and shell startup | `partial` | Launch path is real and now has clearer bootstrap error guidance; final RC validation closure still required. |
| Tabs/workspace shell | `partial` | Stable enough for daily shell use; this is now hardening and regression control, not parity expansion. |
| Terminal daily-driver behavior | `partial` | Copy/paste and long-output handling are hardened; final release smoke still required. |
| Remote SSH | `partial` | One honest happy path exists; launch failures are more actionable; still intentionally narrow vs full remote parity. |
| AI conversation | `partial` | Real backend conversation exists; `/run` path now has clearer UX and fallback handling; final release smoke still required. |
| Settings/control/launcher | `partial` | Usable and shell-visible, but still needs release triage rather than more broad parity drift. |
| Audit/trust/secret shield | `partial` | Present and usable; must remain stable through the release slices. |
| Docs/validation discipline | `done` | Current process is truthful; must be maintained through release work. |

## Current blockers

Current release blockers, in priority order:

1. Full RC validation sweep must be rerun and recorded after the latest hardening changes.
2. Remote SSH still needs final release smoke evidence against a reachable host (within narrow 1.0 scope).
3. Shell and terminal hardening must remain regression-free through final RC checks.
4. Release-control docs must stay aligned with actual validation results and known limitations.

## RC checklist and limitations

- authoritative checklist: `docs/release-checklist-1.0.md`
- explicit non-blocking gaps and post-1.0 items: `docs/known-limitations.md`
