# Infrastructure Validation

## Last verified state

- Date: `2026-04-26`
- State: `PARTIAL` for CI wiring
- Scope:
  - GitHub Actions workflow definition under `.github/workflows/ci.yml`
  - frontend lint/test/build commands used by CI
  - Go test/build commands used by CI
  - Go `coverage.out` artifact generation in CI
  - desktop `cargo check` command used by CI
  - gitleaks secret-scan job wiring

## Commands/tests used

- `npm run check:active-path-api`
- `npm run lint:frontend`
- `npm run test:frontend`
- `npm run build:frontend`
- `./scripts/go.sh test ./cmd/... ./core/... ./internal/... -coverprofile=/tmp/rterm-go-coverage.out`
- `./scripts/go.sh build ./cmd/... ./core/... ./internal/...`
- `npm run tauri:check`
- `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/ci.yml'); puts 'workflow yaml parses'"`
- `git diff --check`

## Known limitations

- GitHub-hosted workflow execution cannot be observed until the branch is pushed.
- The secret scan job uses the hosted `gitleaks/gitleaks-action@v2` action; local execution of that hosted action is not claimed here.
- Native-window automation remains outside the CI workflow.
- `npm run tauri:check` passes locally but still emits the existing Rust
  dead-code warning for `reject_foreign_watcher_listener`.

## Evidence

- [CI workflow](../../.github/workflows/ci.yml)
- [Roadmap infrastructure track](../workflow/roadmap.md#6-infrastructure)
