# Quick Actions Baseline

Date: `2026-04-17`  
Phase: `1.0.0-rc1` hardening

## 1. Existing actions that are real but fragmented

Current explicit operator actions are spread across multiple surfaces:

- `Tab bar`: create local tab, create remote tab, open remote profiles, toggle AI panel.
- `Settings` flyout: switch layout mode/surface, save/switch layouts.
- `Files` panel: attach file to AI, use selected path in AI prompt, prepare local `/run`, prepare remote `/run`.
- `Tools` panel: execute tools, apply selected file/widget input helpers, MCP server lifecycle, MCP invoke, explicit MCP-to-AI handoff.
- `Terminal` surface: restart/reconnect session, explain latest output in AI.
- `Remote profiles` modal: create/delete profile, open shell session, prepare `/run` with explicit remote target.

The friction is discoverability and repeated operator clicks across separate panels for routine actions.

## 2. Quick actions scope for this batch

Quick actions should expose a minimal explicit operator entry point for existing behavior only:

- open/bring-forward shell utility surfaces (`AI`, `Tools`, `Audit`, `Files`, `MCP controls`, `Remote profiles`)
- workspace/tab actions already supported (`create local tab`, `switch layout mode`, `save layout`)
- existing explicit context handoffs (`selected file -> AI prompt`, `selected file -> /run prompt`)
- existing explicit terminal explain flow (`explain latest command output in AI`)
- bounded remote session action using an explicit selected remote profile

## 3. Explicit out of scope

- full fuzzy “search everything” system
- global IDE-style command framework
- hidden automation or auto-triggered actions
- command generation magic or implicit prompt execution

## 4. Fit in current shell without redesign

Quick actions should be a compact additive surface in the current workspace utility grammar.
It should not replace existing panels; it should call the same existing APIs/flows and keep backend/runtime truth, policy, and audit behavior unchanged.
