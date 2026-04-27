# Infrastructure Validation

## Last verified state

- Date: `2026-04-26`
- State: `PARTIAL` for CI wiring
- Scope:
  - GitHub Actions workflow definition under `.github/workflows/ci.yml`
  - Tauri desktop CSP configuration under `apps/desktop/src-tauri/tauri.conf.json`
  - frontend lint/test/build commands used by CI
  - Go test/build commands used by CI
  - HTTP transport safety guards for CORS/auth/body decoding
  - `cmd/rterm-core` JSON response helpers on write/error paths
  - startup runtime initialization under bounded timeout and single catalog-store ownership
  - approval-grant TTL cleanup and fail-closed random ID generation
  - conversation/workspace persistence safety for JSON marshalling, snapshot writes, and bounded audit-tail reads
  - plugin protocol handshake timeout now force-closes blocked stdout reads before returning timeout
  - root/tooling package alignment now keeps the repo and active frontend on the same TypeScript major line
  - Go `coverage.out` artifact generation in CI
  - desktop `cargo check` command used by CI
  - gitleaks secret-scan job wiring

## Commands/tests used

- `npm run check:active-path-api`
- `npm run lint:frontend`
- `npm run test:frontend`
- `npm run build:frontend`
- `python3 -m json.tool apps/desktop/src-tauri/tauri.conf.json >/dev/null`
- `./scripts/go.sh test ./cmd/... ./core/... ./internal/... -coverprofile=/tmp/rterm-go-coverage.out`
- `./scripts/go.sh build ./cmd/... ./core/... ./internal/...`
- `./scripts/go.sh test ./core/transport/httpapi ./cmd/rterm-core -run 'TestCORSRejectsDisallowedOriginSimpleRequest|TestCORSRejectsDisallowedOriginPreflight|TestCORSAllowsPatchAndDeleteMethods|TestDecodeJSONRejectsOversizedBodies|TestWriteJSONErrorEscapesPayload|TestWriteJSONResponseDoesNotPanicOnWriterError|TestWriteJSONResponseWritesValidPayload|TestWriteFileAtomicOverwritesReadyPayload' -count=1`
- `./scripts/go.sh test ./internal/ids ./core/toolruntime ./core/app -run 'TestNewPanicsWhenEntropyUnavailable|TestTokenPanicsWhenEntropyUnavailable|TestApprovalStoreCreateCleansExpiredGrants|TestApprovalStoreConfirmCleansExpiredPendingRecords|TestExecutorConfirmationFlow|TestExecutorApprovalGrantIsSingleUse|TestBootstrapSessionsKeepsRemoteWidgetAsDisconnectedWhenConnectionMissing' -count=1`
- `./scripts/go.sh test ./core/conversation ./core/workspace ./core/audit -run 'TestLogAppendAndList|TestLogListLimitKeepsOnlyTailWindow|TestListReturnsEmptySliceWhenLogDoesNotExist|TestSaveAndLoadSnapshotRoundTrip|TestLoadSnapshotDefaultsWhenFileMissing|TestRenameConversation|TestDeleteConversation' -count=1`
- `./scripts/go.sh test ./core/plugins -run 'TestInvokeFailsWhenHandshakeExceedsTimeout|TestReadJSONLineWithTimeoutClosesReaderOnTimeout' -count=1`
- `npm install --package-lock-only --ignore-scripts`
- `npm run tauri:check`
- `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/ci.yml'); puts 'workflow yaml parses'"`
- `git diff --check`

## Known limitations

- GitHub-hosted workflow execution cannot be observed until the branch is pushed.
- The secret scan job uses the hosted `gitleaks/gitleaks-action@v2` action; local execution of that hosted action is not claimed here.
- Native-window automation remains outside the CI workflow.
- The CSP slice is validated by config parse/build checks only; it does not claim a fresh interactive `npm run tauri:dev` smoke.
- `npm run tauri:check` passes locally but still emits the existing Rust
  dead-code warning for `reject_foreign_watcher_listener`.

## Evidence

- [CI workflow](../../.github/workflows/ci.yml)
- [Roadmap infrastructure track](../workflow/roadmap.md#6-infrastructure)
