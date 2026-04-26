# Plugins Validation

## Last verified state

- Date: `2026-04-26`
- State: `VERIFIED` for runtime/protocol hardening
- Scope:
  - side-process plugin execution path
  - manifest handshake + exposed-tool validation
  - manifest capability declaration allow-list validation
  - plugin failure taxonomy behavior
  - approval/audit invariants during plugin execution

## Commands/tests used

Capability declaration slice (`2026-04-26`):

- `./scripts/go.sh test ./core/plugins ./plugins/example -run 'TestInvokeAcceptsManifestCapabilitiesWithinSpecAllowList|TestInvokeRequiresManifestCapabilitiesWhenSpecAllowsCapabilities|TestInvokeRejectsManifestCapabilitiesOutsideSpecAllowList|TestRunHandlesHandshakeAndRequest' -count=1`
- `./scripts/go.sh test ./core/plugins ./plugins/example ./core/toolruntime ./core/app -count=1`
- `git diff --check`

Earlier runtime/API evidence retained for the broader plugin boundary:

- `go test ./...`
- Targeted taxonomy tests:
  - `go test ./core/plugins -run 'TestInvokeFailsWhenPluginCommandPathIsMissing|TestInvokeFailsWhenHandshakeExceedsTimeout|TestInvokeRejectsMalformedPluginResponse|TestInvokeFailsWhenPluginCrashesDuringExecutionAfterHandshake' -count=1`
  - `go test ./core/transport/httpapi -run TestStatusForExecuteErrorReturnsBadGatewayForPluginFailure -count=1`
- Protocol smoke:
  - `printf ... | go run ./cmd/rterm-core plugin-example`
- Runtime/API checks:
  - `GET /api/v1/tools` (contains `plugin.example_echo`)
  - `POST /api/v1/tools/execute` (`plugin.example_echo`)
  - `GET /api/v1/audit`

## Known limitations

- Plugin ecosystem/discovery/install workflows remain out of scope.
- Some slice-local `npm run validate` checks were marked not verified when repo-wide lint debt blocked that command in older runs.

## Evidence

- [Plugin runtime](../plugins/plugin-runtime.md)
- [Plugin execution model](../plugins/plugin-execution-model.md)
- [Plugin boundary verification](../plugins/plugin-boundary-verification.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#plugin-runtime-hardening)
