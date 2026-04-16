# Validation Log

Правила ведения:
- одна запись на один validation run
- отсутствие проверки фиксируется как `NOT RUN`, а не маскируется под успешный результат
- записи ниже основаны только на audit trail из `docs/tideterm-feature-inventory.md`, `docs/feature-parity-audit.md` и `docs/feature-gap-summary.md`

## Tool execution

- Date: `2026-04-15`
- Status: `VERIFIED`
- Commits:
  - `b29d308a31d499ee3f4058c398364492d47d37db`
  - `a3ffc447f888bd47d3c11f75a5f08eb5f6a4df1d`
  - `b710490beea31aca5eac345c8bc39db9f03cb80f`
  - `2d0b4d689d22e7ae82a3e92dcf7a05385a58b1b7`
- Tested tool list: `VERIFIED` — active compat UI opened a visible `Tools` floating panel from the right utility rail and rendered `25` tool entries loaded from `GET /api/v1/tools`.
- Tested execution: `VERIFIED` — `workspace.list_widgets` executed through the UI with request body `{"tool_name":"workspace.list_widgets","input":{},"context":{"workspace_id":"ws-local","active_widget_id":"term-main","repo_root":"/Users/avm/projects/Personal/tideterm/runa-terminal"}}` and returned `status: "ok"` with the two terminal widgets in `output.widgets`.
- Tested approval: `VERIFIED` — `safety.add_ignore_rule` executed through the UI with repo-scoped input, returned `status: "requires_confirmation"`, `error_code: "approval_required"` and a visible `pending_approval` block with summary `add ignore rule tool-ui-validation.* (metadata-only)`.
- Tested retry: `VERIFIED` — clicking `Confirm and retry` issued `safety.confirm`, extracted `approval_token`, retried the original `safety.add_ignore_rule` request with that token and produced final `status: "ok"` with a created ignore rule in `output`.
- Notes: `POST /api/v1/tools/execute` for the initial approval challenge still appears in browser console as `Failed to load resource: the server responded with a status of 428 (Precondition Required)`. UI flow continued correctly because the frontend now treats the structured 428 execute body as a tool response rather than a transport crash.

## Audit utility panel

- Date: `2026-04-15`
- Status: `VERIFIED`
- Commits:
  - `32bf420eca4d6d7ddf3987d0dce85fd78e2a132f`
  - `ece14a3293435fbca14c0a0d540253d716a0efb5`
  - `ab9dced527816f87ec14ffd549c51cf0aa09eafe`
- Validation steps:
  - runtime environment: `apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52763 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-audit-ui` with `RTERM_AUTH_TOKEN=audit-ui-token`
  - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52763 VITE_RTERM_AUTH_TOKEN=audit-ui-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4193 --strictPort`
  - в active compat UI открыт `Audit` button в правом utility rail; panel загрузила `GET /api/v1/audit?limit=50`
  - через `Tools` panel выполнен safe path `workspace.list_widgets`; затем audit panel reopened и показала entry `workspace.list_widgets` со статусом `success`, summary `list workspace widgets`, `approval tier: safe`, `workspace: ws-local`
  - через `Tools` panel выполнен approval-required path `safety.add_ignore_rule` с валидным input `{"scope":"repo","matcher_type":"glob","pattern":"audit-ui-validation-*","mode":"metadata-only","note":"audit panel validation"}`; UI показал `pending_approval`, затем `Confirm and retry` выполнил `safety.confirm` и повторный `safety.add_ignore_rule`
  - после reopen audit panel показала связанную цепочку entries: `safety.add_ignore_rule` -> `approval_required`, `safety.confirm` -> `success`, финальный `safety.add_ignore_rule` -> `success` с `approval used: yes`
- Result: `VERIFIED` — active audit utility surface открывается из существующего rail, читает реальные backend events и позволяет увидеть tool -> audit linkage в текущем UI без отдельного API debug surface.
- Notes:
  - page-level runtime exceptions от audit panel wiring не наблюдались
  - browser console по-прежнему показывает `Failed to load resource: the server responded with a status of 428 (Precondition Required)` на approval challenge; UI корректно использует structured response и продолжает flow
  - во время contract discovery две невалидные попытки `safety.add_ignore_rule` дали ожидаемый `400 invalid_input` (`unknown field "reason"` и `invalid ignore rule scope`); после перехода на repo-scoped payload approval path завершился успешно

## Agent / conversation panel

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `ace2a07a547570fd1c8ff9c0c3c35c7dfe5d5d45`
  - `2f52c405de4f1c19bbde64c7be877d3dadf61e46`
  - `2cc6235cfe52d28bc8fe21eb1487820dc362e6b5`
  - `042c27604f65809bb6afd0a265639e40a2db97b2`
  - `84af2d45eb8478195e948b86cb40e9fbb4f549ee`
- Validation steps:
  - runtime environment:
    - Ollama stub: local Node HTTP server on `127.0.0.1:11435`, returning `model: "test-model"` and `message.content: "stub-response: <prompt>"`
    - core: `RTERM_AUTH_TOKEN=agent-slice-token RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11435 RTERM_OLLAMA_MODEL=test-model apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52765 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-agent-ui-validation.GAlmoI`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52765 VITE_RTERM_AUTH_TOKEN=agent-slice-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4195 --strictPort`
  - initial load:
    - active compat shell loaded `GET /api/v1/bootstrap`, `GET /api/v1/agent/conversation`, `GET /api/v1/agent`
    - AI surface rendered compat welcome card plus live selectors `Profile`, `Role`, `Mode`
  - selector wiring:
    - changed `Mode: Implement -> Debug`
    - browser network captured `PUT /api/v1/agent/selection/mode` with body `{"id":"debug"}`
    - UI updated selection summary to `Balanced / Developer / Debug`
  - submit / response:
    - opened the visible AI panel through the shell `AI` toggle
    - entered `hello from compat agent` in the composer and submitted through the visible send button
    - browser network captured `POST /api/v1/agent/conversation/messages` with body `{"prompt":"hello from compat agent","context":{"workspace_id":"ws-local","active_widget_id":"term-main","repo_root":"/Users/avm/projects/Personal/tideterm/runa-terminal","widget_context_enabled":true}}`
    - transcript rendered both the user message and assistant response `stub-response: hello from compat agent`
    - no request to legacy `/api/post-chat-message` was observed in this flow
  - reload / snapshot restore:
    - page reload re-issued `GET /api/v1/bootstrap`, `GET /api/v1/agent/conversation`, `GET /api/v1/agent`
    - transcript after reload still contained the submitted user/assistant pair, proving snapshot hydration from backend state instead of frontend-only local state
- Result: `VERIFIED` — active compat AI surface now loads backend catalog and conversation snapshot, sends a real conversation request through `/api/v1/agent/conversation/messages`, renders the backend response, and persists transcript across reload.
- Notes:
  - browser `consoleErrors`: `0`; page-level runtime exceptions for this validation run were not observed
  - `page.reload({ waitUntil: "networkidle" })` timed out because the terminal SSE path keeps long-lived network activity open; despite that, the page reloaded and the post-reload snapshot/network trail confirmed restored agent state
  - historical note superseded by `84af2d45eb8478195e948b86cb40e9fbb4f549ee`: прежний near-collapsed sliver (`textarea left: -28`, `width: 28`) относился к состоянию до corrective slice visibility/open-state recovery
  - visible panel state restored: `VERIFIED`
  - exact interaction: fresh load `http://127.0.0.1:4195/` -> initial check in closed state -> click shell `AI` toggle -> verify selectors/composer -> send `visibility slice ping` -> open `Tools` and `Audit`
  - observed after visibility recovery:
    - initial closed state: AI toggle видим, но AI composer/selectors не смонтированы (`composerPresent: false`, `selectorIds: []`), terminal/workspace остаются видимыми
    - after open: composer `placeholder="Ask TideTerm AI anything..."`, geometry `x: 2`, `width: 296`, `height: 48`; selectors `agent-profile-select`, `agent-role-select`, `agent-mode-select` видимы
    - transcript stayed usable: UI rendered both `visibility slice ping` and `stub-response: visibility slice ping`
    - panel-adjacent smoke remained green: `Tools` panel still loaded `GET /api/v1/tools`, `Audit` panel still loaded `GET /api/v1/audit?limit=50`
    - runtime noise for this corrective run: `consoleErrors: 0`, `pageErrors: 0`, `loadingFailed: 0`

## /run command

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `9539c9bc01c8b23ca974f05898977e4f53b78083`
  - `a412cdb93632ab71affbe4b8406e12b045d46725`
  - `6cf8556c8f3e0a3cf9fe11ac96e84d4e49ce2694`
  - `d7f980a0c2abef66cd98dee494f2d5fb7918c19d`
  - `def095c564dddd185a22adb9ba94923bd562846a`
  - `666179240ba270adaf96882d10f58917524fd565`
- Validation steps:
  - runtime environment:
    - Ollama stub: local Node HTTP server on `127.0.0.1:11436`, returning `model: "test-model"` and `message.content: "stub-response: <prompt>"`
    - core: `RTERM_AUTH_TOKEN=run-command-token-3 RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11436 RTERM_OLLAMA_MODEL=test-model apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52768 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-run-command-validation-3`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52768 VITE_RTERM_AUTH_TOKEN=run-command-token-3 npm --prefix frontend run dev -- --host 127.0.0.1 --port 4198 --strictPort`
  - open AI panel through the visible shell `AI` toggle in the active compat workspace
  - `/run echo hello`:
    - browser network captured `POST /api/v1/tools/execute` with `tool_name:"term.send_input"` and repo-scoped tool context
    - browser network captured `POST /api/v1/agent/terminal-commands/explain` with `prompt:"/run echo hello"`, `command:"echo hello"`, `widget_id:"term-main"`, `from_seq:4`
    - transcript rendered the user command, a local execution-result message with sanitized output `hello`, and a follow-up assistant explanation message in the existing transcript UI
  - `/run pwd`:
    - browser network captured `POST /api/v1/tools/execute` and `POST /api/v1/agent/terminal-commands/explain` with `command:"pwd"` and `from_seq:18`
    - transcript rendered sanitized command output `/Users/avm/projects/Personal/tideterm/runa-terminal`
  - invalid command:
    - entered `/run definitely-not-a-real-command`
    - browser network captured `POST /api/v1/tools/execute` and `POST /api/v1/agent/terminal-commands/explain` with `command:"definitely-not-a-real-command"` and `from_seq:26`
    - transcript rendered sanitized shell error `zsh: command not found: definitely-not-a-real-command`
- Tested commands:
  - `/run echo hello`: `VERIFIED`
  - `/run pwd`: `VERIFIED`
  - `/run definitely-not-a-real-command`: `VERIFIED`
- Explanation behavior: `VERIFIED` — every tested `/run` request issued `POST /api/v1/agent/terminal-commands/explain`, and the returned assistant message rendered inside the existing AI transcript immediately after the execution-result message.
- Result: `VERIFIED` — the active compat AI panel now detects `/run`, executes the command through the backend tool/runtime path, renders the observed terminal result in the current transcript, and appends the backend explanation response in the same panel without new UI surfaces.
- Notes:
  - validation used a stub Ollama-compatible server, so the assistant text proves explain-route wiring and prompt content rather than final model quality
  - sanitized result rendering now strips ANSI prompt redraw noise and command echo from the local execution-result message and from the backend explanation prompt
  - browser `consoleErrors` for the final `4198` validation run: `0`
  - approval-required `/run` confirm-and-retry path is now covered by [`/run approval confirm-and-retry`](#run-approval-confirm-and-retry)

<a id="run-approval-confirm-and-retry"></a>
## /run approval confirm-and-retry

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `0e6220d0db7bfc76e0f8d4ecfffb0e30c3f37e32`
  - `c99c1cb0261dc93be89d73487900cf7fe0c46615`
  - `9aadc9864b1f7b314a3a25d45db7d4ae468ddc7b`
- Validation steps:
  - runtime environment:
    - Ollama stub: local Node HTTP server on `127.0.0.1:11437`, returning `model: "test-model"` and `message.content: "stub-response: <prompt>"`
    - core: `RTERM_AUTH_TOKEN=run-approval-token RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11437 RTERM_OLLAMA_MODEL=test-model apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52779 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-run-approval-validation.7v55Ci`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52779 VITE_RTERM_AUTH_TOKEN=run-approval-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4201 --strictPort`
  - open AI panel through the visible shell `AI` toggle in the active compat workspace
  - safe `/run` command:
    - with `Profile: Balanced`, entered `/run echo slice-safe`
    - transcript rendered the user command, a local execution-result message with sanitized output `slice-safe`, and a follow-up assistant explanation message in the existing transcript
  - approval-required `/run` command:
    - changed `Profile: Balanced -> Hardened`
    - entered `/run echo needs-approval`
    - UI showed an inline approval card in the current AI panel flow:
      - title: `Approval required for \`/run echo needs-approval\``
      - summary: `send input to term-main: echo needs-approval`
      - tier: `dangerous`
    - clicked `Confirm and retry`
    - browser network captured:
      - `POST /api/v1/tools/execute` -> `428 Precondition Required` for the initial `term.send_input`
      - `POST /api/v1/tools/execute` with `tool_name:"safety.confirm"` and `approval_id:"approval_291817ec8ab8d4fd"`
      - retry `POST /api/v1/tools/execute` for `term.send_input` with `approval_token:"befff02daffe86bc582feaccf69c0b79"`
      - `POST /api/v1/agent/terminal-commands/explain` with `approval_used:true`
    - transcript rendered the final execution-result message with sanitized output `needs-approval` and a follow-up assistant explanation message
  - audit coherence:
    - `GET /api/v1/audit?limit=12` returned the linked sequence:
      - `term.send_input` -> `success:false`, `error:"approval_required"`
      - `safety.confirm` -> `success:true`
      - retried `term.send_input` -> `success:true`, `approval_used:true`
      - `agent.terminal_command` -> `success:true`, `approval_used:true`
  - shell launch smoke:
    - `RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11437 RTERM_OLLAMA_MODEL=test-model npm run tauri:dev`
    - Tauri reached desktop runtime startup and printed `Running target/debug/rterm-desktop`
    - the spawned core reported ready state `{\"base_url\":\"http://127.0.0.1:52300\",\"pid\":69465}`
    - the smoke was then interrupted intentionally after ready-state confirmation
- Tested commands:
  - `/run echo slice-safe`: `VERIFIED`
  - `/run echo needs-approval`: `VERIFIED`
- Approval state: `VERIFIED` — the active compat AI panel now surfaces approval-required `/run` requests with an inline `Confirm and retry` action instead of dropping the pending approval metadata.
- Confirm action: `VERIFIED` — clicking `Confirm and retry` used the existing `safety.confirm` contract and retried the original `term.send_input` request with the returned one-time `approval_token`.
- Final result: `VERIFIED` — after approval, the AI transcript showed both the local execution result and the backend explanation response for the original `/run` request.
- Notes:
  - browser console recorded one expected `428 Precondition Required` resource error for the initial approval challenge; the UI flow continued correctly and no fatal runtime exceptions were observed
  - `npm run validate`: `NOT VERIFIED` for this slice because the repo currently has broad pre-existing frontend lint failures unrelated to `/run` approval wiring; the failure occurred before the validation script could reach `build:frontend`, `test:go`, `build:go`, or `tauri:check`

## Explain approval truth

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `c606c126d10da49411b43645ec7c615ea932ef86`
  - `6805a4ef54f0798e1d5b9da5147782750d2432e8`
- Validation steps:
  - `npm run build:core`
  - `go test ./core/app ./core/transport/httpapi`
  - runtime environment:
    - Ollama stub: local Node HTTP server on `127.0.0.1:11438`, returning `model: "test-model"` and `message.content: "stub-response: <prompt>"`
    - core: `RTERM_AUTH_TOKEN=explain-truth-token RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11438 RTERM_OLLAMA_MODEL=test-model apps/desktop/bin/rterm-core serve --listen 127.0.0.1:61420 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-explain-truth/state --ready-file /tmp/rterm-explain-truth/ready.json`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:61420 VITE_RTERM_AUTH_TOKEN=explain-truth-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4203 --strictPort`
  - visible `/run` safe path:
    - with `Profile: Balanced`, entered `/run echo explain-safe` in the active compat AI panel
    - transcript rendered the execution result `explain-safe` and a follow-up explanation message
  - visible `/run` approval path:
    - changed `Profile: Balanced -> Hardened`
    - entered `/run echo explain-approval`
    - UI showed `Approval required for \`/run echo explain-approval\`` with summary `send input to term-main: echo explain-approval`
    - clicked `Confirm and retry`
    - transcript rendered the execution result `explain-approval` and a follow-up explanation message
    - browser console recorded one expected `428 Precondition Required` resource error for the initial approval challenge and no fatal runtime exceptions
  - direct API safe-truth check:
    - executed `term.send_input` for `echo api-safe-truth-1776340188707`
    - called `POST /api/v1/agent/terminal-commands/explain` with deliberately wrong payload `approval_used:true`
    - audit result:
      - matching `term.send_input` success event had no `approval_used`
      - resulting `agent.terminal_command` event also had no `approval_used`
  - direct API approval-truth check:
    - with `Profile: Hardened`, executed `term.send_input` for `echo api-approval-truth-1776340188871`
    - observed HTTP `428` approval challenge
    - confirmed through `safety.confirm`
    - retried with returned `approval_token`
    - called `POST /api/v1/agent/terminal-commands/explain` with deliberately wrong payload `approval_used:false`
    - audit result:
      - matching approved `term.send_input` success event had `approval_used:true`
      - resulting `agent.terminal_command` event also had `approval_used:true`
- Safe explain truth: `VERIFIED` — the backend ignored a client-supplied `approval_used:true` value and recorded the explain step as unapproved when the matching execution was unapproved.
- Approved explain truth: `VERIFIED` — the backend ignored a client-supplied `approval_used:false` value and recorded the explain step as approved when the matching execution had consumed approval.
- Exact observed result: `VERIFIED` — explain `approval_used` now comes from backend execution/audit truth, not from the frontend payload.
- Notes:
  - the active frontend still sends the legacy `approval_used` field on approved `/run` explains; this slice hardens the backend by ignoring that input instead of depending on it
  - validation used a stub Ollama-compatible server, so assistant text proves explain routing and context wiring rather than model quality

## Approval intent binding

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `beced21dd86353ff9037e40134095f6c032b7796`
  - `e8c8a811a244ee5eee9ec7fbfeff593f543aeb33`
  - `16174b0f1f78c51dd69a7501690134ff8eb2f2d2`
  - `5eb02e8803f06ebe428ae197802e967f8c3022a6`
- Validation steps:
  - `npm run build:core`
  - `go test ./core/toolruntime ./core/transport/httpapi`
  - `npx vitest run frontend/rterm-api/tools/client.test.ts frontend/compat/tools.test.ts frontend/app/aipanel/run-command.test.ts --config frontend/vite.config.ts`
  - `npm run build:frontend`
  - `npm run tauri:dev`
  - runtime environment:
    - core: `RTERM_AUTH_TOKEN=approval-bind-token apps/desktop/bin/rterm-core serve --listen 127.0.0.1:61410 --state-dir /tmp/rterm-approval-binding-v2/state --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --ready-file /tmp/rterm-approval-binding-v2/ready.json`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:61410 VITE_RTERM_AUTH_TOKEN=approval-bind-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4202 --strictPort`
  - matched `/run` approval path:
    - switched `Profile` to `Hardened`
    - entered `/run echo intent-ui-match-v2`
    - UI showed `Approval required for \`/run echo intent-ui-match-v2\`` with summary `send input to term-main: echo intent-ui-match-v2`
    - clicked `Confirm and retry`
    - transcript rendered the execution result `intent-ui-match-v2` and the follow-up assistant explanation
  - matched tools-panel approval path:
    - opened `safety.add_ignore_rule`
    - used payload `{"scope":"repo","matcher_type":"glob","pattern":"approval-intent-ui-v2-*","mode":"metadata-only","note":"approval intent binding ui v2"}`
    - UI showed `approval required: add ignore rule approval-intent-ui-v2-* (metadata-only)`
    - clicked `Confirm and retry`
    - final response rendered `status:"ok"` with the created ignore rule for `approval-intent-ui-v2-*`
  - mismatched retry path:
    - obtained an approval challenge for `safety.add_ignore_rule` with pattern `approval-intent-api-source-1776339013975-*`
    - confirmed it through `safety.confirm` and received token `fce1c27ed6b579f2720ce170a511e546`
    - retried with changed input pattern `approval-intent-api-changed-1776339013975-*`
    - observed HTTP `403` with `status:"error"` and `error_code:"approval_mismatch"`
    - retried again with the original approved request and observed HTTP `200` with `status:"ok"`
  - audit coherence:
    - `/run` success path produced `approval_required` -> `safety.confirm` -> approved `term.send_input` with `approval_used:true` -> `agent.terminal_command` with `approval_used:true`
    - tools-panel success path produced `approval_required` -> `safety.confirm` -> approved `safety.add_ignore_rule` with `approval_used:true`
    - mismatch path produced blocked original request -> `safety.confirm` -> changed request failure with `approval token does not match the requested execution intent` -> original request success with `approval_used:true`
  - shell launch smoke:
    - `npm run tauri:dev`
    - reached `Running target/debug/rterm-desktop`
    - the spawned core reported ready state `{"base_url":"http://127.0.0.1:56288","pid":88753}`
    - the smoke was interrupted intentionally after ready-state confirmation
- Matched approval path: `VERIFIED` — both the active `/run` flow and the current tools-panel flow still complete confirm-and-retry successfully against the hardened backend contract.
- Mismatched retry path: `VERIFIED` — changing the approved request input caused an explicit backend rejection with `approval_mismatch`, and the same token still worked for the original approved request.
- Exact observed result: `VERIFIED` — approval is now bound to the full execution intent for retry verification rather than to `tool_name` alone.
- Notes:
  - the final recorded results are from the rebuilt core binary after `npm run build:core`; an earlier stale-core run was discarded once it was clear the old binary was still serving requests
  - the current UI intentionally replays the original request, so mismatched retry was validated through a direct API probe rather than through a visible panel control
  - browser console still records the expected `428 Precondition Required` resource error for the initial approval challenge in matched UI flows; no fatal runtime exceptions were observed
  - `npm run validate`: `NOT VERIFIED` for this slice because the repo still has broad pre-existing frontend lint failures unrelated to approval intent binding

## widgets.tsx structural refactor

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `c79a071795dd9d602de8f9ba6c73b106f0acdbe9`
  - `7eb627212263f2f33084ed3baa4f73975dc5482c`
  - `476ccf6f2cea0273762e07db33dc578a6bcab61b`
  - `2badc26f4c1978ef30e590be81cd98c1c031de0f`
- Validation steps:
  - `npx tsc -p frontend/tsconfig.json --noEmit`
  - `npm --prefix frontend run build`
  - runtime environment:
    - `apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52763 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-widgets-slice` with `RTERM_AUTH_TOKEN=widgets-slice-token`
    - `VITE_RTERM_API_BASE=http://127.0.0.1:52763 VITE_RTERM_AUTH_TOKEN=widgets-slice-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4193 --strictPort`
  - fresh load показал active compat workspace с tab bar (`Main Shell`, `Ops Shell`), terminal area и utility rail
  - terminal input проверен через реальный UI click на `.xterm-screen` и команды `echo widgets-structural-slice`, затем `echo post-switch-check`; DOM `.xterm-rows` отобразил обе команды и их output
  - tools panel открывается из utility rail, загружает tool list (`GET /api/v1/tools`) и показывает active contract surface (`connections.check`, `workspace.list_widgets`, `term.send_input`, ...)
  - audit panel открывается из utility rail, загружает `GET /api/v1/audit?limit=50` и корректно рендерит empty-state `No audit events available`
  - tab switching выполнен через последовательность `Main Shell -> Ops Shell -> Main Shell -> Ops Shell -> Main Shell`; network trail подтвердил `POST /api/v1/workspace/focus-tab`, snapshot refresh для `term-main`/`term-side` и stream remount на обоих widget ids
  - backend snapshot после switch: `GET /api/v1/terminal/term-main?from=0` вернул `next_seq: 75`, `chunk_count: 74`, `has_widgets_slice: true`, `has_post_switch: true`
- Result: `VERIFIED` — structural split не сломал active compat runtime path: workspace рендерится, terminal принимает input и отдаёт output, tools/audit floating windows открываются, tab switching продолжает работать через текущий workspace/terminal contract.
- Notes:
  - browser console messages во время validation: `28`, `Errors: 0`, `Warnings: 0`
  - observed network requests для проверенного flow завершились `200 OK`; request failures в этом run не наблюдались
  - immediate DOM probe сразу после rapid tab switching не доказал видимость прежнего output в текущем viewport, но backend snapshot подтвердил сохранность и `widgets-structural-slice`, и `post-switch-check`; в рамках structural slice это отмечено как observation, а не как regression proof

## Terminal output persistence across tab switch

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `79c05855af26a73d0e602809f7a0fd8e723eb03f`
  - `76aa0104649197383464e57a55587984198a9f3f`
- Validation steps:
  - runtime environment:
    - core: `RTERM_AUTH_TOKEN=terminal-persist-token apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52769 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-terminal-persistence-validation`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52769 VITE_RTERM_AUTH_TOKEN=terminal-persist-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4199 --strictPort`
  - commands entered in `Main Shell`:
    - `echo PERSIST_HOTFIX_A1`
    - `pwd`
    - `echo PERSIST_HOTFIX_AFTER_RETURN`
  - switch sequence:
    - `Main Shell -> Ops Shell -> Main Shell`
    - `Main Shell -> Ops Shell -> Main Shell` repeated once more
  - observed in the visible terminal renderer:
    - before the first switch, `.view-term` contained `echo PERSIST_HOTFIX_A1`, `PERSIST_HOTFIX_A1`, `pwd`, and `/Users/avm/projects/Personal/tideterm/runa-terminal`
    - after switching back, `.view-term` still contained the same output with unchanged counts: `PERSIST_HOTFIX_A1 = 2`, `/Users/avm/projects/Personal/tideterm/runa-terminal = 1`
    - after running `echo PERSIST_HOTFIX_AFTER_RETURN`, the terminal rendered the new command and output without reset
    - after the second switch-back, counts remained stable: `PERSIST_HOTFIX_A1 = 2`, `/Users/avm/projects/Personal/tideterm/runa-terminal = 1`, `PERSIST_HOTFIX_AFTER_RETURN = 2`
  - backend consistency check:
    - `GET /api/v1/terminal/term-main?from=0` returned `state.widget_id: "term-main"`, `next_seq: 79`, `chunk_count: 78`
    - snapshot tail still contained `PERSIST_HOTFIX_AFTER_RETURN`
  - adjacent smoke checks:
    - AI panel opened through the existing `AI` toggle
    - `Tools` panel opened and rendered the tool catalog
    - `Audit` panel opened and rendered its empty state
    - browser console errors for the final validation window: `0`
- Tested commands:
  - `echo PERSIST_HOTFIX_A1`: `VERIFIED`
  - `pwd`: `VERIFIED`
  - `echo PERSIST_HOTFIX_AFTER_RETURN`: `VERIFIED`
- Result: `VERIFIED` — switching away from a terminal tab and back now restores the prior visible output from backend snapshot state, does not duplicate restored lines across repeated remounts, and continues to accept new commands with live output.
- Notes:
  - validation covered repeated remount replay with short command output; a separate mid-stream long-running command switch test was `NOT RUN`
  - terminal persistence remained backend-sourced: snapshot replay plus resumed stream, not a keep-alive-only workaround

## Terminal mid-stream persistence

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `0b1602b7cc87822414dd27b82dc8ea03e6db02e2`
  - `5f8fd7ecb87cecb3871441570caebbc1f85499e2`
- Validation steps:
  - runtime environment:
    - core: `RTERM_AUTH_TOKEN=terminal-midstream-token apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52770 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-terminal-midstream-validation`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52770 VITE_RTERM_AUTH_TOKEN=terminal-midstream-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4200 --strictPort`
  - tested command:
    - `python3 -u -c "import time; [print(f'MIDSTREAM_AUTO_{i:02d}', flush=True) or time.sleep(0.3) for i in range(1, 31)]"`
  - switch sequence:
    - run in `Main Shell`
    - wait `700ms`
    - switch to `Ops Shell`
    - wait `2500ms`
    - switch back to `Main Shell`
  - observed marker progression in the visible renderer:
    - before switch: `MIDSTREAM_AUTO_01`
    - `600ms` after return: `MIDSTREAM_AUTO_01..12`
    - `1500ms` later on the returned tab: `MIDSTREAM_AUTO_01..17`
    - final state after completion: `MIDSTREAM_AUTO_01..30`
  - duplication / gap check:
    - final renderer state contained all `30` markers exactly once each
    - no missing markers
    - no duplicate markers
  - backend / runtime checks:
    - `GET /api/v1/terminal/term-main?from=0` returned `auto_markers: 30` with the terminal session still `running`
    - browser console errors for the validation window: `0`
- Result: `VERIFIED` — switching away during active terminal output and returning preserves already-emitted lines, restores lines produced while the tab is hidden, and continues live output on the remounted renderer without duplicate replay.
- Notes:
  - this run used line-oriented stdout markers; a separate ANSI-heavy long-running redraw scenario was `NOT RUN`
  - no code fix was needed in this slice because the current snapshot-plus-stream replay path behaved correctly under the tested mid-stream switch

<a id="feature-terminal-input"></a>
## Ввод в терминал

- Date: `2026-04-15`
- Status: `VERIFIED`
- Commit: `0110fa8af9a972f597c11248c829549815324e7d`
- Validation steps: Live runtime smoke: `POST /api/v1/terminal/{widget}/input` на активный terminal widget; затем проверка output в snapshot/terminal surface.
- Result: VERIFIED: input дошёл до current terminal runtime и вернулся видимым output.
- Notes: Источник истины: phase 3 в `docs/feature-parity-audit.md`.

<a id="feature-terminal-stream-output"></a>
## Потоковый вывод терминала

- Date: `2026-04-15`
- Status: `VERIFIED`
- Commit: `0110fa8af9a972f597c11248c829549815324e7d`
- Validation steps: Live runtime smoke: чтение `GET /api/v1/terminal/{widget}` и активного stream path после terminal input.
- Result: VERIFIED: snapshot и live output вернули ожидаемый terminal текст и согласованный `next_seq`.
- Notes: Источник истины: phase 3 в `docs/feature-parity-audit.md`.

<a id="feature-terminal-scrollback-snapshot-hydration"></a>
## Scrollback / snapshot hydration

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Store сначала refresh snapshot, затем поднимает stream от `next_seq`. 

<a id="feature-terminal-interrupt-active-session"></a>
## Interrupt активной terminal session

- Date: `2026-04-15`
- Status: `VERIFIED`
- Commit: `0110fa8af9a972f597c11248c829549815324e7d`
- Validation steps: Live runtime smoke: запуск long-running command и `term.interrupt` через current tool execution path.
- Result: VERIFIED: runtime вернул structured interrupt response с `interrupted:true`.
- Notes: Ограничение из audit сохраняется: мгновенная отмена long-running команды ещё отмечена как ограничение.

<a id="feature-terminal-copy-paste-shortcuts"></a>
## Клавиатурные copy/paste shortcuts

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Compat terminal всё ещё использует legacy clipboard handlers поверх активного terminal runtime. 

<a id="feature-terminal-follow-output-jump-latest"></a>
## Follow output / jump to latest

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Автоскролл и scrollback есть, но активный compat shell не даёт доказанной TideTerm-like visible `Jump to latest` control surface. 

<a id="feature-terminal-drag-drop-paths"></a>
## Drag & drop путей в терминал

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Local drop-handling есть, но полный TideTerm flow с remote files blocks на active path не подтверждён. 

<a id="feature-terminal-open-current-directory-new-block"></a>
## Открытие текущей директории терминала в новом block

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Есть только legacy `AppInner` context-menu path; `CompatAppInner` его не подключает. 

<a id="feature-terminal-multi-session-block"></a>
## Multi-session terminals в одном terminal block

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Compat tab renderer держит один terminal widget; session sidebar/session list не подключены. 

<a id="feature-terminal-remote-tmux-resume-manager"></a>
## Remote tmux resume и tmux session manager

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: В репозитории остался legacy UI/RPC слой, но активный compat path работает на new core HTTP API без этого runtime wiring. 

<a id="feature-workspace-block-based-surface"></a>
## Block-based workspace с terminal/files/preview/web/editor/AI

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Legacy non-terminal views лежат в repo, но compat tab content в active path рендерит только terminal widget и иначе показывает `Unsupported Widget`. 

<a id="feature-workspace-create-block-sidebar-launcher"></a>
## Создание block через sidebar / launcher surface

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Entry points `createBlock(...)` сохранились, но active compat workspace snapshot backend-owned и не даёт доказанной parity для non-terminal blocks. 

<a id="feature-workspace-drag-rearrange-blocks"></a>
## Drag/rearrange blocks внутри workspace

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Активный compat path не использует legacy `TileLayout`; block layout DnD отсутствует. 

<a id="feature-workspace-tab-switching-focus"></a>
## Tab switching / focus

- Date: `2026-04-15`
- Status: `VERIFIED`
- Commit: `0110fa8af9a972f597c11248c829549815324e7d`
- Validation steps: Live runtime smoke: `POST /api/v1/workspace/focus-tab` для `tab-main -> tab-ops -> tab-main`.
- Result: VERIFIED: `active_tab_id` и `active_widget_id` менялись согласованно.
- Notes: Источник истины: phase 3 в `docs/feature-parity-audit.md`.

<a id="feature-workspace-create-terminal-tab"></a>
## Создание terminal tab

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Новые terminal tabs создаются через dedicated workspace endpoints. 

<a id="feature-workspace-rename-pin-close-tab"></a>
## Rename / pin / close tab

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Эти tab mutations wired к новому workspace API. 

<a id="feature-workspace-drag-reorder-tabs"></a>
## Drag reorder tabs

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Reorder работает, но текущий workspace contract уже и проще TideTerm block/tab grammar. 

<a id="feature-workspace-focus-widget-quick-access"></a>
## Focus widget / quick widget access

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Compat workspace по-прежнему показывает widget rail и умеет фокусировать известные widgets из snapshot. 

<a id="feature-ux-ai-sidebar-panel"></a>
## AI sidebar / AI panel

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Левая AI surface реально монтируется в active compat shell. 

<a id="feature-ux-workspace-switcher"></a>
## Workspace switcher

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Workspace switcher surface есть, но полноценная multi-workspace semantics на current runtime не подтверждена. 

<a id="feature-ux-searchable-launcher"></a>
## Searchable launcher / app entry

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Launcher-related legacy surfaces существуют, но active compat path не даёт доказанной non-terminal parity. 

<a id="feature-ux-right-utility-widget-dock"></a>
## Right utility / widget dock

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Правая utility rail активна и видима в compat shell. 

<a id="feature-ux-settings-help-surfaces"></a>
## Settings / help surfaces

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Gear/help entrypoints есть, но они опираются на legacy `createBlock` views вне доказанного compat render path. 

<a id="feature-ux-connections-panel"></a>
## Connections panel

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Backend connection domain реальный, но TideTerm-like dedicated connections panel в active compat shell не подтверждён. 

<a id="feature-ux-runtime-tools-audit-panels"></a>
## Runtime tools / audit utility panels

- Date: `2026-04-15`
- Status: `VERIFIED`
- Commit: `ab9dced527816f87ec14ffd549c51cf0aa09eafe`
- Validation steps: Через active compat right rail проверены оба surface: `Tools` panel прошёл list/execute/approval/retry поверх `/api/v1/tools/execute`, а `Audit` panel загрузил `/api/v1/audit` и отобразил реальные entries после safe tool и approval flow.
- Result: Combined `tools / audit` utility surface подтверждён на active compat path: user может открыть оба panel, выполнить tool и увидеть его audit trail в текущем UI.
- Notes: Browser console всё ещё фиксирует `428 Precondition Required` на approval challenge как сетевой ресурсный error, но это не ломает active tools/audit flow; подробности run записаны в секции `Audit utility panel`.

<a id="feature-ai-persistent-conversation-transcript"></a>
## Persistent conversation transcript

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Новый backend conversation storage есть, но active compat AIPanel всё ещё использует legacy WaveAI transport, а не `/api/v1/agent/conversation`. 

<a id="feature-ai-prompt-profile-selection"></a>
## Prompt profile selection

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: В core есть prompt profiles, но active compat AI UI завязан на legacy `waveai` mode config, не на new agent catalog. 

<a id="feature-ai-role-preset-selection"></a>
## Role preset selection

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Backend role presets есть, но active compat UI не использует новый `agent` catalog path. 

<a id="feature-ai-work-mode-selection"></a>
## Work mode selection

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Runtime path существует, однако активная UI wiring остаётся legacy-mode driven. 

<a id="feature-ai-free-text-conversation"></a>
## Free-text AI conversation

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: `NOT VERIFIED` для active UI: free-text conversation реализован в new core, но active compat AIPanel по коду продолжает ждать `/api/post-chat-message`, которого в current core нет. 

<a id="feature-ai-run-command-execution-path"></a>
## Явный `/run <command>` execution path

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `9539c9bc01c8b23ca974f05898977e4f53b78083`
  - `a412cdb93632ab71affbe4b8406e12b045d46725`
  - `d7f980a0c2abef66cd98dee494f2d5fb7918c19d`
  - `def095c564dddd185a22adb9ba94923bd562846a`
  - `666179240ba270adaf96882d10f58917524fd565`
- Validation steps: See [`/run command`](#run-command).
- Result: `VERIFIED` — active compat AI panel now detects `/run`, sends `term.send_input` through `POST /api/v1/tools/execute`, waits for terminal output from the captured `next_seq`, and renders the observed result in the existing transcript.
- Notes: Validation confirmed real `/run` UI wiring on `http://127.0.0.1:4198/`; the pre-slice audit note about plain-text fallback is no longer true for the active compat path.

<a id="feature-ai-terminal-command-explanation"></a>
## Объяснение результата terminal command

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `6cf8556c8f3e0a3cf9fe11ac96e84d4e49ce2694`
  - `666179240ba270adaf96882d10f58917524fd565`
- Validation steps: See [`/run command`](#run-command).
- Result: `VERIFIED` — active compat AI panel now calls `POST /api/v1/agent/terminal-commands/explain` after command execution and renders the returned assistant response in the existing transcript UI.
- Notes: Final validation used a deterministic stub provider, so the assistant text echoed the explain prompt content; this still verified the explain-route request shape, ordering, and transcript rendering.

<a id="feature-ai-approval-flow"></a>
## Approval внутри AI/tool flow

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `0e6220d0db7bfc76e0f8d4ecfffb0e30c3f37e32`
  - `c99c1cb0261dc93be89d73487900cf7fe0c46615`
  - `9aadc9864b1f7b314a3a25d45db7d4ae468ddc7b`
- Validation steps: See [`/run approval confirm-and-retry`](#run-approval-confirm-and-retry).
- Result: `VERIFIED` — backend approval flow and the active compat AI panel now complete the full `requires_confirmation -> safety.confirm -> retry with approval_token` path for `/run`.
- Notes: Validation confirmed visible approval state in the active AI panel, successful confirm-and-retry, and coherent audit events with `approval_used:true` on the approved retry path.

<a id="feature-ai-manual-tool-catalog-json-execution"></a>
## Manual tool catalog и JSON execution

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Active operator/tool console surface не найдена; при этом backend `POST /api/v1/tools/execute` path отдельно `VERIFIED` через live runtime smoke. 

<a id="feature-runtime-local-pty-sessions"></a>
## Local PTY sessions

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Активный terminal runtime локально работает на new PTY service. 

<a id="feature-runtime-saved-ssh-profiles"></a>
## Saved SSH profiles

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Saved SSH profiles backend-owned и типизированы. 

<a id="feature-runtime-default-connection-selection"></a>
## Выбор default connection для новых shell launches

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Active connection selection для future tabs реализован. 

<a id="feature-runtime-preflight-connection-check"></a>
## Preflight connection check

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Dedicated check flow есть в runtime/API. 

<a id="feature-runtime-open-shell-selected-connection"></a>
## Open shell against selected connection

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: New terminal tab может стартовать с `connection_id`. 

<a id="feature-runtime-remote-file-browsing"></a>
## Remote file browsing

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Активный compat workspace не поддерживает non-terminal remote file widgets, а new core не содержит TideTerm fileshare parity. 

<a id="feature-runtime-remote-file-preview-edit"></a>
## Remote file preview/edit

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Остались legacy views, но active compat render path и new runtime contract их не подтверждают. 

<a id="feature-runtime-wsl-connections"></a>
## WSL connections

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: В current `core/connections` есть только `local | ssh`; отдельного WSL runtime/domain path нет. 

<a id="feature-runtime-wsh-remote-helper-workflow"></a>
## `wsh` remote helper workflow

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: New core remote model намеренно не использует TideTerm `wsh` remote helper stack. 

<a id="feature-runtime-wsh-cli-control"></a>
## `wsh` CLI для workspace/runtime control

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: В current repo нет аналога TideTerm `cmd/wsh/*`. 

<a id="feature-policy-trusted-rules-management"></a>
## Trusted rules management

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Backend policy rules есть, но active compat shell не даёт доказанной full settings parity surface. 

<a id="feature-policy-ignore-secret-rules-management"></a>
## Ignore / secret rules management

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Ignore rules поддерживаются runtime, но user-facing compat settings surface остаётся неполной и legacy-driven. 

<a id="feature-policy-allowed-roots-capability-enforcement"></a>
## Allowed roots / capability enforcement

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Enforcement реализован в backend execution pipeline. 

<a id="feature-policy-approval-token-confirm-flow"></a>
## Approval token confirm flow

- Date: `2026-04-15`
- Status: `VERIFIED`
- Commit: `0110fa8af9a972f597c11248c829549815324e7d`
- Validation steps: Live runtime smoke: dangerous tool call -> `requires_confirmation` -> `safety.confirm` -> retry с approval token -> replay consumed token.
- Result: VERIFIED: approval token одноразовый; retry проходит, повторный replay снова требует confirmation.
- Notes: Это backend/API-level validation; UI parity для AI/tool surface audit не считает завершённой.

<a id="feature-policy-audit-trail"></a>
## Audit trail

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Audit log backend-owned и доступен по API, но active compat audit panel surface не найдена. 

<a id="feature-policy-profile-role-mode-overlay"></a>
## Profile/role/mode policy overlay

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Overlay logic существует в backend, но active compat AI UI не wired to new agent selection API. 

<a id="feature-ux-language-switch"></a>
## Мгновенное переключение языка English / 中文

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Legacy i18n UI осталась, но active compat shell не даёт доказанного settings route до рабочего language switch. 

<a id="feature-ux-window-title-auto-rename"></a>
## Window title auto / rename

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: `WindowTitleManager` подключён только в `AppInner`; `CompatAppInner` его не монтирует. 

<a id="feature-ux-mcp-server-manager"></a>
## MCP server manager

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Legacy UI/RPC residue есть, но в current `core/` нет подтверждённого MCP runtime/API parity. 

<a id="feature-ux-api-proxy-waveproxy"></a>
## API Proxy / WaveProxy

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Legacy proxy UI присутствует, но current core/runtime path для TideTerm WaveProxy отсутствует. 
