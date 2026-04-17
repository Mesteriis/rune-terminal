# Docs Inventory

Date: `2026-04-17`

This is a full inventory of `docs/` before restructuring.
Status labels are organizational (`ACTIVE`, `DUPLICATE`, `OUTDATED`, `UNCLEAR`) and are used to drive the reorganization pass.

## Summary

- Total files: `155`
- `ACTIVE`: `74`
- `DUPLICATE`: `78`
- `OUTDATED`: `2`
- `UNCLEAR`: `1`

## Inventory

| Path | Purpose | Status | Domain |
| --- | --- | --- | --- |
| `docs/adr/0001-rewrite-philosophy-and-architectural-goals.md` | ADR 0001: Rewrite Philosophy And Architectural Goals | `ACTIVE` | `architecture` |
| `docs/adr/0002-tauri-as-desktop-shell.md` | ADR 0002: Tauri As Desktop Shell | `ACTIVE` | `architecture` |
| `docs/adr/0003-go-first-backend-core.md` | ADR 0003: Go-First Backend Core | `ACTIVE` | `architecture` |
| `docs/adr/0004-react-typescript-frontend.md` | ADR 0004: React And TypeScript Frontend | `ACTIVE` | `architecture` |
| `docs/adr/0005-workspace-model.md` | ADR 0005: Workspace Model | `ACTIVE` | `architecture` |
| `docs/adr/0006-terminal-session-model.md` | ADR 0006: Terminal Session Model | `ACTIVE` | `architecture` |
| `docs/adr/0007-tool-runtime-model.md` | ADR 0007: Tool Runtime Model | `ACTIVE` | `architecture` |
| `docs/adr/0008-policy-model.md` | ADR 0008: Policy Model | `ACTIVE` | `architecture` |
| `docs/adr/0009-trusted-allowlist-model.md` | ADR 0009: Trusted Allowlist Model | `ACTIVE` | `architecture` |
| `docs/adr/0010-ignore-and-secret-protection-model.md` | ADR 0010: Ignore And Secret Protection Model | `ACTIVE` | `architecture` |
| `docs/adr/0011-audit-log-model.md` | ADR 0011: Audit Log Model | `ACTIVE` | `architecture` |
| `docs/adr/0012-transport-between-tauri-frontend-and-go-core.md` | ADR 0012: Transport Between Tauri, Frontend And Go Core | `ACTIVE` | `architecture` |
| `docs/adr/0013-why-not-electron-and-why-not-full-rust-backend.md` | ADR 0013: Why Not Electron And Why Not Full Rust Backend | `ACTIVE` | `architecture` |
| `docs/adr/0014-stricter-secret-defaults.md` | ADR 0014: Stricter Secret Defaults | `ACTIVE` | `architecture` |
| `docs/adr/0015-policy-pipeline-decomposition.md` | ADR 0015: Policy Pipeline Decomposition | `ACTIVE` | `architecture` |
| `docs/adr/0016-role-mode-and-system-prompt-subsystem.md` | ADR 0016: Role, Mode, and System Prompt Subsystem | `ACTIVE` | `architecture` |
| `docs/adr/0017-modular-tool-registration.md` | ADR 0017: Modular Tool Registration | `ACTIVE` | `architecture` |
| `docs/adr/0018-sse-query-token-mvp-tradeoff.md` | ADR 0018: SSE Query Token MVP Tradeoff | `ACTIVE` | `architecture` |
| `docs/adr/0019-remote-ssh-foundation.md` | 0019. Remote / SSH Foundation | `ACTIVE` | `architecture` |
| `docs/adr/0020-ai-conversation-backend-foundation.md` | 0020. AI Conversation Backend Foundation | `ACTIVE` | `architecture` |
| `docs/adr/0020-ai-terminal-command-execution-path.md` | 0020 — AI Terminal Command Execution Path | `ACTIVE` | `architecture` |
| `docs/agent-modes.md` | RunaTerminal Agent Modes | `ACTIVE` | `workflow` |
| `docs/approval-continuity-baseline.md` | Approval Continuity Baseline | `DUPLICATE` | `execution` |
| `docs/approval-continuity-hardening-baseline.md` | Approval Continuity Hardening Baseline | `DUPLICATE` | `execution` |
| `docs/approval-intent-binding-baseline.md` | Approval Intent Binding Baseline | `DUPLICATE` | `execution` |
| `docs/approval-intent-binding-result.md` | Approval Intent Binding Result | `DUPLICATE` | `execution` |
| `docs/architecture.md` | RunaTerminal Architecture | `ACTIVE` | `architecture` |
| `docs/attachment-consumption-baseline.md` | Attachment consumption baseline | `DUPLICATE` | `ui` |
| `docs/attachment-consumption-result.md` | Attachment Consumption Result | `DUPLICATE` | `ui` |
| `docs/attachment-ui-baseline.md` | Attachment UI baseline | `DUPLICATE` | `ui` |
| `docs/attachment-ui-result.md` | Attachment UI Truth Result | `DUPLICATE` | `ui` |
| `docs/attachments-contract-baseline.md` | Attachments Contract Baseline | `DUPLICATE` | `ui` |
| `docs/attachments-reference-result.md` | Local Attachment References Result | `DUPLICATE` | `ui` |
| `docs/conversation-pruning-baseline.md` | Conversation Pruning Baseline | `DUPLICATE` | `workflow` |
| `docs/conversation-reload-baseline.md` | Conversation Snapshot / Reload Baseline | `DUPLICATE` | `workflow` |
| `docs/current-behavior.md` | Current Behavior | `ACTIVE` | `architecture` |
| `docs/dependency-hygiene-baseline.md` | Dependency and Limitation Baseline | `DUPLICATE` | `_meta` |
| `docs/domain-model.md` | RunaTerminal Domain Model | `ACTIVE` | `architecture` |
| `docs/electron-cleanup-baseline.md` | Electron / Legacy Frontend Cleanup Baseline | `DUPLICATE` | `workflow` |
| `docs/electron-cleanup-result.md` | Electron / Legacy Frontend Cleanup Result | `DUPLICATE` | `workflow` |
| `docs/execution-contract.md` | Execution Contract | `ACTIVE` | `architecture` |
| `docs/execution-result-message-model.md` | Execution Result Message Model | `ACTIVE` | `architecture` |
| `docs/explain-approval-baseline.md` | Explain Approval Baseline | `DUPLICATE` | `execution` |
| `docs/feature-gap-summary.md` | Feature Gap Summary | `DUPLICATE` | `parity` |
| `docs/feature-parity-audit.md` | Feature Parity Audit | `DUPLICATE` | `parity` |
| `docs/frontend-action-audit-expectations.md` | Frontend Action Audit Expectations | `ACTIVE` | `ui` |
| `docs/frontend-active-path-api-audit.md` | Active Path API Import Audit (Slice 3.1) | `ACTIVE` | `ui` |
| `docs/frontend-active-path-guardrails.md` | Active Path API Guardrails (Slice 3.1) | `ACTIVE` | `ui` |
| `docs/frontend-agent-slice-baseline.md` | frontend agent/conversation slice baseline | `DUPLICATE` | `ui` |
| `docs/frontend-aipanel-visibility-baseline.md` | frontend AI panel visibility/open-state baseline | `DUPLICATE` | `ui` |
| `docs/frontend-aipanel-visibility-result.md` | frontend AI panel visibility/open-state result | `DUPLICATE` | `ui` |
| `docs/frontend-api-contract.md` | Frontend Transport API Contract | `ACTIVE` | `ui` |
| `docs/frontend-approval-action-validation.md` | Frontend Approval Action Validation | `ACTIVE` | `validation` |
| `docs/frontend-asset-pipeline-validation.md` | Frontend Asset Pipeline Validation | `ACTIVE` | `validation` |
| `docs/frontend-audit-slice-baseline.md` | Frontend Audit Slice Baseline | `DUPLICATE` | `ui` |
| `docs/frontend-compat-console-slice.md` | Frontend Compat Console Slice | `ACTIVE` | `ui` |
| `docs/frontend-compat-facade-baseline.md` | Compatibility Facade Baseline for Legacy Frontend Calls | `DUPLICATE` | `ui` |
| `docs/frontend-compat-facade-usage.md` | Compatibility Facade Usage Boundary | `ACTIVE` | `ui` |
| `docs/frontend-compat-modal-parity-slice.md` | Frontend Compat Modal Parity Slice | `ACTIVE` | `ui` |
| `docs/frontend-compat-style-surface-slice.md` | Frontend Compat Style Surface Stabilization | `ACTIVE` | `ui` |
| `docs/frontend-compat-terminal-runtime-slice.md` | Frontend Compat Terminal Runtime Slice | `ACTIVE` | `ui` |
| `docs/frontend-migration-finish-gate.md` | Frontend Migration Finish Gate | `ACTIVE` | `ui` |
| `docs/frontend-migration-scope.md` | Frontend Migration Scope | `OUTDATED` | `ui` |
| `docs/frontend-parity-baseline.md` | Frontend Parity Baseline | `DUPLICATE` | `ui` |
| `docs/frontend-post-finish-workspace-audit.md` | Workspace Legacy Call Audit (Post-Finish, Global Store) | `ACTIVE` | `ui` |
| `docs/frontend-run-approval-baseline.md` | frontend `/run` approval baseline | `DUPLICATE` | `execution` |
| `docs/frontend-run-command-baseline.md` | frontend `/run` command baseline | `DUPLICATE` | `execution` |
| `docs/frontend-runtime-adapter-usage.md` | Frontend Runtime Adapter Usage | `ACTIVE` | `ui` |
| `docs/frontend-runtime-bootstrap.md` | Frontend Runtime Bootstrap Truth | `ACTIVE` | `ui` |
| `docs/frontend-stabilization-baseline.md` | Frontend Stabilization Baseline (Slice 1) | `DUPLICATE` | `ui` |
| `docs/frontend-stabilization-result.md` | Frontend Stabilization Result (Slice 1) | `DUPLICATE` | `ui` |
| `docs/frontend-stabilization-slice2-result.md` | Frontend Stabilization Slice 2 Result | `DUPLICATE` | `ui` |
| `docs/frontend-streaming-contract.md` | Frontend Terminal Streaming Contract | `ACTIVE` | `ui` |
| `docs/frontend-streaming-runtime-validation.md` | Runtime Streaming Validation (Slice 3.1) | `ACTIVE` | `validation` |
| `docs/frontend-terminal-action-model.md` | Frontend Terminal Action Model (Active Operator Path) | `ACTIVE` | `ui` |
| `docs/frontend-terminal-action-smoke.md` | Frontend Terminal Action Smoke | `ACTIVE` | `validation` |
| `docs/frontend-terminal-interrupt-validation.md` | Frontend Terminal Interrupt Validation | `ACTIVE` | `validation` |
| `docs/frontend-terminal-midstream-validation.md` | frontend terminal mid-stream validation | `ACTIVE` | `validation` |
| `docs/frontend-terminal-persistence-baseline.md` | frontend terminal persistence baseline | `DUPLICATE` | `ui` |
| `docs/frontend-terminal-persistence-result.md` | frontend terminal persistence result | `DUPLICATE` | `ui` |
| `docs/frontend-terminal-slice-baseline.md` | Terminal Migration Baseline (Slice 5) | `DUPLICATE` | `ui` |
| `docs/frontend-terminal-slice-result.md` | Terminal Slice 5 Result | `DUPLICATE` | `ui` |
| `docs/frontend-terminal-state-sequence.md` | Terminal State Sequence (Slice 3.1) | `ACTIVE` | `ui` |
| `docs/frontend-truth-baseline.md` | Frontend Truth Baseline Snapshot (Slice 1) | `DUPLICATE` | `ui` |
| `docs/frontend-type-error-map.md` | Frontend TypeScript Error Map (Slice 2, Phase 1) | `ACTIVE` | `ui` |
| `docs/frontend-ui-recovery-baseline.md` | Frontend UI Recovery Baseline | `DUPLICATE` | `ui` |
| `docs/frontend-ui-recovery-confirmation.md` | Frontend UI Recovery Confirmation | `ACTIVE` | `ui` |
| `docs/frontend-ui-recovery-state-flow.md` | Frontend UI Recovery State Flow | `ACTIVE` | `ui` |
| `docs/frontend-workspace-slice-baseline.md` | Workspace Migration Baseline (Slice 6) | `DUPLICATE` | `ui` |
| `docs/frontend-workspace-slice-result.md` | Workspace Slice 6 Result | `DUPLICATE` | `ui` |
| `docs/known-limitations.md` | Known Limitations for `v1.0.0-rc1` | `ACTIVE` | `workflow` |
| `docs/layout-composition-baseline.md` | Layout / Composition Baseline | `DUPLICATE` | `workspace` |
| `docs/mcp-external-baseline.md` | MCP external baseline | `DUPLICATE` | `mcp` |
| `docs/mcp-model-baseline.md` | MCP Runtime Model Baseline | `DUPLICATE` | `mcp` |
| `docs/mcp-playground-validation.md` | MCP Playground Validation | `ACTIVE` | `mcp` |
| `docs/mcp-registration-baseline.md` | MCP Registration Baseline | `DUPLICATE` | `mcp` |
| `docs/mcp-ui-baseline.md` | MCP UI Baseline | `DUPLICATE` | `mcp` |
| `docs/mcp-usability-result.md` | MCP Usability Result | `DUPLICATE` | `mcp` |
| `docs/migration-notes.md` | Migration Notes | `OUTDATED` | `_meta` |
| `docs/operator-workflow-baseline.md` | Operator Workflow Baseline | `DUPLICATE` | `workflow` |
| `docs/operator-workflow-result.md` | Operator Workflow Result | `DUPLICATE` | `workflow` |
| `docs/parity-matrix.md` | Parity Matrix | `ACTIVE` | `parity` |
| `docs/plugin-boundary-verification.md` | Plugin Boundary Verification | `ACTIVE` | `plugins` |
| `docs/plugin-execution-model.md` | Plugin Execution Model | `ACTIVE` | `plugins` |
| `docs/plugin-manifest-baseline.md` | Plugin Manifest and Capability Baseline | `DUPLICATE` | `plugins` |
| `docs/plugin-runtime-baseline.md` | Plugin Runtime Baseline | `DUPLICATE` | `plugins` |
| `docs/plugin-runtime-hardening-result.md` | Plugin Runtime Hardening Result | `DUPLICATE` | `plugins` |
| `docs/plugin-runtime-protocol.md` | Plugin Runtime Protocol | `ACTIVE` | `plugins` |
| `docs/plugin-runtime-result.md` | Plugin Runtime Result | `DUPLICATE` | `plugins` |
| `docs/policy-model.md` | RunaTerminal Policy Model | `ACTIVE` | `architecture` |
| `docs/principal-engineer-review.md` | Principal Engineer Review — RunaTerminal | `UNCLEAR` | `workflow` |
| `docs/quick-actions-baseline.md` | Quick Actions Baseline | `DUPLICATE` | `workflow` |
| `docs/quick-actions-browser-validation.md` | Quick Actions Browser Validation | `ACTIVE` | `workflow` |
| `docs/release-1.0.md` | Release `1.0.0-rc1` Truth | `ACTIVE` | `workflow` |
| `docs/release-checklist-1.0.md` | Release Checklist `1.0.0-rc1` | `ACTIVE` | `workflow` |
| `docs/remote-model-baseline.md` | Remote Model Baseline | `DUPLICATE` | `remote` |
| `docs/remote-profile-baseline.md` | Remote Profile Baseline | `DUPLICATE` | `remote` |
| `docs/remote-profile-result.md` | Remote Profile Result | `DUPLICATE` | `remote` |
| `docs/remote-restore-error-baseline.md` | Remote Restore Missing-Profile Error Baseline | `DUPLICATE` | `remote` |
| `docs/remote-ssh-config-import.md` | Remote SSH Config Import Scope | `ACTIVE` | `remote` |
| `docs/remote-workflow-baseline.md` | Remote Workflow Baseline | `DUPLICATE` | `remote` |
| `docs/repo-validation-baseline.md` | Repo Validation Baseline | `DUPLICATE` | `validation` |
| `docs/repo-validation-result.md` | Repo Validation Hardening Result | `DUPLICATE` | `validation` |
| `docs/roadmap.md` | RunaTerminal Roadmap | `ACTIVE` | `workflow` |
| `docs/role-mode-context-baseline.md` | Role/Mode Context Baseline | `DUPLICATE` | `workflow` |
| `docs/run-transcript-baseline.md` | /run Transcript Persistence Baseline | `DUPLICATE` | `workflow` |
| `docs/runtime-truth-cleanup-baseline.md` | Runtime Truth Cleanup Baseline | `DUPLICATE` | `execution` |
| `docs/security-cors-auth-baseline.md` | CORS and Auth Baseline | `DUPLICATE` | `execution` |
| `docs/session-persistence-baseline.md` | Session Persistence Baseline | `DUPLICATE` | `execution` |
| `docs/session-persistence-result.md` | Session Persistence / Restore Result | `DUPLICATE` | `execution` |
| `docs/sse-auth-baseline.md` | SSE Auth Baseline | `DUPLICATE` | `execution` |
| `docs/structured-execution-baseline.md` | Structured Execution Baseline | `DUPLICATE` | `execution` |
| `docs/structured-execution-browser-validation.md` | Structured Execution Browser Validation | `ACTIVE` | `validation` |
| `docs/structured-execution-regression-baseline.md` | Structured Execution Regression Baseline | `DUPLICATE` | `execution` |
| `docs/system-prompts.md` | RunaTerminal System Prompt Profiles | `ACTIVE` | `workflow` |
| `docs/tech-debt-batch-result.md` | Tech Debt Batch Result | `DUPLICATE` | `_meta` |
| `docs/terminal-ansi-baseline.md` | Terminal ANSI baseline | `DUPLICATE` | `workflow` |
| `docs/terminal-architecture.md` | RunaTerminal Terminal Architecture | `ACTIVE` | `architecture` |
| `docs/tideterm-feature-inventory.md` | TideTerm Feature Inventory | `DUPLICATE` | `parity` |
| `docs/tool-adapter-baseline.md` | Tool Adapter Boundary Baseline | `DUPLICATE` | `execution` |
| `docs/tool-runtime.md` | RunaTerminal Tool Runtime | `ACTIVE` | `architecture` |
| `docs/tool-schema-baseline.md` | Dangerous Tool Schema Baseline | `DUPLICATE` | `execution` |
| `docs/validation.md` | Validation Log | `ACTIVE` | `validation` |
| `docs/wave-service-noise-baseline.md` | Legacy `/wave/service` Noise Baseline | `DUPLICATE` | `workflow` |
| `docs/widgets-structural-slice-baseline.md` | widgets.tsx Structural Slice Baseline | `DUPLICATE` | `workspace` |
| `docs/widgets-structural-slice-result.md` | widgets.tsx structural slice result | `DUPLICATE` | `workspace` |
| `docs/window-behavior-gap.md` | Window Behavior Gap Map (Current vs Reference) | `ACTIVE` | `workspace` |
| `docs/window-behavior-reference.md` | Window Behavior Reference (Release-Blocking) | `ACTIVE` | `workspace` |
| `docs/window-behavior-validation.md` | Window Behavior Validation | `ACTIVE` | `workspace` |
| `docs/window-parity-completion-baseline.md` | Window Parity Completion Baseline | `DUPLICATE` | `workspace` |
| `docs/workflow-identity-baseline.md` | Workflow identity baseline | `DUPLICATE` | `workflow` |
| `docs/workflow-identity-result.md` | Workflow identity result | `DUPLICATE` | `workflow` |
| `docs/workspace-model.md` | RunaTerminal Workspace Model | `ACTIVE` | `workspace` |
| `docs/workspace-navigation-baseline.md` | Workspace Navigation Baseline | `DUPLICATE` | `workspace` |
| `docs/workspace-navigation-validation-correction.md` | Workspace Navigation Validation Correction | `ACTIVE` | `workspace` |
