# Validation Log

Правила ведения:
- одна запись на один validation run
- отсутствие проверки фиксируется как `NOT RUN`, а не маскируется под успешный результат
- записи ниже основаны только на audit trail из `docs/tideterm-feature-inventory.md`, `docs/feature-parity-audit.md` и `docs/feature-gap-summary.md`

<a id="operator-workflow"></a>
## Operator workflow

- Date: `2026-04-16`
- Status: `VERIFIED`
- Validation steps:
  - canonical operator-workflow script: `python3 scripts/validate_operator_workflow.py`
  - clean run output:
    - `base_url`: `http://127.0.0.1:60898`
    - `ollama_stub_url`: `http://127.0.0.1:60897`
    - `select_file_use_in_ai`: `ok`
    - `select_file_use_in_run_related_flow`: `ok`
    - `terminal_output_to_explain`: `ok`
    - `tool_execution_audit_visibility`: `ok`
    - `mcp_invoke_explicit_only`: `ok`
    - `remote_target_explicit_mismatch_guard`: `ok`
  - release sweep: `npm run validate` -> `pass` (existing frontend hook warnings remain non-blocking in current RC gate)
  - desktop startup smoke: `npm run tauri:dev` -> runtime ready `{"base_url":"http://127.0.0.1:61072","pid":12251}`
- Result: `VERIFIED` — cross-surface operator handoffs are coherent and explicit for file/AI, file/`/run`-related execution, terminal explain, tools->audit traceability, MCP explicit invocation, and local-vs-remote target mismatch guarding.
- Notes:
  - remote-target validation in this run is guard-level (`target_session` mismatch rejection) on a local widget; this entry does not claim a full reachable-host SSH launch sweep.
  - MCP invoke remained explicit and did not append automatic agent conversation messages in this run.

<a id="workspace-navigation-batch"></a>
## Workspace navigation parity batch

- Date: `2026-04-16`
- Status: `VERIFIED (corrected canonical run)`
- Commits:
  - `1da3eeb`
  - `22ec4bb`
  - `82c8a4f`
  - `f2ba88b`
  - `927115e`
  - `ed8e9cc`
  - `30a540a`
  - `ab97539`
  - `31374eb`
  - `3254402`
  - `6bf2c6d`
- Validation steps:
  - canonical script (single source): `python3 scripts/validate_workspace_navigation.py`
  - clean run output:
    - `base_url`: `http://127.0.0.1:58812`
    - `ollama_stub_url`: `http://127.0.0.1:58811`
    - `fs_list`: `ok`
    - `fs_read`: `ok`
    - `attachment_reference`: `ok`
    - `conversation_with_attachment`: `ok`
    - `run_equivalent_file_path_flow`: `ok`
    - `mcp_servers_regression_shape`: `ok`
    - `remote_profiles_regression_shape`: `ok`
- Result: `VERIFIED` — workspace navigation/runtime checks now pass on one canonical script with corrected API-shape assertions.
- Notes:
  - previous contradiction was real: an earlier script variant failed with `AssertionError` on a stale MCP expectation (`assert isinstance(mcp_servers, list)`).
  - this corrected entry supersedes that contradictory report.
  - this run validates workspace-navigation domain truth only; it does not claim full IDE/file-manager parity.
  - remote check in this run is non-destructive endpoint regression coverage, not a full SSH session launch sweep.

<a id="remote-ssh-parity-batch"></a>
## Remote SSH parity batch

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `3833bac`
  - `6458209`
  - `1683212`
  - `d16199f`
  - `8703410`
  - `75513ed`
- Validation steps:
  - isolated SSH target setup:
    - generated temp client/host keys under `/tmp/rterm-ssh-smoke.39C5GS`
    - launched isolated localhost `sshd` on `127.0.0.1:6222` with temp config and authorized key
    - direct probe passed: `ssh -i /tmp/rterm-ssh-smoke.39C5GS/client_key -p 6222 avm@127.0.0.1 'echo remote-ok && pwd'` -> `remote-ok` and `/Users/avm`
  - runtime environment:
    - Ollama-compatible stub: `python3 -u /tmp/rterm-ssh-smoke.39C5GS/ollama_stub.py` on `127.0.0.1:11446`
    - core: `RTERM_AUTH_TOKEN=remote-batch-token RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11446 RTERM_OLLAMA_MODEL=test-model go run ./cmd/rterm-core serve --listen 127.0.0.1:52951 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-ssh-smoke.39C5GS/state`
  - local baseline:
    - `GET /api/v1/bootstrap` returned default local tabs/widgets (`tab-main`/`term-main`, `tab-ops`/`term-side`)
  - remote session creation:
    - `POST /api/v1/connections/ssh` saved profile `Local SSHD Smoke` with `host=127.0.0.1`, `user=avm`, `port=6222`, temp `identity_file`
    - `POST /api/v1/workspace/tabs/remote` created and focused remote tab/widget (`tab_74a87b83a055dc8a` / `term_dd9042127249e2dd`)
    - `GET /api/v1/terminal/term_dd9042127249e2dd` reported `connection_kind:"ssh"`, `connection_id:"conn_5625bf9226e84326"`, `status:"running"`
  - remote terminal command and tab switching:
    - `POST /api/v1/terminal/term_dd9042127249e2dd/input` with `echo remote-terminal-smoke`
    - remote snapshot output contained `remote-terminal-smoke` and remote prompt marker `avm@mbw`
    - switched to local tab via `POST /api/v1/workspace/focus-tab {"tab_id":"tab-main"}`; local snapshot stayed `connection_kind:"local"`
    - switched back to remote tab via `POST /api/v1/workspace/focus-tab {"tab_id":"tab_74a87b83a055dc8a"}`; remote snapshot stayed `connection_kind:"ssh"`
  - `/run` backend path on remote session:
    - `POST /api/v1/tools/execute` (`term.send_input`) with context `target_session:"remote"` and `target_connection_id:"conn_5625bf9226e84326"` executed `echo remote-run-smoke` on remote widget
    - remote snapshot from captured `next_seq` contained `remote-run-smoke`
    - `POST /api/v1/agent/terminal-commands/explain` returned `output_excerpt:"remote-run-smoke"` and assistant message from stub provider
  - audit and mixup guard:
    - `GET /api/v1/audit?limit=20` showed both `term.send_input` and `agent.terminal_command` with `target_session:"remote"` and `target_connection_id:"conn_5625bf9226e84326"`
    - local tool execution (`term-main`) wrote separate audit entry with `target_session:"local"` and `target_connection_id:"local"`
    - mismatch probe (`term_dd...` with `target_session:"local"`) returned HTTP `400`, `error_code:"invalid_input"`, proving no silent local/remote mixup
  - release sweep:
    - `npm run validate` -> passed (frontend lint warnings remain non-blocking)
    - `npm run tauri:dev` smoke -> desktop launched, reported ready `{"base_url":"http://127.0.0.1:50142","pid":17105}`
- Result: `VERIFIED` — local and remote terminal sessions run concurrently, remote tab/session binding survives focus switches, `/run` tool+explain path works on remote widgets, and audit trail now records explicit session target truth without local/remote cross-target leakage.
- Notes:
  - validation used an isolated localhost SSH daemon and a stub provider to keep runtime behavior deterministic
  - out of scope and still not implemented in this slice: SSH config UI, `~/.ssh/config` import, credential manager, connection pooling

<a id="remote-connection-profiles"></a>
## Remote connection profiles

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `ae2710f`
  - `76c7df9`
  - `6e42f26`
  - `4274444`
  - `f128720`
  - `77c2f2d`
  - `f53da48`
  - `91ddd3c`
- Validation steps:
  - isolated runtime setup:
    - localhost SSH daemon: `127.0.0.1:6223` with temp keys under `/tmp/rterm-remote-profiles.SM0DWr`
    - direct SSH probe passed before API checks (`avm@127.0.0.1`, temp identity file)
    - Ollama-compatible stub: `127.0.0.1:11447`
    - core: `RTERM_AUTH_TOKEN=remote-profiles-token ... serve --listen 127.0.0.1:52961 --state-dir /tmp/rterm-remote-profiles.SM0DWr/state`
  - saved profile create + list:
    - `GET /api/v1/remote/profiles` initially returned one saved profile
    - create payload with explicit contract fields succeeded:
      - `POST /api/v1/remote/profiles` with `name`, `host`, `user`, `port`, `identity_file`
      - saved profile id: `conn_dc829456bf03c9e0`
    - `GET /api/v1/remote/profiles` then returned two profiles (expected growth by one)
    - contract check: payload containing `description` is rejected with `400 invalid_request` (`unknown field "description"`), matching backend model (description is derived)
  - profile -> remote session:
    - `POST /api/v1/remote/profiles/conn_dc829456bf03c9e0/session` created tab `tab_2e32850f04a953f2` and widget `term_553269d07dbe5ece`
    - `GET /api/v1/terminal/term_553269d07dbe5ece` reported `connection_kind:"ssh"`, `connection_id:"conn_dc829456bf03c9e0"`, `status:"running"`
  - remote terminal execution:
    - `POST /api/v1/terminal/term_553269d07dbe5ece/input` with `echo remote-profile-terminal-ok && pwd`
    - snapshot from captured `next_seq` contained `remote-profile-terminal-ok` and `/Users/avm`
  - `/run` contract on profile-backed remote session:
    - `POST /api/v1/tools/execute` (`term.send_input`) with context:
      - `target_session:"remote"`
      - `target_connection_id:"conn_dc829456bf03c9e0"`
    - command `echo remote-profile-run-ok` executed successfully; remote snapshot contained `remote-profile-run-ok`
    - `POST /api/v1/agent/terminal-commands/explain` for `/run echo remote-profile-run-ok` returned `output_excerpt:"remote-profile-run-ok"` with stub provider response
  - local behavior and tab switching:
    - local command path still works: `POST /api/v1/terminal/term-main/input` with `echo local-profile-still-works` produced expected output on local widget
    - tab switching remained correct:
      - `focus-tab tab-main` -> active widget `term-main`
      - `focus-tab tab_2e32850f04a953f2` -> active widget `term_553269d07dbe5ece`
    - post-switch snapshots remained consistent:
      - `term-main` => `connection_kind:"local"`
      - `term_553269d07dbe5ece` => `connection_kind:"ssh"`
  - audit truth and no local/remote mixup:
    - audit entries captured explicit target context:
      - remote `term.send_input` + `agent.terminal_command` => `target_session:"remote"`, `target_connection_id:"conn_dc829456bf03c9e0"`
      - local `term.send_input` (`echo local-tool-audit-ok`) => `target_session:"local"`, `target_connection_id:"local"`
    - mismatch guard probe (`remote widget` + `target_session:"local"`) returned HTTP `400` with `error_code:"invalid_input"` and message `requested local session but widget ... is remote`
  - SSH config import status:
    - no `~/.ssh/config` import path implemented in this batch
    - scope is documented as a non-goal in `docs/remote-ssh-config-import.md`
- Result: `VERIFIED` — saved remote profiles are persisted and reusable, profile-backed session creation works, remote `/run` keeps explicit target semantics, local behavior remains intact, and audit records session truth without local/remote leakage.
- Notes:
  - this validation run was API/runtime-level; no additional UI redesign/testing was introduced in this slice
  - release sweep commands were not re-run in this docs-only validation commit

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

## /run transcript persistence

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `c98e69702d0e9a212127aa715f267489d8f5cce4`
  - `bec9799eb0c09553c0f984cb6f5d7f6ba9e5f0c7`
- Validation steps:
  - automated backend checks:
    - `go test ./core/conversation ./core/app ./core/transport/httpapi`
  - runtime environment:
    - Ollama-compatible stub provider on `127.0.0.1:11441`
    - core: `RTERM_AUTH_TOKEN=run-transcript-token RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11441 RTERM_OLLAMA_MODEL=test-model go run ./cmd/rterm-core serve --listen 127.0.0.1:52920 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-run-transcript`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52920 VITE_RTERM_AUTH_TOKEN=run-transcript-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 5177 --strictPort`
  - `/run` execution and explain:
    - submitted `/run echo hello-phase13-ui` from the active compat AI panel
    - execution completed and explanation message rendered
  - backend transcript truth check:
    - `GET /api/v1/agent/conversation` after execution contained exactly one persisted chain for this command:
      - user message: `/run echo hello-phase13-ui`
      - assistant execution-result message: `Executed \`echo hello-phase13-ui\`...`
      - assistant explanation message containing `Original request: /run echo hello-phase13-ui`
  - reload check:
    - reloaded `http://127.0.0.1:5177/`
    - reopened AI panel
    - transcript still showed prompt/result/explanation for `/run echo hello-phase13-ui`
    - repeated `GET /api/v1/agent/conversation` still reported counts `1/1/1` for prompt/result/explanation entries (no duplicate persistence from reload)
- Result: `VERIFIED` — `/run` prompt and execution-result messages are now backend-persisted alongside explanation, and reload restores the full `/run` activity chain from backend conversation snapshot truth.

## Execution result message model

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `bfb22a4e42875b908a042efcf6efbfe7394e8f7a`
  - `ed9c6d0f0af4ce9ba0f427f4c534f878e44d9fc4`
  - `db37a71800e16a4a7f2ae27b5b0c6c633f7697b2`
- Validation steps:
  - automated checks:
    - `npx vitest run frontend/app/aipanel/run-command.test.ts --config frontend/vite.config.ts`
    - `npx tsc -p frontend/tsconfig.json --noEmit`
  - runtime environment:
    - Ollama-compatible stub provider: Node HTTP server on `127.0.0.1:11442`
    - core: `RTERM_AUTH_TOKEN=exec-model-token RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11442 RTERM_OLLAMA_MODEL=test-model go run ./cmd/rterm-core serve --listen 127.0.0.1:52930 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-exec-model`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52930 VITE_RTERM_AUTH_TOKEN=exec-model-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 5178 --strictPort`
  - command coverage in active compat AI panel:
    - with `Profile: Balanced`, ran `/run echo model-normal-phase23b` and observed persisted execution-result plus explanation
    - with `Profile: Balanced`, ran `/run definitely-not-a-real-command-phase23b` and observed persisted invalid-command execution-result plus explanation
    - with `Profile: Hardened`, ran `/run echo model-approval-phase23b`, observed inline approval card, clicked `Confirm and retry`, and observed approved execution-result plus explanation
  - backend truth checks:
    - `GET /api/v1/agent/conversation` showed exactly one persisted chain (`prompt/result/explain`) for each of:
      - `/run echo model-normal-phase23b`
      - `/run definitely-not-a-real-command-phase23b`
      - `/run echo model-approval-phase23b`
    - `GET /api/v1/audit?limit=15` showed approval chain for `model-approval-phase23b`:
      - `term.send_input` -> `approval_required`
      - `safety.confirm` -> `success`
      - retried `term.send_input` -> `success` with `approval_used:true`
      - `agent.terminal_command` -> `success` with `approval_used:true`
  - reload consistency:
    - reloaded `http://127.0.0.1:5178/`, reopened AI panel, confirmed transcript still contains `/run echo model-approval-phase23b` and explanation line `Original request: /run echo model-approval-phase23b`
    - repeated `GET /api/v1/agent/conversation` still reported `1/1/1` counts for all three tested commands (no duplicates after reload)
- Result: `VERIFIED` — execution-result persistence now remains consistent across normal, invalid, and approval-required `/run` flows; reload is backed by backend snapshot truth without duplicate entries.
- Notes:
  - during this validation, approval retry initially exposed a runtime mismatch where terminal snapshots sometimes returned `chunks: null`; `db37a71` normalized snapshot chunk handling to keep the flow deterministic
  - browser console recorded expected `428 Precondition Required` on approval challenge and a pre-existing unrelated `401` from `/wave/service?service=object&method=GetObject`; no fatal runtime exceptions were observed in the `/run` path

## Conversation snapshot and reload truth

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `ecc4bdce8e84780bb8ca91e52eeb35048cc7ce88`
  - `e9dc157e43f0ddca4172edcc2b76446922732ef6`
- Validation steps:
  - runtime environment:
    - Ollama-compatible stub provider: Node HTTP server on `127.0.0.1:11442`
    - core: `RTERM_AUTH_TOKEN=exec-model-token RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11442 RTERM_OLLAMA_MODEL=test-model go run ./cmd/rterm-core serve --listen 127.0.0.1:52930 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-exec-model`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52930 VITE_RTERM_AUTH_TOKEN=exec-model-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 5178 --strictPort`
  - pre-reload actions in active compat AI panel:
    - with `Profile: Balanced`, sent normal prompt `slice3-normal-reload-20260416-1` and observed assistant response `stub-response: slice3-normal-reload-20260416-1`
    - with `Profile: Balanced`, sent `/run echo slice3-run-reload-20260416-1` and observed execution-result plus explanation line `Original request: /run echo slice3-run-reload-20260416-1`
  - backend snapshot truth before reload:
    - `GET /api/v1/agent/conversation` showed exactly one persisted entry for each expected item:
      - normal prompt + assistant response
      - `/run` prompt + execution-result + explanation
  - reload check:
    - reloaded `http://127.0.0.1:5178/`
    - reopened AI panel and confirmed both `slice3-normal-reload-20260416-1` and `Original request: /run echo slice3-run-reload-20260416-1` are present
    - repeated `GET /api/v1/agent/conversation` still reported `1/1/1` counts for the `/run` chain and `1/1` for the normal prompt/response pair
  - stale-local check:
    - backend snapshot contained `local_fallback: 0` for `Explanation unavailable for \`echo slice3-run-reload-20260416-1\``, confirming no frontend-only fallback entry was being mistaken for persisted truth
- Result: `VERIFIED` — post-reload transcript behavior now follows backend snapshot truth, and local supplementation is no longer presented as durable persisted conversation state.
- Notes:
  - browser console still showed expected `428` on approval challenge paths and a pre-existing unrelated `401` from legacy `/wave/service` object call

## Legacy /wave/service noise cleanup

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `4aaa3df7d0c27f9974ea4968fb109a15ec4ac4c9`
  - `2100472e8d9f76c8d6ea362a950f0c60c362bacf`
- Validation steps:
  - runtime environment:
    - core: `RTERM_AUTH_TOKEN=exec-model-token RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11442 RTERM_OLLAMA_MODEL=test-model go run ./cmd/rterm-core serve --listen 127.0.0.1:52930 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-exec-model`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52930 VITE_RTERM_AUTH_TOKEN=exec-model-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 5178 --strictPort`
  - opened active compat shell `http://127.0.0.1:5178/`
  - opened and checked active surfaces:
    - terminal view loaded (`GET /api/v1/terminal/...`)
    - tools panel opened (`GET /api/v1/tools`)
    - audit panel opened (`GET /api/v1/audit?limit=50`)
    - AI panel opened (`GET /api/v1/agent/conversation`)
  - checked runtime noise:
    - browser console errors in this run: `0`
    - network requests filtered by `wave/service`: none observed
- Result: `VERIFIED` — active compat path no longer triggers legacy `/wave/service` 401 noise while terminal/tools/audit/AI paths remain operational.

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

## CORS and auth hardening

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `3a39d28925df4f3a2a0a57089ac9d0aa6f15930b`
  - `d848af7e02dc0f09d50d1ebf85fe8662959505eb`
- Validation steps:
  - runtime environment:
    - core: `RTERM_AUTH_TOKEN=cors-auth-token go run ./cmd/rterm-core serve --listen 127.0.0.1:52850 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-cors-auth-validation`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52850 VITE_RTERM_AUTH_TOKEN=cors-auth-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort`
  - public health:
    - `curl -si http://127.0.0.1:52850/healthz`
    - observed `HTTP/1.1 200 OK`
  - allowed dev origin:
    - `curl -si -H 'Origin: http://127.0.0.1:5173' -H 'Authorization: Bearer cors-auth-token' http://127.0.0.1:52850/api/v1/bootstrap`
    - observed `HTTP/1.1 200 OK` with `Access-Control-Allow-Origin: http://127.0.0.1:5173`
    - allowed preflight also returned `204 No Content` with the same echoed origin
  - disallowed origin:
    - `curl -si -X OPTIONS -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: GET' http://127.0.0.1:52850/api/v1/bootstrap`
    - observed `HTTP/1.1 403 Forbidden` with `{"error":{"code":"origin_not_allowed","message":"origin not allowed"}}`
  - protected route without auth:
    - `curl -si http://127.0.0.1:52850/api/v1/bootstrap`
    - observed `HTTP/1.1 401 Unauthorized` with `Www-Authenticate: Bearer`
  - transport contract tightening:
    - `curl -si -H 'Authorization: Bearer cors-auth-token' -H 'Content-Type: application/json' -d '{"tool_name":"workspace.list_widgets","context":{"workspace_id":"ws-local","active_widget_id":"term-main","repo_root":"/Users/avm/projects/Personal/tideterm/runa-terminal","role_id":"spoofed"}}' http://127.0.0.1:52850/api/v1/tools/execute`
    - observed `HTTP/1.1 400 Bad Request` with `json: unknown field "role_id"`
  - active shell:
    - opened `http://127.0.0.1:5173/` in the active compat UI
    - shell rendered the normal top bar and active terminal surface
    - browser network for the current run showed successful requests to:
      - `GET /healthz`
      - `GET /api/v1/bootstrap`
      - `GET /api/v1/workspace`
      - `GET /api/v1/terminal/term-main`
      - `GET /api/v1/terminal/term-main/stream?from=5&token=cors-auth-token`
- Result: `VERIFIED` — wildcard CORS is gone, health remains intentionally public, protected routes still require auth, disallowed origins are rejected at preflight, and the active shell still boots against the hardened local API.

## SSE auth hardening

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `2637af8ff278cba855f6763945effb7a0f92b7fb`
  - `8091ac95f7597e0a3e359bc55d886c7d63e188c6`
- Validation steps:
  - automated checks:
    - `npx vitest run frontend/runtime/stream.test.ts --config frontend/vite.config.ts`
    - `npx tsc -p frontend/tsconfig.json --noEmit`
  - runtime environment reused from the slice-1 live verification:
    - core: `RTERM_AUTH_TOKEN=cors-auth-token go run ./cmd/rterm-core serve --listen 127.0.0.1:52850 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-cors-auth-validation`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52850 VITE_RTERM_AUTH_TOKEN=cors-auth-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort`
  - normal stream path:
    - reloaded `http://127.0.0.1:5173/` in the active compat UI
    - browser network showed terminal stream requests as:
      - `GET /api/v1/terminal/term-main/stream?from=5`
      - `GET /api/v1/terminal/term-main/stream?from=31`
    - no `token=` query parameter appeared on the active terminal stream requests
  - terminal output path:
    - `curl -si -H 'Authorization: Bearer cors-auth-token' -H 'Content-Type: application/json' -d '{"text":"echo sse-header-path","append_newline":true}' http://127.0.0.1:52850/api/v1/terminal/term-main/input`
    - observed `HTTP/1.1 200 OK`
    - follow-up snapshot `GET /api/v1/terminal/term-main?from=0` contained the resulting output chunk `sse-header-path`
  - tab switch / replay:
    - clicked `Ops Shell`, then clicked `Main Shell`
    - browser network showed successful stream reconnects for both widgets:
      - `GET /api/v1/terminal/term-side/stream?from=5`
      - `GET /api/v1/terminal/term-main/stream?from=31`
    - reconnects also omitted `token=`
- Result: `VERIFIED` — the active terminal stream path now uses header auth instead of query-token auth, tab switching still reconnects cleanly, and terminal output/replay remained intact during the live shell run.

## Conversation pruning

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `f743f1f083eb092d25aaaf99df74ea0f676f67ef`
  - `797a392244908c418cfeb78ddab0dc1ed74a597d`
- Validation steps:
  - automated checks:
    - `go test ./core/conversation ./core/app`
  - runtime environment:
    - Ollama stub on `127.0.0.1:11439` recording the last `/api/chat` request and exposing `GET /stats`
    - core: `RTERM_AUTH_TOKEN=conv-prune-token RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11439 RTERM_OLLAMA_MODEL=test-model go run ./cmd/rterm-core serve --listen 127.0.0.1:52860 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-conversation-prune-validation`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52860 VITE_RTERM_AUTH_TOKEN=conv-prune-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 5174 --strictPort`
  - seeded long history:
    - posted `15` real conversation requests through `POST /api/v1/agent/conversation/messages`
    - stub `GET /stats` then returned `{"count":25,...,"last":"history-seed-15"}`
    - this means the provider saw `24` chat messages plus the system prompt, not the full `29` chat-message history that existed by that point
  - active UI path:
    - opened `http://127.0.0.1:5174/`
    - opened the AI panel through the visible shell `AI` toggle
    - transcript loaded the seeded history in the current UI
    - submitted `browser prune check` through the visible composer
    - browser network captured `POST /api/v1/agent/conversation/messages => 200`
    - page text contained both `browser prune check` and `stub-reply:25`
  - bounded provider request:
    - after the browser-submitted prompt, stub `GET /stats` returned `{"count":25,...,"last":"browser prune check"}`
    - at that point the persisted conversation held `31` chat messages before system-prompt injection, so the provider request was still bounded instead of sending the whole transcript blindly
- Result: `VERIFIED` — conversation still works in the active AI panel, the transcript remains usable, and provider requests are now capped to the documented recent-history budget instead of growing without bound.

## Dangerous tool schema hardening

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `fb3055d0272e12557ef49d0a425950841fd765fb`
  - `33dda2a008c71c1785dc1be5ae6b343cabf157e0`
- Validation steps:
  - automated checks:
    - `go test ./core/app ./core/transport/httpapi`
  - runtime environment:
    - core: `RTERM_AUTH_TOKEN=tool-schema-token go run ./cmd/rterm-core serve --listen 127.0.0.1:52870 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-tool-schema-validation`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52870 VITE_RTERM_AUTH_TOKEN=tool-schema-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 5175 --strictPort`
  - schema listing:
    - `GET /api/v1/tools` returned explicit `input_schema` objects for:
      - `safety.add_ignore_rule` with `scope`, `matcher_type`, `pattern`, `mode`, enum constraints, and required fields
      - `safety.add_trusted_rule` with `scope`, `subject_type`, `matcher_type`, `matcher` / `structured`, enum constraints, and required fields
  - safe tool path:
    - `POST /api/v1/tools/execute` for `workspace.list_widgets` returned `status:"ok"` with the current widget list
  - invalid dangerous payload:
    - `POST /api/v1/tools/execute` for `safety.add_ignore_rule` without `pattern`
    - observed `HTTP 400` with `error_code:"invalid_input"` and `error:"ignore rule pattern is required"`
    - this now fails before approval instead of surfacing as a generic approval challenge
  - approval-required dangerous path:
    - valid `safety.add_ignore_rule` payload returned `status:"requires_confirmation"`
    - `safety.confirm` returned an `approval_token`
    - retry with the same payload plus `approval_token` returned `status:"ok"` and the created ignore rule
  - tools panel UI:
    - opened `http://127.0.0.1:5175/`
    - clicked the visible `Tools` button in the shell
    - panel loaded `GET /api/v1/tools => 200`
    - selected `workspace.list_widgets` and clicked `Execute`
    - browser network captured `POST /api/v1/tools/execute => 200` with the expected tool request body
    - the panel response area rendered the tool result
- Result: `VERIFIED` — dangerous policy-mutation tools now publish meaningful schemas, malformed payloads fail with the right input error before approval, approval-required valid payloads still complete normally, and the current Tools panel remains usable against the hardened contract.
- Safe explain truth: `VERIFIED` — the backend ignored a client-supplied `approval_used:true` value and recorded the explain step as unapproved when the matching execution was unapproved.
- Approved explain truth: `VERIFIED` — the backend ignored a client-supplied `approval_used:false` value and recorded the explain step as approved when the matching execution had consumed approval.
- Exact observed result: `VERIFIED` — explain `approval_used` now comes from backend execution/audit truth, not from the frontend payload.
- Notes:
  - the active frontend still sends the legacy `approval_used` field on approved `/run` explains; this slice hardens the backend by ignoring that input instead of depending on it
  - validation used a stub Ollama-compatible server, so assistant text proves explain routing and context wiring rather than model quality

## Dependency and limitation hygiene

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `5714644ed341ae819dcf2220dd769eb4d92935eb`
  - `a02a385d75b1f5f0e1c0c19e369f14af7429eff5`
- Validation steps:
  - frontend build:
    - `npm run build:frontend`
    - observed successful `tsc -b && vite build`
    - build still emitted the existing browser-compatibility warning that `electron/index.js` externalizes `fs` and `path`, which matches the documented reason `electron` was not removed in this slice
  - active shell:
    - reused the current-code runtime from the dangerous-schema validation:
      - core: `RTERM_AUTH_TOKEN=tool-schema-token go run ./cmd/rterm-core serve --listen 127.0.0.1:52870 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-tool-schema-validation`
      - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52870 VITE_RTERM_AUTH_TOKEN=tool-schema-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 5175 --strictPort`
    - opened `http://127.0.0.1:5175/`
    - terminal prompt rendered normally in the active shell
    - entered `echo deps-hygiene-shell-check`
    - terminal rendered the echoed output `deps-hygiene-shell-check` and returned to the prompt
  - Tauri launch smoke:
    - `npm run tauri:dev`
    - observed `Running target/debug/rterm-desktop`
    - the spawned core reported ready state `{"base_url":"http://127.0.0.1:63418","pid":54009}`
    - the smoke was then interrupted intentionally after ready-state confirmation
  - docs truthfulness:
    - `README.md` now states AI conversation is through an Ollama-compatible HTTP backend and no longer implies a broader provider matrix
    - `docs/known-limitations.md` now explicitly states generalized provider support beyond the current Ollama-compatible path is not part of the current release
- Result: `VERIFIED` — the narrowed dependency cleanup kept frontend build and shell launch behavior intact, `tauri:dev` still reaches desktop/core ready state, and the public limitation docs now match the actual Ollama-first runtime contract.

## Electron / legacy frontend cleanup

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `f563ce1f680a0ca8e4a12379efe7acd11e01044a`
  - `532a99204b7bce7c96c57da11c9d444f16bc9e00`
  - `6adbd176df2f75f6f9f1ef6ec6221f4f6fdde45d`
- Validation steps:
  - typecheck:
    - `npx tsc -p frontend/tsconfig.json --noEmit`
  - frontend build:
    - `npm run build:frontend`
    - observed successful `tsc -b && vite build`
    - previous warning about `electron/index.js` browser-compat externalization did not appear in this run
    - remaining build warnings were unrelated chunk-size/dynamic-import warnings (`compat/index.ts` chunking), not Electron import warnings
  - active runtime sanity:
    - core: `RTERM_AUTH_TOKEN=electron-cleanup-token go run ./cmd/rterm-core serve --listen 127.0.0.1:52910 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-electron-cleanup`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52910 VITE_RTERM_AUTH_TOKEN=electron-cleanup-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 5176 --strictPort`
    - opened `http://127.0.0.1:5176/`
    - terminal prompt was visible
    - opened `Tools` panel and observed live tool list content
    - opened `Audit` panel and observed panel content (`No audit events available`)
    - opened AI panel via `AI` toggle and observed header/composer/selectors
  - tauri launch smoke:
    - `npm run tauri:dev`
    - observed `Running target/debug/rterm-desktop`
    - spawned core ready-state printed `{"base_url":"http://127.0.0.1:64464","pid":61928}`
    - run stopped intentionally after ready-state confirmation
- Result: `VERIFIED` — active compat shell remains working, Tauri launch path remains healthy, and the previous Electron runtime import warning in frontend build is no longer present.

## Approval continuity

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `6bcf5ad744e1027da5f4049f7c4d7559aa63cc69`
  - `fe4c0bb866e160508df81dff26f423d40416d7d2`
- Validation steps:
  - `npx vitest run frontend/app/approval/continuity.test.ts frontend/app/aipanel/run-command.test.ts frontend/compat/tools.test.ts --config frontend/vite.config.ts`
  - `npx tsc -p frontend/tsconfig.json --noEmit`
  - runtime environment reused the live continuity slice frontend and backend:
    - core: `RTERM_AUTH_TOKEN=explain-truth-token RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11438 RTERM_OLLAMA_MODEL=test-model apps/desktop/bin/rterm-core serve --listen 127.0.0.1:61420 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-explain-truth/state --ready-file /tmp/rterm-explain-truth/ready.json`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:61420 VITE_RTERM_AUTH_TOKEN=explain-truth-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4203 --strictPort`
  - `/run` panel-remount continuity:
    - with `Profile: Hardened`, entered `/run echo continuity-run`
    - UI showed `Approval required for \`/run echo continuity-run\``
    - closed the AI panel and reopened it through the shell `AI` toggle
    - the same approval card was still visible
    - clicked `Confirm and retry`
    - transcript rendered the final execution result `continuity-run` and the follow-up explanation message
  - tools-window remount continuity:
    - opened `Tools`
    - selected `safety.add_ignore_rule`
    - executed `{"scope":"repo","matcher_type":"glob","pattern":"continuity-tool-*","mode":"metadata-only","note":"continuity validation"}`
    - UI showed `approval required: add ignore rule continuity-tool-* (metadata-only)`
    - dismissed the tools window and reopened it from the same `Tools` control
    - the same approval block was still visible
    - clicked `Confirm and retry`
    - response rendered `"status": "ok"`
  - full-reload limitation check:
    - with `Profile: Hardened`, entered `/run echo continuity-reload`
    - UI showed `Approval required for \`/run echo continuity-reload\``
    - reloaded `http://127.0.0.1:4203/`
    - reopened the AI panel
    - the pending approval card was no longer present
- Panel/window remount continuity: `VERIFIED` — pending `/run` and tools approvals now survive close/reopen remounts inside the same live frontend session and still confirm-and-retry successfully.
- Full reload continuity: `VERIFIED` — a hard page reload still drops the pending retry context, which matches the in-memory-only boundary of this slice.
- Exact observed result: `VERIFIED` — retry no longer depends on component state only, but it still intentionally does not persist across a full frontend reload.
- Notes:
  - browser console showed the expected `428 Precondition Required` resource errors for the initial approval challenges and no fatal runtime exceptions
  - this slice does not change backend persistence: restarting the core still loses pending approvals and grants

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

## ANSI terminal behavior

- Date: `2026-04-16`
- Status: `VERIFIED`
- Validation steps:
  - runtime environment:
    - reused the live batch stack from slices 1 and 2
    - core: `RTERM_AUTH_TOKEN=explain-truth-token RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11438 RTERM_OLLAMA_MODEL=test-model apps/desktop/bin/rterm-core serve --listen 127.0.0.1:61420 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-explain-truth/state --ready-file /tmp/rterm-explain-truth/ready.json`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:61420 VITE_RTERM_AUTH_TOKEN=explain-truth-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4203 --strictPort`
  - active-tab ANSI baseline in `Main Shell` using `POST /api/v1/terminal/term-main/input` with `append_newline:true`:
    - `printf '\033[31mANSI_BATCH_RED\033[0m\n'`
    - `python3 -c 'import sys,time; [sys.stdout.write(f"\rANSI_BASE_PROGRESS_{i}/5") or sys.stdout.flush() or time.sleep(0.05) for i in range(1,6)]; print()'`
    - `python3 -c 'import sys; print("ansi-row-a"); print("ansi-row-b"); sys.stdout.write("\x1b[2A"); sys.stdout.write("\rANSI_ROW_A\nANSI_ROW_B\n"); sys.stdout.flush()'`
  - replay/remount check:
    - sent `python3 -u -c 'import sys,time; [sys.stdout.write(f"\r\033[36mANSI_SWITCH_1776341431_{i:02d}/12\033[0m") or sys.stdout.flush() or time.sleep(0.12) for i in range(1,13)]; print()'`
    - switched tabs `Main Shell -> Ops Shell -> Main Shell` while the loop was still running
    - after returning, sent `python3 -c 'import sys; print("switch-row-a"); print("switch-row-b"); sys.stdout.write("\x1b[2A"); sys.stdout.write("\rANSI_SWITCH_ROW_A\nANSI_SWITCH_ROW_B\n"); sys.stdout.flush()'`
- Observed result:
  - the active terminal rendered `ANSI_BATCH_RED`, final progress `ANSI_BASE_PROGRESS_5/5`, and the cursor-up replacement lines `ANSI_ROW_A` / `ANSI_ROW_B`
  - after switching away mid-loop and returning, the terminal showed only the final colored progress state `ANSI_SWITCH_1776341431_12/12` in the visible viewport
  - the post-return redraw command left `ANSI_SWITCH_ROW_A` and `ANSI_SWITCH_ROW_B` visible without duplicated escape sequences or cursor-position corruption
  - backend snapshot tails still contained the raw control stream (`\u001b[36m...`, repeated `\r...`, `\u001b[2A`) while the viewport reflected the expected final terminal state
- Result: `VERIFIED` — the current snapshot-plus-stream replay path handled ANSI color, carriage-return progress, and cursor-up redraw correctly, including a tab switch during active ANSI output.
- Notes:
  - no terminal code change was needed in this slice because the live runtime behavior already matched the expected replay semantics
  - earlier `.view-term` text probing was not used as the source of truth for this validation because it includes shell command echo/accessibility text in addition to the visible terminal screen

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

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `6458209`
  - `1683212`
  - `d16199f`
- Validation steps: See [`Remote SSH parity batch`](#remote-ssh-parity-batch).
- Result: `VERIFIED` — default local sessions stayed running while remote sessions were created/used, and local `term.send_input` remained bound to `target_session:"local"` without cross-target leakage.
- Notes: This run validated coexistence of local + remote PTY sessions in one workspace/runtime process.

<a id="feature-runtime-saved-ssh-profiles"></a>
## Saved SSH profiles

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `6458209`
  - `d16199f`
- Validation steps: See [`Remote SSH parity batch`](#remote-ssh-parity-batch).
- Result: `VERIFIED` — `POST /api/v1/connections/ssh` persisted a real SSH profile with explicit host/user/port/identity-file and returned backend-owned connection metadata used by remote tab launch.
- Notes: This run intentionally used direct profile fields only; `.ssh/config` import remains out of scope.

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

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `d16199f`
  - `8703410`
  - `75513ed`
- Validation steps: See [`Remote SSH parity batch`](#remote-ssh-parity-batch).
- Result: `VERIFIED` — remote tab creation against explicit SSH connection launched a running SSH PTY session; command execution and `/run` explain path completed on that remote widget.
- Notes: Session-target mismatch probe now fails explicitly (`400 invalid_input`) when local target metadata is sent to a remote widget.

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

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `d7bdb7d`
  - `17d9153`
  - `85fd6e7`
  - `f7c4c38`
  - `9d8c8cf`
  - `21910b0`
  - `7634fdf`
- Validation steps:
  - automated checks:
    - `go test ./core/plugins -run 'TestMCPContext|TestMCPInvokeContext|TestMCPRuntime|TestMCPRegistry' -count=1` -> `PASS`
    - `go test ./core/transport/httpapi -run 'TestListMCPServers|TestMCPServerControlEndpoints|TestInvokeMCPRespectsLifecycleControls' -count=1` -> `PASS`
  - runtime/API smoke:
    - core: `RTERM_AUTH_TOKEN=mcp-batch-token go run ./cmd/rterm-core serve --listen 127.0.0.1:52991 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-mcp-batch-validation`
    - `GET /api/v1/mcp/servers` initial snapshot:
      - `{"id":"mcp.example","state":"stopped","active":false,"enabled":true}`
    - explicit lifecycle controls:
      - `POST /api/v1/mcp/servers/mcp.example/start` -> `state:"idle", active:true`
      - `POST /api/v1/mcp/invoke {"server_id":"mcp.example","include_context":true}` -> `output:{}` and bounded explicit context payload
      - `POST /api/v1/mcp/servers/mcp.example/disable` -> `enabled:false, active:false`
      - `POST /api/v1/mcp/invoke {"server_id":"mcp.example","allow_on_demand_start":true}` -> HTTP `409`, code `mcp_server_disabled`
      - `POST /api/v1/mcp/servers/mcp.example/enable` + `POST /api/v1/mcp/servers/mcp.example/restart` -> `state:"idle", active:true, enabled:true`
  - release sweep:
    - `npm run validate` -> `PASS` (`lint/build/tests/tauri:check`)
    - `npm run tauri:dev` smoke -> desktop launched and runtime ready line observed:
      - `{"base_url":"http://127.0.0.1:54569","pid":66724}`
- Result: `VERIFIED` — core now has managed MCP runtime lifecycle with explicit activation and manual controls, idle auto-stop, explicit bounded context adapter behavior, and observable runtime state over API.
- Notes:
  - this slice is backend/API-first for controlled runtime behavior; it does not introduce a broad MCP dashboard redesign
  - legacy TideTerm MCP UI residue still exists in frontend code, but current release slice now has real core/runtime/API MCP semantics instead of placeholder-only parity claims

<a id="feature-ux-api-proxy-waveproxy"></a>
## API Proxy / WaveProxy

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Legacy proxy UI присутствует, но current core/runtime path для TideTerm WaveProxy отсутствует. 

<a id="mcp-usability"></a>
## MCP usability

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `d1ff3c1`
  - `94d471d`
  - `72037ba`
  - `6f56f23`
  - `7276787`
- Validation steps:
  - release sweep:
    - `npm run validate` -> `PASS` (`lint/build/tests/tauri:check`; frontend lint warnings remain non-blocking and unchanged)
    - `npm run tauri:dev` smoke -> desktop launched and runtime ready line observed:
      - `{"base_url":"http://127.0.0.1:55811","pid":76276}`
  - runtime/UI smoke:
    - core: `RTERM_AUTH_TOKEN=mcp-ui-token go run ./cmd/rterm-core serve --listen 127.0.0.1:52993 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-mcp-ui-validation`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52993 VITE_RTERM_AUTH_TOKEN=mcp-ui-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4212 --strictPort`
    - `Tools` panel now shows MCP server list with:
      - `id`
      - normalized state (`active`/`idle`/`stopped`/`disabled`)
      - `last_used` timestamp when present
    - per-server manual lifecycle controls verified from UI:
      - `start`, `stop`, `restart`, `enable`, `disable` each call the matching `/api/v1/mcp/servers/{id}/...` endpoint and refresh visible state
    - minimal explicit invoke path verified from UI:
      - server-select + JSON payload + optional `allow on-demand start`
      - disabled-server invoke returns explicit error (`mcp server is disabled`)
      - enabled invoke returns response rendered in the Tools panel
    - control-model invariants confirmed:
      - no auto-start/auto-load behavior introduced in UI wiring
      - MCP invoke output remains local to Tools panel and is not auto-injected into agent conversation context
  - regression smoke on existing surfaces (same runtime):
    - terminal still executes (`echo mcp-ui-terminal`)
    - tools execution remains functional (`workspace.list_widgets`)
    - audit panel still shows recent events
    - AI panel still opens with selectors/composer and no MCP auto-injection path
- Result: `VERIFIED` — MCP runtime is now operator-usable from existing shell surfaces: servers are visible, lifecycle is manually controlled, and invoke is explicit while preserving bounded/context-safe behavior.
- Notes:
  - this slice intentionally does not add MCP discovery/registry UI, bulk operations, or automation
  - observed disabled invoke conflict (`409`) appears as explicit inline error and does not break panel behavior

## Approval continuity hardening

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `f559da5f468a4c3ff95a9b9f7ed8012a2148e484`
  - `f84e04d656720ed9f1961585cf2f3fd54cd2a13a`
  - `4728c2e08af34cbec3f6f3974c9b1e06c82e33a2`
- Validation steps:
  - automated checks:
    - `npx vitest run frontend/app/approval/continuity.test.ts frontend/compat/tools.test.ts frontend/app/aipanel/run-command.test.ts --config frontend/vite.config.ts`
    - `npx tsc -p frontend/tsconfig.json --noEmit`
  - runtime environment:
    - core: `RTERM_AUTH_TOKEN=exec-model-token apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52930 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-exec-model`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52930 VITE_RTERM_AUTH_TOKEN=exec-model-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 5178 --strictPort`
  - `/run` continuity checks in active AI panel:
    - with `Profile: Hardened`, ran `/run echo continuity-s23-panel-tab-20260416` and observed approval card
    - closed/reopened AI panel and switched `Main Shell -> Ops Shell -> Main Shell`: approval card remained available
    - clicked `Confirm and retry`: pending card cleared and explanation rendered for the same command
  - Tools continuity checks:
    - executed `safety.add_ignore_rule` with payload pattern `continuity-s23-tool-*` and observed pending approval block
    - closed/reopened Tools panel: pending approval block remained available
    - `Confirm and retry` completed with response `status: "ok"`
  - full reload truth check:
    - created pending `/run echo continuity-s23-reload-20260416`
    - reloaded `http://127.0.0.1:5178/` and reopened AI panel
    - pending approval entry was absent (non-persistent behavior remains explicit)
  - core restart stale check:
    - created pending `/run echo continuity-s23-stale-postfix-20260416`
    - restarted core process (same API base and auth token)
    - clicked `Confirm and retry` on stale card
    - observed stale rejection banner `Pending approval is no longer available. Re-run the command to request approval again.` and stale pending card removal
    - repeated the same stale pattern in Tools panel (`continuity-s23-tool-stale-*`) and observed stale message `Pending approval is no longer available. Execute the tool again to request approval.` with pending block removed
- Result: `VERIFIED` — shallow UI lifecycle transitions (panel close/open, tab switch, remount-level behavior) retain pending approval context; stale approvals after core restart are rejected explicitly and cleaned up instead of remaining stuck.
- Notes:
  - full page reload and core restart still do not persist pending approvals across process/session boundaries; this remains intentionally non-persistent in this slice
  - browser console still shows expected approval challenge noise (`428`) during dangerous requests; no fatal runtime exceptions were observed

## Transport and runtime truth cleanup

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `daaba6a9f3ef5b6f5cd36a4fd20548e34c7dd2c2`
  - `f38898007ad5cd18caa6c77f789f163ea7729fd3`
- Validation steps:
  - automated checks:
    - `npx tsc -p frontend/tsconfig.json --noEmit`
  - runtime environment:
    - core: `RTERM_AUTH_TOKEN=exec-model-token apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52930 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-exec-model`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52930 VITE_RTERM_AUTH_TOKEN=exec-model-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 5178 --strictPort`
  - active shell smoke:
    - loaded `http://127.0.0.1:5178/`
    - opened AI panel
    - opened Tools panel
    - opened Audit panel
    - sent terminal command `echo runtime-s3-20260416` and observed output in terminal view
  - runtime noise check:
    - browser console errors for this run: `0`
    - network requests filtered by `wave/service`: none observed in active path
- Result: `VERIFIED` — active runtime path remains operational after contract tightening and does not reintroduce legacy `/wave/service` request noise.
- Notes:
  - runtime config no longer silently falls through legacy/browser-origin API base resolution in the normal path; legacy fallback now requires explicit opt-in flag `VITE_RTERM_ENABLE_LEGACY_RUNTIME_FALLBACK=1`

## Local attachment references

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `55e6598`
  - `ac3ee08`
  - `6f03663`
  - `8e16be5`
  - `7ff064d`
  - `6860e57`
  - `e386e50`
  - `61dae76`
  - `ba569cb`
- Validation steps:
  - automated checks:
    - `go test ./core/conversation ./core/app ./core/transport/httpapi`
    - `npx tsc -p frontend/tsconfig.json --noEmit`
    - `npx vitest run frontend/app/aipanel/run-command.test.ts frontend/app/approval/continuity.test.ts --config frontend/vite.config.ts`
  - runtime environment:
    - core: `RTERM_AUTH_TOKEN=exec-model-token RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11442 RTERM_OLLAMA_MODEL=test-model go run ./cmd/rterm-core serve --listen 127.0.0.1:52930 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-attachments-batch`
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52930 VITE_RTERM_AUTH_TOKEN=exec-model-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 5178 --strictPort`
  - attachment reference flow (active compat AI panel):
    - opened `http://127.0.0.1:5178/` and AI panel
    - selected local file `README.md` through AI panel attach control (`input[type=file]`)
    - observed reference creation request:
      - `POST /api/v1/agent/conversation/attachments/references`
      - body: `{"path":"/Users/avm/projects/Personal/tideterm/runa-terminal/README.md"}`
      - response: `200 OK`
    - sent message `attachment smoke 2026-04-16`
    - observed conversation submit request with attachment metadata:
      - `POST /api/v1/agent/conversation/messages`
      - body contained `attachments:[{id,name,path,mime_type,size,modified_time}]`
    - verified backend truth:
      - `curl -sS -H 'Authorization: Bearer exec-model-token' http://127.0.0.1:52930/api/v1/agent/conversation | jq '.conversation.messages[] | select(.content=="attachment smoke 2026-04-16") | {role, content, attachments}'`
      - result contained persisted user message attachment reference for `README.md`
    - reloaded page and reopened AI panel
    - confirmed transcript still shows `attachment smoke 2026-04-16` and `README.md` from backend snapshot
  - edge case (missing file after reference creation):
    - created reference for `/tmp/rterm-attachment-edge.txt`, then deleted the file
    - submitted conversation message with that previously-created attachment reference via API payload
    - observed `200 OK`; reference metadata remained in persisted transcript
    - observed behavior is currently metadata-persistent, not submit-time file revalidation
  - regression smoke:
    - `/run echo attachments-batch-run` in AI panel rendered explanation (`Original request: /run echo attachments-batch-run`)
    - Tools panel opens and executes (surface reachable, execute controls visible)
    - Audit panel opens and shows events
    - browser console errors in validation run: `0`
- Result: `VERIFIED` — local attachment references can be created, attached to messages, persisted in backend conversation truth, and restored after reload.
- Notes:
  - this slice is reference-based only: no managed storage and no blob import pipeline
  - superseded by later hardening: submit-time stale-reference rejection is now validated in `## Attachment consumption`

## Attachment consumption

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `8aa0810`
  - `5d722b4`
  - `67d1b3d`
  - `d464ba9`
- Validation steps:
  - automated checks:
    - `go test ./core/app ./core/conversation ./core/transport/httpapi`
    - `npx tsc -p frontend/tsconfig.json --noEmit`
  - runtime environment:
    - mock provider: `python3 -u` HTTP server on `127.0.0.1:11445` (`/api/tags`, `/api/chat`) with request capture to `/tmp/rterm-attach-provider-requests.jsonl`
    - core: `RTERM_AUTH_TOKEN=attach-batch-token RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11445 RTERM_OLLAMA_MODEL=test-model go run ./cmd/rterm-core serve --listen 127.0.0.1:52931 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-attachment-consumption`
  - small-text attachment consumption:
    - created `/tmp/rterm-attachment-small.txt` with known line `keyword: Neptune`
    - created reference via `POST /api/v1/agent/conversation/attachments/references`
    - submitted message with attachment via `POST /api/v1/agent/conversation/messages`
    - provider response contained `attachment-context-detected`
    - captured `/api/chat` payload included:
      - `Attachment context (local references, bounded):`
      - attachment metadata (`path`, `mime_type`, `size_bytes`, `modified_unix`)
      - bounded `content_excerpt` containing `Neptune`
  - reload/snapshot truth:
    - `GET /api/v1/agent/conversation` returned user messages with persisted attachment metadata
    - attachment references remained present in snapshot after submit
  - stale reference case:
    - created reference for `/tmp/rterm-attachment-stale.txt`
    - deleted file
    - submitted message with stale reference
    - backend returned `404` with `error.code=attachment_not_found`
  - regression smoke:
    - AI conversation submit path returned assistant reply (`attachment-context-detected`)
    - `/run`-path primitives still work via tool runtime (`POST /api/v1/tools/execute` with `term.send_input`)
    - explain endpoint still works (`POST /api/v1/agent/terminal-commands/explain`)
    - tools list works (`GET /api/v1/tools`)
    - audit list works (`GET /api/v1/audit`)
- Result: `VERIFIED` — attachment references are now consumed by backend/provider flow through bounded local context, and stale references are rejected at submit time.
- Notes:
  - this remains local-reference based; no managed blob storage/import
  - binary/unsupported and oversize files are represented with bounded metadata status; no unlimited file read path exists

## Attachment UI truth

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `6765cfd`
  - `9a3959a`
  - `c27fca8`
- Validation steps:
  - runtime environment:
    - provider mock: `127.0.0.1:11446`
    - core: `go run ./cmd/rterm-core serve --listen 127.0.0.1:52932 ...`
    - frontend: `npm --prefix frontend run dev -- --host 127.0.0.1 --port 5179 --strictPort`
  - UI click-through (active compat AI panel):
    1. opened `http://127.0.0.1:5179/`, opened AI panel
    2. attached local text file through actual attach button (`attach-ui-final.txt`)
    3. verified pre-send chip shows filename/size and `local ref`
    4. sent message `final attachment ui truth message`
    5. verified sent transcript row contains attachment chip with `local ref`
    6. reloaded page, reopened AI panel, confirmed attachment chip still visible from backend snapshot truth
  - stale reference UI case:
    1. attached `attach-ui-stale2.txt`, then deleted file on disk before submit
    2. submit returned backend stale error path (`attachment_not_found`)
    3. UI now marks chip as `missing` and shows explicit local-file-unavailable banner
    4. repeated send is blocked client-side with explicit stale-reference guidance
  - unsupported/binary UI case:
    - normal file-picker path: `.bin` selection is rejected before attachment creation in this UI path (not attachable through normal picker contract)
    - binary reference rendering truth (feasible path): injected binary reference via backend API, then reloaded UI
    - transcript chip rendered with `local ref` + `metadata only` (no false claim of text ingestion)
  - regression smoke:
    - AI conversation path continues to respond
    - `/run echo attachment-ui-truth-run` works in AI panel flow
    - Tools panel opens and remains usable
    - Audit panel opens and lists recent events
- Result: `VERIFIED` — active attachment UX now renders local-reference state honestly for normal, stale, and metadata-only/binary-visible cases without changing attachment contract semantics.
- Notes:
  - expected `404 attachment_not_found` occurred during stale-case validation by design
  - unsupported binary files are still not attachable through normal picker path; no preview/gallery was introduced

## Plugin runtime

- Date: `2026-04-16`
- Status: `VERIFIED` (with one known repo-wide validation limitation)
- Commits:
  - `4a33aea`
  - `8a3163a`
  - `dd207ee`
  - `18a7e16`
  - `b331367`
  - `f21f956`
  - `43b3827`
  - `6cc9f7e`
  - `46988f8`
  - `626dc74`
- Validation steps:
  - automated checks:
    - `go test ./...` -> `PASS`
  - protocol process smoke:
    - `printf ... | go run ./cmd/rterm-core plugin-example`
    - observed handshake response and `status:"ok"` plugin response on stdout
  - runtime/API smoke:
    - core: `RTERM_AUTH_TOKEN=plugin-batch-token go run ./cmd/rterm-core serve --listen 127.0.0.1:52863 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-plugin-runtime.*`
    - `GET /api/v1/tools` included `plugin.example_echo`
    - `POST /api/v1/tools/execute` for `plugin.example_echo` returned `status:"ok"` with deterministic payload (`text`, `length`, `workspace_id`, `repo_root`)
  - approval flow regression:
    - `POST /api/v1/tools/execute` for `safety.add_ignore_rule` returned `428 requires_confirmation`
    - `safety.confirm` returned `approval_token`
    - retry with `approval_token` succeeded (`status:"ok"`)
  - audit flow checks:
    - plugin execution produced `plugin.example_echo` audit event with `success:true`
    - approval chain remained backend-authored and ordered:
      - blocked `safety.add_ignore_rule` (`success:false`, `error:"approval_required"`)
      - successful `safety.confirm`
      - approved retry `safety.add_ignore_rule` (`success:true`, `approval_used:true`)
  - in-process regression:
    - `workspace.list_widgets` still executed via tool runtime with `status:"ok"`
  - UI smoke:
    - `npm --prefix frontend run dev -- --host 127.0.0.1 --port 4215 --strictPort`
    - Playwright check opened `http://127.0.0.1:4215/`, opened existing `Tools` panel, and confirmed `plugin.example_echo` appears in current tool list
    - `npm run tauri:dev` reached desktop startup (`Running target/debug/rterm-desktop` + runtime ready JSON), then interrupted intentionally
  - release sweep:
    - `npm run validate` -> `NOT VERIFIED` for this slice because repo-wide pre-existing frontend lint issues fail at `lint:frontend` before downstream validate steps
- Result: `VERIFIED` — minimal side-process plugin runtime is functional end-to-end through the existing tool runtime path, with approval and audit contracts preserved.

## Plugin runtime hardening

- Date: `2026-04-16`
- Status: `VERIFIED` (with one known repo-wide validation limitation)
- Commits:
  - `44dddf8`
  - `f110a3c`
  - `c3cf44e`
  - `ed95313`
  - `e3f6f96`
  - `143ec34`
- Validation steps:
  - automated checks:
    - `go test ./...` -> `PASS`
    - targeted failure taxonomy checks:
      - `go test ./core/plugins -run 'TestInvokeFailsWhenPluginCommandPathIsMissing|TestInvokeFailsWhenHandshakeExceedsTimeout|TestInvokeRejectsMalformedPluginResponse|TestInvokeFailsWhenPluginCrashesDuringExecutionAfterHandshake' -count=1` -> `PASS`
      - `go test ./core/transport/httpapi -run TestStatusForExecuteErrorReturnsBadGatewayForPluginFailure -count=1` -> `PASS`
  - handshake/manifest protocol check:
    - `printf ... | go run ./cmd/rterm-core plugin-example`
    - observed handshake response with explicit manifest fields:
      - `plugin_id: "example.side_process"`
      - `plugin_version: "1.0.0"`
      - `protocol_version: "rterm.plugin.v1"`
      - `exposed_tools: ["plugin.example_echo"]`
  - runtime/API smoke:
    - core: `RTERM_AUTH_TOKEN=plugin-hardening-token go run ./cmd/rterm-core serve --listen 127.0.0.1:52980 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-plugin-hardening.*`
    - `GET /api/v1/tools` includes `plugin.example_echo`
    - `POST /api/v1/tools/execute` for `plugin.example_echo` returns `status:"ok"` with deterministic output
    - `POST /api/v1/tools/execute` for in-process `workspace.list_widgets` returns `status:"ok"`
  - approval/audit regression:
    - `safety.add_ignore_rule` still returns `428` challenge
    - `safety.confirm` returns `status:"ok"` and approval token
    - approved retry returns `status:"ok"`
    - `GET /api/v1/audit` still shows backend-owned chain:
      - blocked `safety.add_ignore_rule`
      - successful `safety.confirm`
      - approved retry `safety.add_ignore_rule` with `approval_used:true`
    - plugin execution still appears in audit as `tool_name:"plugin.example_echo"` with `success:true`
  - shell/tools-panel usability smoke:
    - frontend dev: `VITE_RTERM_API_BASE=http://127.0.0.1:52981 VITE_RTERM_AUTH_TOKEN=plugin-hardening-ui-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4216 --strictPort`
    - Playwright opened `http://127.0.0.1:4216/`, opened existing `Tools` panel, and confirmed `plugin.example_echo` is present and selectable
    - `npm run tauri:dev` reached desktop startup (`Running target/debug/rterm-desktop` plus ready JSON), then intentionally interrupted
  - release sweep:
    - `npm run validate` -> `NOT VERIFIED` for this slice because repo-wide pre-existing frontend lint errors fail at `lint:frontend` before downstream validate steps
- Result: `VERIFIED` — plugin runtime hardening keeps existing plugin-backed and in-process execution working, enforces explicit manifest/tool exposure contract, and surfaces typed plugin-runtime failures coherently.

## Repo validation hardening

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `c5f44b3`
  - `070638b`
  - `a820e55`
  - `fc92908`
- Validation steps:
  - baseline/failure audit:
    - `npm run validate` (baseline run before hardening) -> `FAILED` at frontend lint
    - `npm run build:frontend` -> `PASS`
    - `npm run test:go` -> `PASS`
    - `npm run build:go` -> `PASS`
    - `npm run tauri:check` -> `PASS`
  - lint debt checkpoints:
    - `npm --prefix frontend run lint -- --format json -o /tmp/runa-eslint.json` -> `849 errors`, `152 warnings` (baseline)
    - `npm --prefix frontend run lint -- --format json -o /tmp/runa-eslint-after-phase2.json` -> `630 errors`, `151 warnings` (after reduction)
    - `npm --prefix frontend run lint:active` -> `0 errors`, `15 warnings`
    - `npm run lint:frontend:all` -> expected red debt path remains (`630 errors`, `151 warnings`)
  - release-validate truth after script alignment:
    - `npm run validate` -> `PASS`
    - includes: `lint:frontend` (active scope), `build:frontend`, `test:go`, `build:go`, `tauri:check`
  - shell launch smoke:
    - `npm run tauri:dev` -> reached desktop startup (`Running target/debug/rterm-desktop`) and runtime ready JSON (`{"base_url":"http://127.0.0.1:64656","pid":93106}`)
- Result: `VERIFIED` — repo validation is now truthful and green on current RC release path, with full-frontend lint debt still explicit via a separate command.

## Workflow identity hardening

- Date: `2026-04-16`
- Status: `VERIFIED` (mixed runtime + targeted integration validation)
- Commits:
  - `985cf88`
  - `0d6eb9c`
  - `14d336f`
  - `aba2235`
- Validation steps:
  - runtime cross-surface sweep:
    - `python3 scripts/validate_operator_workflow.py` -> `PASS`
    - validated:
      - file -> AI reference + submit path works
      - file -> `/run`-related execution path works
      - terminal output -> explain path works
      - tool execution remains visible in audit
      - MCP invoke remains explicit and non-auto-injected into conversation
      - remote/local mismatch guard remains enforced
  - explicit terminal explain command targeting (identity hardening):
    - `./scripts/go.sh test ./core/transport/httpapi -run 'TestExplainTerminalCommandUsesExplicitCommandAuditEventIDPayload'` -> `PASS`
    - confirms explain audit uses explicit `command_audit_event_id` targeting instead of only latest-matching lineage
  - provenance/audit clarity checks:
    - `./scripts/go.sh test ./core/app -run 'TestCreateAttachmentReferenceAppendsAuditEventWithProvenance|TestExplainTerminalCommandUsesExplicitCommandAuditEventID'` -> `PASS`
    - `./scripts/go.sh test ./core/transport/httpapi -run 'TestInvokeMCPAppendsAuditWithExplicitProvenance|TestExecuteToolAcceptsSessionTargetFieldsAtTransportBoundary'` -> `PASS`
    - `./scripts/go.sh test ./core/app ./core/toolruntime ./core/transport/httpapi` -> `PASS`
  - frontend wiring checks for explicit handoff/provenance payloads:
    - `npm exec eslint app/aipanel/aipanel-compat.tsx app/aipanel/compat-conversation.ts app/view/term/compat-terminal.tsx app/workspace/files-floating-window.tsx app/workspace/tools-floating-window.tsx app/workspace/widget-helpers.ts rterm-api/conversation/types.ts rterm-api/tools/types.ts rterm-api/mcp/types.ts rterm-api/audit/types.ts` (run in `frontend/`) -> `PASS`
    - `npm exec vitest run app/view/term/explain-handoff.test.ts app/aipanel/run-command.test.ts` (run in `frontend/`) -> `PASS`
- Result: `VERIFIED` — workflow identity hardening now carries explicit explain command identity and explicit cross-surface provenance metadata while preserving existing operator workflow behavior.

## External MCP integration

- Date: `2026-04-16`
- Status: `VERIFIED`
- Commits:
  - `74f7b58`
  - `02cf774`
  - `07d78ba`
  - `c06c27a`
- Validation steps:
  - backend/API tests:
    - `./scripts/go.sh test ./core/app ./core/plugins ./core/transport/httpapi` -> `PASS`
  - frontend wiring checks:
    - `npm exec eslint app/workspace/tools-floating-window.tsx` (run in `frontend/`) -> `PASS`
    - `npm exec vitest run app/view/term/explain-handoff.test.ts app/aipanel/run-command.test.ts` (run in `frontend/`) -> `PASS`
  - live runtime validation with one real external MCP process:
    - core launch: `RTERM_AUTH_TOKEN=mcp-external-token go run ./cmd/rterm-core serve --listen 127.0.0.1:53111 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/rterm-mcp-external.*`
    - `GET /api/v1/mcp/servers` showed `mcp.example` in `stopped` state
    - `POST /api/v1/mcp/servers/mcp.example/start` returned `state:"idle", active:true`
    - small invoke:
      - `POST /api/v1/mcp/invoke` with `payload:{"text":"external-mcp-small"}` returned normalized output:
        - `format:"mcp.normalized.v1"`
        - `payload_type:"object"`
        - `truncated:false`
        - `original_bytes:125`
    - large invoke (bounding check):
      - `POST /api/v1/mcp/invoke` with `payload.text` length `20000` returned bounded normalized output:
        - `payload_type:"non_json"`
        - `truncated:true`
        - `original_bytes:20110`
        - notes include `payload clipped to max bytes`
      - response size stayed bounded:
        - full invoke response: `965` bytes
        - normalized output block: `480` bytes
    - stability check after large invoke:
      - `GET /healthz` -> `200`
      - `POST /api/v1/tools/execute` (`term.send_input`) still returned `status:"ok"`
      - terminal snapshot after run contained `echo mcp-external-stable` output
- Result: `VERIFIED` — external MCP output is now normalized and bounded before reuse, explicit invocation remains required, and runtime remained stable under large-response inputs.
- Notes:
  - this slice intentionally keeps explicit user action for MCP-to-AI handoff (`Use Normalized MCP Result In AI`) and does not auto-inject MCP output into agent context.
