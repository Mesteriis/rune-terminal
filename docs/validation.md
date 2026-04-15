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
- Status: `PARTIAL`
- Commit: `2d0b4d689d22e7ae82a3e92dcf7a05385a58b1b7`
- Validation steps: Через active compat `Tools` panel проверены list, execute, approval и retry поверх `/api/v1/tools/execute`. Audit utility panel отдельно не проверялся в этом slice.
- Result: UI для tool runtime подтверждён по list/execute/approval/retry. Audit utility panel на active path в этом slice не валидировалась.
- Notes: Эта запись заменяет старое audit-наблюдение только для tool-runtime части. Полная parity для combined `tools / audit` surface ещё не доказана, потому что audit panel в рамках этого slice не подключалась и не проверялась.

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

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: `NOT VERIFIED` для active UI: `/run` path реализован в backend/docs, но active compat AI panel не использует этот path. 

<a id="feature-ai-terminal-command-explanation"></a>
## Объяснение результата terminal command

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: `NOT VERIFIED` для active UI: explanation route существует, но active compat AI panel на него не переключён. 

<a id="feature-ai-approval-flow"></a>
## Approval внутри AI/tool flow

- Date: `—`
- Status: `NOT RUN`
- Commit: `—`
- Validation steps: Отдельный feature-specific validation run ещё не зафиксирован; использовать критерии из `docs/roadmap.md` и текущий path из audit.
- Result: Подтверждённого validation result нет; текущий ориентир только parity status из audit.
- Notes: Placeholder-секция для будущих проверок. Текущее audit-наблюдение: Смешанный статус: backend approval flow `VERIFIED`, но active AI surface `NOT VERIFIED` для нового `safety.confirm` UI wiring и всё ещё живёт на legacy tool-use approval semantics. 

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
