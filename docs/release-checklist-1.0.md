# RunaTerminal `v1.0.0-rc1` Release Checklist

This checklist is release-control for `v1.0.0-rc1`, not a feature wishlist.
Anything marked as a blocker must be closed before tagging RC.

## Launch readiness

- [x] `npm run tauri:dev` launches reliably through the supported script path.
- [x] Runtime bootstrap failures show actionable next steps for local recovery.
- [x] `npm run build:core` produces a fresh `apps/desktop/bin/rterm-core` before launch smoke.

## Local terminal daily-driver

- [ ] Active tab launches a usable local shell with visible status.
- [ ] Keyboard input, interrupt, and command-row send path are stable.
- [ ] Terminal copy/paste shortcuts behave predictably in the shell (`Cmd/Ctrl+C` with selection, `Cmd/Ctrl+V` paste).
- [ ] Long output remains usable without obvious UI lockups.

## Remote shell daily-driver

- [ ] Connection selection clearly drives default target for new tabs.
- [ ] `Check` preflight and `Open shell` launch outcomes are visibly distinct.
- [x] Remote launch failures return actionable user-facing guidance.
- [ ] One honest reachable-host SSH smoke is recorded in validation notes.

## AI command execution

- [ ] Explicit `/run <command>` and `run: <command>` execute through runtime tools path.
- [x] Empty `/run` prompts produce explicit format guidance instead of silent fallback.
- [x] Explain-result path handles provider and transport failures without fake success notices.
- [ ] Result summary remains practical for daily terminal usage.

## Approval flow and policy

- [ ] Approval-required command path returns pending approval with clear banner.
- [ ] `safety.confirm` token retry path succeeds once and is not silently replayable.
- [ ] Capability-removing modes deny execution honestly when expected.
- [ ] Audit captures approval usage for command execution explanations.

## Docs truthfulness

- [x] `README.md` describes release-phase reality and supported launch path.
- [x] `docs/release-1.0.md` and `docs/parity-matrix.md` reflect current RC blockers.
- [x] `docs/current-behavior.md` matches shipped behavior.
- [x] `docs/known-limitations.md` explicitly lists intentional and post-1.0 gaps.
- [x] `docs/validation.md` reflects only checks that were actually executed.

## Validation evidence

- [x] Frontend lint/build rerun.
- [x] Go tests/build rerun.
- [x] Full `npm run validate` rerun.
- [x] `npm run tauri:dev` rerun and sidecar health checked.
- [x] Release smoke notes captured for this pass (launch path, `/run` UX, and remote launch error handling).

## Blockers vs non-blockers for `v1.0.0-rc1`

`Release blockers` (must be closed for RC):

- broken launch path or unclear launch recovery
- obvious shell regression in local daily-driver flow
- unusable or misleading remote shell launch/failure behavior
- `/run` or approval flow behaving inconsistently with policy/runtime truth
- docs/validation mismatching actual behavior

`Non-blockers` (acceptable for RC if documented):

- intentionally deferred parity areas listed in `docs/known-limitations.md`
- missing streaming AI output
- attachments placeholder in AI composer
- deeper TideTerm parity outside locked 1.0 release scope
