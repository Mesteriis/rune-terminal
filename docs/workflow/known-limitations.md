# Known Limitations for `v1.0.0-rc1`

This document is intentionally blunt.
It defines what is incomplete by design for the first release candidate so we do not overclaim parity.

## Intentionally incomplete in `1.0.0`

- builder parity
- proxy parity
- preview zoo
- code editor parity
- broad settings-universe parity
- `.ssh/config` import
- advanced SSH auth and topology workflows (proxy jump, richer auth negotiation)
- managed attachment storage/import
- rich attachment preview/gallery UX
- streaming AI responses
- broad model orchestration matrix
- generalized AI provider support beyond the current Ollama-compatible HTTP path
- plugin ecosystem work

## Partial and still rough

- remote SSH remains a focused daily-driver path, not a full remote controller model
- connection lifecycle is explicit but still narrow (`saved profile` vs `last check` vs `last launch`)
- terminal parity remains practical, but advanced TideTerm surfaces are still missing (multi-session sidebar, deep search/find affordances)
- AI command flow intentionally supports explicit command grammar only (`/run` and `run:`), not broad natural-language command execution
- the current assistant backend is Ollama-compatible HTTP only; release validation proves contract wiring and daily-driver behavior, not a broad provider matrix
- native-window automation coverage is limited; validation leans on build + runtime/API smoke plus manual notes
- repo-wide full frontend lint (`npm run lint:frontend:all`) still has legacy debt; RC release gating currently uses active-path lint in `npm run validate`

## Post-`1.0.0` targets

- richer remote lifecycle and controller semantics
- advanced SSH credential and config workflows
- expanded launcher/app domain breadth
- broader shell/terminal parity slices that are currently out of release scope
- managed attachment storage/portability and streaming assistant output

## Release stance

These limitations are acceptable for `v1.0.0-rc1` only when:

- release-critical daily-driver flows are stable
- failure modes are honest and actionable
- docs and validation clearly describe the limits

These limitations are not acceptable if used to hide regressions in launch, shell, remote, `/run`, or approvals.
