# Contributing to RunaTerminal

Thanks for your interest in contributing.

RunaTerminal is an open-source terminal workspace platform under active
construction. Contributions are welcome, but the project is still in a
foundation-first phase, so correctness, architecture, and validation matter
more than feature volume.

Please read these before contributing:

- `README.md`
- `docs/architecture.md`
- `docs/parity-matrix.md`
- `docs/current-behavior.md`
- `docs/adr/`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`

## Ground rules

- Keep changes small and reviewable
- Prefer focused commits over giant mixed commits
- Update docs when behavior or architecture changes
- Add or update tests for meaningful logic changes
- Do not bypass existing architecture decisions without updating ADRs
- Do not introduce broad redesigns when a controlled parity slice is the goal

## Workflow

1. Create a branch for your work
2. Make one logical change at a time
3. Run the relevant checks locally
4. Update validation/docs if needed
5. Open a pull request with a clear summary

## Validation

At minimum, run the relevant subset of:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
./scripts/go.sh test ./cmd/... ./core/... ./internal/...
./scripts/go.sh build ./cmd/... ./core/... ./internal/...
npm run validate
```

If your change affects launch behavior, also run:

```bash
npm run build:core
npm run tauri:dev
```

If you could not run a check, say so explicitly in your PR.

## Architecture discipline

RunaTerminal is intentionally being built around:

- Go-first backend core
- Tauri shell
- transport as adapter, not product model
- policy-first execution
- audit/trust/ignore as first-class concerns
- ADR-driven architectural changes

Do not reintroduce:

- giant handler buckets
- giant frontend orchestration blobs
- implicit security behavior
- broad unrelated scope drift in parity slices

## Pull request expectations

A good PR should explain:

- what changed
- why it changed
- what was validated
- what remains out of scope
- whether docs/ADRs were updated

## Questions

If you are unsure whether a change fits the current phase of the project,
open an issue or draft PR first and describe the slice you want to work on.
