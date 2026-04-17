# Structured Execution Browser Validation

Date: `2026-04-17`  
Mode: `Playwright Chromium headed (visible browser window, not headless)`

## Tide source files checked against visible behavior

- `tideterm/frontend/app/view/term/term-model.ts`
- `tideterm/frontend/app/view/term/term.tsx`
- `tideterm/frontend/app/store/keymodel.ts`
- `tideterm/frontend/app/view/term/termwrap.ts`
- `tideterm/pkg/blockcontroller/shellcontroller.go`
- `tideterm/pkg/aiusechat/usechat-prompts.go`

These repo-root Tide sources remained the primary reference for session identity, terminal ownership, and AI command guardrail behavior. Tide does not expose a literal `/run` UI flow in the inspected sources, so the visible validation below checked the RunaTerminal `/run` path against Tide's explicit terminal-session ownership and command-safety semantics.

## Browser flow used

1. Started an isolated localhost SSH target on `127.0.0.1:53808` with temporary ed25519 host/client keys.
2. Verified that SSH target directly before any UI work:
   - `ssh ... avm@127.0.0.1 -p 53808 'echo remote-ui-guardrail-ok && pwd'`
   - returned `remote-ui-guardrail-ok` and `/Users/avm`
3. Started a live runtime stack:
   - Core API: `http://127.0.0.1:53806`
   - Frontend dev app: `http://127.0.0.1:53807`
   - Ollama-compatible stub provider on an ephemeral localhost port for deterministic explain replies
4. Opened `http://127.0.0.1:53807/` in a visible Playwright Chromium window.
5. Opened the AI panel through the visible launcher path:
   - clicked `workspace-quick-actions-button`
   - clicked quick action `ui.open_ai_panel`
6. Executed local `/run echo local-guardrail-<timestamp>` in the visible AI panel.
7. Confirmed the visible execution block render for the local run.
8. Created a real remote profile against the localhost SSH target and opened a remote session tab in the same runtime.
9. Reloaded the visible browser so the focused remote widget became the active shell context.
10. Re-opened the AI panel through the same launcher path and executed remote `/run echo remote-guardrail-<timestamp>`.
11. Confirmed the visible execution block render for the remote run.
12. Probed invalid requests against that same live runtime:
    - local widget with remote target context
    - remote widget with local target context
    - plugin tool invocation carrying terminal target context
    - MCP invoke without `workspace_id`

## What was visibly verified

- The visible launcher entry path can still open the AI panel after the guardrail hardening.
- Local `/run` still executes in the active local shell and renders a structured execution block in the visible panel.
- Remote `/run` still executes in the active remote shell and renders a structured execution block in the visible panel.
- The visible local block contained the local marker text.
- The visible remote block contained the remote marker text.
- Switching the active execution target from local to remote did not silently drift to the wrong widget or session.

## Runtime/API truth captured during the same headed run

- Local block target:
  - `widget_id: term-main`
  - `target_session: local`
  - `target_connection_id: local`
- Remote block target:
  - `widget_id: term_2d2cfb8bb3231108`
  - `target_session: remote`
  - `target_connection_id: conn_34331faf0ad4fce5`
- Invalid local -> remote mismatch probe returned `400 invalid_input`:
  - `invalid connection: requested remote session but widget term-main is local`
- Invalid remote -> local mismatch probe returned `400 invalid_input`:
  - `invalid connection: requested local session but widget term_2d2cfb8bb3231108 is remote`
- Plugin invocation with leaked terminal target returned `400 invalid_input`:
  - `terminal target context is not allowed for plugin tools`
- MCP invoke without explicit workspace target returned `400 invalid_mcp_request`:
  - `invalid plugin specification: workspace_id is required`

## Remaining mismatch

- none

## Headed/visible note

- This validation used a visible headed Chromium window.
- The result above was not taken from a headless-only run.
