# Settings UI Ergonomics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the settings modal easier to use by removing duplicate headings, unclear system language, and default diagnostic noise.

**Architecture:** Keep the work inside the settings widget layer. Copy remains in settings copy modules, shared visual rules remain in settings widget style modules, and backend/runtime semantics are not moved into the frontend.

**Tech Stack:** React, Vitest, Testing Library, existing `frontend/src/widgets/settings/*` components and shared UI primitives.

---

### Task 1: Lock the Settings Ergonomics Contract

**Files:**
- Create: `frontend/src/widgets/settings/settings-shell-widget.test.tsx`
- Modify: `frontend/src/widgets/settings/agent-provider-settings-widget.test.tsx`
- Modify: `frontend/src/widgets/shell/right-action-rail-widget.test.tsx`

- [x] Add tests that the Russian settings shell opens on clear section language, has no duplicated shell-style intro copy in the sidebar, and keeps the AI provider widget embedded without a second identical title.
- [x] Add tests that embedded AI provider settings do not show run diagnostics before an operator selects a run.
- [x] Add tests that Russian visible copy avoids user-facing `gateway`, `settings sections`, `Conversation`, `Актор`, and `Resolved route` wording.
- [x] Run the focused test set and confirm it fails on the current UI.

### Task 2: Simplify Russian Copy

**Files:**
- Modify: `frontend/src/widgets/settings/settings-shell-copy.ts`
- Modify: `frontend/src/widgets/settings/agent-provider-settings-widget-copy.ts`
- Modify: `frontend/src/widgets/shell/right-action-rail-widget-copy.ts`

- [x] Replace system-facing phrases with operator-facing Russian terms.
- [x] Rename slash headers such as `AI / Провайдеры` to natural section titles.
- [x] Keep domain terms only where they are product terms: `AI`, `MCP`, `Commander`, `Codex CLI`, `Claude Code CLI`, and OpenAI-compatible HTTP.

### Task 3: Remove Duplicate Visual Chrome

**Files:**
- Modify: `frontend/src/widgets/settings/settings-shell-widget.tsx`
- Modify: `frontend/src/widgets/settings/settings-shell-widget.styles.ts`
- Modify: `frontend/src/widgets/settings/agent-provider-settings-widget.tsx`
- Modify: `frontend/src/widgets/settings/agent-provider-settings-widget.styles.ts`

- [x] Replace the verbose sidebar product header with a compact section header.
- [x] Keep one active-section title/description in the shell content header.
- [x] In embedded provider mode, render only provider action buttons in the local toolbar.
- [x] Do not auto-select the first provider run for diagnostics; show diagnostics only after the user selects a run.
- [x] Move any new inline style objects into the widget style module.

### Task 4: Verify, Document, Commit, Push

**Files:**
- Modify: `frontend/docs/ui-architecture.md`
- Modify: `docs/validation/ui.md`

- [x] Run focused settings tests.
- [x] Run active lint/import guards and `git diff --check`.
- [x] Browser-smoke the settings modal in IAB at `http://127.0.0.1:5173/`.
- [x] Update UI architecture and validation notes.
- [x] Commit and push the reviewable step.
