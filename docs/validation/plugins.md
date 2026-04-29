# Plugins Validation

## Last verified state

- Date: `2026-04-29`
- State: `VERIFIED` for runtime/protocol hardening
- Scope:
  - side-process plugin execution path
  - manifest handshake + exposed-tool validation
  - manifest capability declaration allow-list validation
  - Go and Python reference plugin protocol compatibility
  - explicit plugin process environment boundary
  - plugin failure taxonomy behavior
  - approval/audit invariants during plugin execution
  - backend-owned local plugin catalog lifecycle
  - install/update/delete/enable/disable flows for `git` and `zip` sources
  - actor-aware plugin catalog metadata shape for future rights enforcement
  - plugin catalog lifecycle mutations now append core-owned audit events for
    install/update/enable/disable/delete success and failure paths
  - zip install extraction now enforces expanded-byte and entry-count budgets,
    and archive entry containment is checked with root-relative path semantics
    instead of raw string prefixes
  - staged plugin bundle promotion now rejects symlink entries and enforces the
    same total copied-byte / entry-count budget before writing into the install
    root
  - plugin delete removes the install root before removing the catalog record,
    so filesystem-removal failures leave the plugin visible and retryable

## Commands/tests used

Catalog lifecycle hardening slice (`2026-04-29`):

- `./scripts/go.sh test ./core/app -run 'TestPluginLifecycleAppendsAuditEvents|TestInstallPluginAppendsFailureAuditEvent|TestInstallPluginRejectsZipArchiveOverExpandedSizeLimit|TestInstallPluginRejectsZipArchiveEntryOutsideRootPrefix|TestDeleteInstalledPluginKeepsCatalogWhenInstallRootRemovalFails' -count=1`
- `./scripts/go.sh test ./core/app -run 'TestInstallPluginRejectsBundleSymlinkEntries|TestInstallPluginRejectsGitBundleOverCopiedSizeLimit' -count=1`
- `./scripts/go.sh test ./core/app -run 'Test(DeleteFSRemovesSymlinkEntryWithoutDeletingTarget|RenameFSRenamesSymlinkEntryWithoutRenamingTarget|MoveFSMovesSymlinkEntryWithoutMovingTarget|CopyFSCopiesSymlinkEntryWithoutCopyingTargetContent|ReadFSPreviewReturnsCanonicalPathForSymlinkInsideWorkspace|MkdirFSReturnsCanonicalPathForSymlinkParentInsideWorkspace|ReadFSPreviewRejectsSymlinkOutsideWorkspace|ListFSRejectsSymlinkDirectoryOutsideWorkspace|WriteFSFileRejectsSymlinkOutsideWorkspace|MkdirFSRejectsSymlinkParentOutsideWorkspace|Plugin)' -count=1`
- `./scripts/go.sh test ./core/app ./core/transport/httpapi -count=1`

Non-Go reference plugin slice (`2026-04-26`):

- `./scripts/go.sh test ./core/plugins -run TestOSProcessSpawnerInvokesPythonReferencePlugin -count=1`
- `./scripts/go.sh test ./core/plugins ./plugins/example -count=1`
- `git diff --check`

Capability declaration slice (`2026-04-26`):

- `./scripts/go.sh test ./core/plugins ./plugins/example -run 'TestInvokeAcceptsManifestCapabilitiesWithinSpecAllowList|TestInvokeRequiresManifestCapabilitiesWhenSpecAllowsCapabilities|TestInvokeRejectsManifestCapabilitiesOutsideSpecAllowList|TestRunHandlesHandshakeAndRequest' -count=1`
- `./scripts/go.sh test ./core/plugins ./plugins/example ./core/toolruntime ./core/app -count=1`
- `git diff --check`

Permission boundary slice (`2026-04-26`):

- `./scripts/go.sh test ./core/plugins -run 'TestOSProcessSpawnerDoesNotInheritParentEnvironment|TestOSProcessSpawnerRejectsInvalidWorkingDirectory' -count=1`
- `./scripts/go.sh test ./core/plugins -count=1`
- `./scripts/go.sh test ./cmd/rterm-core ./core/app ./plugins/example -count=1`
- `git diff --check`

Local catalog/install slice (`2026-04-26`):

- `./scripts/go.sh test ./core/app ./core/transport/httpapi ./core/toolruntime -count=1`
- `npm --prefix frontend run test -- src/features/plugins/api/client.test.ts src/widgets/settings/plugins-settings-section.test.tsx --reporter=verbose`
- `npm run test:ui -- --reporter=line e2e/shell-workspace.spec.ts --grep "plugin settings install, filter, enable, update, and remove local catalog entries"`
- `npm run lint:frontend`
- `npm run build:frontend`
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

- Plugin install sources are intentionally narrow in this phase:
  `git` repository URLs and `zip` archives only.
- The backend catalog already persists install metadata plus current-user
  actor fields and a future-facing access-policy shape, but those access
  fields are not enforced yet.
- There is still no online plugin marketplace or trust discovery surface.
- The Python reference plugin is validated as a local protocol fixture; it is
  not exposed as plugin install/discovery UX.
- Plugin execution is not an OS sandbox; local plugin binaries still run with
  current-user OS permissions. The current hardening only removes ambient
  parent-environment inheritance and documents the boundary.
- Some slice-local `npm run validate` checks were marked not verified when repo-wide lint debt blocked that command in older runs.

## Evidence

- [Plugin runtime](../plugins/plugin-runtime.md)
- [Plugin execution model](../plugins/plugin-execution-model.md)
- [Plugin boundary verification](../plugins/plugin-boundary-verification.md)
- [Legacy validation log entries](./history/validation-log-legacy-2026-04-17.md#plugin-runtime-hardening)
