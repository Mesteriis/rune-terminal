# Contributing to rune-terminal

Thanks for your interest in contributing.

rune-terminal (short name `rterm`) is an open-source terminal-centered
workspace platform under active construction. Contributions are welcome,
but the project is pre-release and still in a foundation-first phase, so
correctness, architecture and validation matter more than feature
volume.

Please read these before contributing:

- [`README.md`](README.md)
- [`AGENTS.md`](AGENTS.md)
- [`docs/README.md`](docs/README.md) — docs index and canonical entry points
- [`docs/architecture/architecture.md`](docs/architecture/architecture.md)
- [`docs/architecture/adr/`](docs/architecture/adr)
- [`docs/workflow/roadmap.md`](docs/workflow/roadmap.md)
- [`docs/workflow/known-limitations.md`](docs/workflow/known-limitations.md)
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
- [`SECURITY.md`](SECURITY.md)

## Ground rules

- Keep changes small and reviewable.
- Prefer focused commits over giant mixed commits.
- Update docs when behavior or architecture changes.
- Add or update tests for meaningful logic changes.
- Do not bypass existing architecture decisions without updating the
  relevant ADR.
- Do not introduce broad redesigns when a narrower slice is the goal.

## Workflow

1. Create a branch for your work.
2. Make one logical change at a time.
3. Run the relevant checks locally.
4. Update validation / docs if needed.
5. Open a pull request with a clear summary.

## Validation

At minimum, run the relevant subset of:

```bash
npm --prefix frontend run lint:active
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

rune-terminal is intentionally being built around:

- a Go-first backend core that owns runtime truth
- a Tauri shell that stays thin
- transport as an adapter, not the product model
- policy-first execution with explicit approvals
- audit / trust / ignore rules as first-class concerns
- ADR-driven architectural changes

Do not reintroduce:

- giant handler buckets
- giant frontend orchestration blobs
- implicit security behavior
- broad unrelated scope drift in a single PR

## Frontend note

The frontend (`frontend/src/`) is being rewritten. New widgets live
under `frontend/src/widgets/<domain>/`. Please follow the layer rules in
[`frontend/docs/ui-architecture.md`](frontend/docs/ui-architecture.md)
and keep mock / fake clients behind a clear boundary so they can be
swapped for real HTTP/SSE calls into the Go core without rewriting
widgets.

## Pull request expectations

A good PR should explain:

- what changed
- why it changed
- what was validated
- what remains out of scope
- whether docs / ADRs were updated

## Questions

If you are unsure whether a change fits the current phase of the
project, open an issue or a draft PR first and describe the slice you
want to work on.
