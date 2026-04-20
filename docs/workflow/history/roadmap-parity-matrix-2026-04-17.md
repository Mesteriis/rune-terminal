# RunaTerminal Roadmap

## Status legend
- `TODO`
- `IN_PROGRESS`
- `DONE`
- `BLOCKED`

Progress инициализирован из audit trail: `MISSING -> TODO`, `PARTIAL -> IN_PROGRESS`, `FULL -> DONE` только для явно verified features; остальные `FULL -> IN_PROGRESS` до отдельной проверки.

## Domains

### 1. Terminal

### Feature: Ввод в терминал

- Status: DONE
- Parity: FULL
- Source: `frontend/src/components/TerminalSurface.tsx`; `frontend/src/lib/api.ts`
- Location: `frontend/app/view/term/compat-terminal.tsx`; `frontend/app/state/terminal.store.ts`; `core/transport/httpapi/handlers_terminal.go`
- Description: xterm-поверхность отправляет ввод в runtime path.

#### Required for DONE:
- `Ввод в терминал` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: `VERIFIED`: активный compat terminal посылает input через `terminalStore -> compat facade -> /api/v1/terminal/{widget}/input`; live runtime smoke вернул `bytes_sent` и terminal output.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Ввод в терминал` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-terminal-input)

#### Notes:
- Разница с текущим состоянием: `VERIFIED`: активный compat terminal посылает input через `terminalStore -> compat facade -> /api/v1/terminal/{widget}/input`; live runtime smoke вернул `bytes_sent` и terminal output.

### Feature: Потоковый вывод терминала

- Status: DONE
- Parity: FULL
- Source: `frontend/src/components/TerminalSurface.tsx`; `frontend/src/lib/api.ts`
- Location: `frontend/app/state/terminal.store.ts`; `frontend/rterm-api/http/sse.ts`; `core/transport/httpapi/handlers_terminal.go`
- Description: Поверхность поднимает live stream для terminal output.

#### Required for DONE:
- `Потоковый вывод терминала` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: `VERIFIED`: активный terminal читает snapshot и live chunks из нового HTTP/SSE path; live snapshot вернул `audit-input` и корректный `next_seq`.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Потоковый вывод терминала` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-terminal-stream-output)

#### Notes:
- Разница с текущим состоянием: `VERIFIED`: активный terminal читает snapshot и live chunks из нового HTTP/SSE path; live snapshot вернул `audit-input` и корректный `next_seq`.

### Feature: Scrollback / snapshot hydration

- Status: IN_PROGRESS
- Parity: FULL
- Source: `frontend/src/components/TerminalSurface.tsx`; `frontend/src/lib/terminal.ts`
- Location: `frontend/app/state/terminal.store.ts`; `core/transport/httpapi/handlers_terminal.go`
- Description: Перед live stream загружается snapshot с накопленными chunks.

#### Required for DONE:
- `Scrollback / snapshot hydration` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Store сначала refresh snapshot, затем поднимает stream от `next_seq`.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Scrollback / snapshot hydration` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-terminal-scrollback-snapshot-hydration)

#### Notes:
- Разница с текущим состоянием: Store сначала refresh snapshot, затем поднимает stream от `next_seq`.

### Feature: Interrupt активной terminal session

- Status: DONE
- Parity: FULL
- Source: `frontend/src/components/TerminalSurface.tsx`; `frontend/src/hooks/useWorkspaceActions.ts`
- Location: `core/app/tool_terminal.go`; `docs/frontend-terminal-interrupt-validation.md`
- Description: Есть отдельное действие `term.interrupt`.

#### Required for DONE:
- `Interrupt активной terminal session` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: `VERIFIED`: runtime path и structured interrupt response реализованы в новом backend; live API smoke вернул `interrupted:true`, хотя мгновенная отмена long-running команды остаётся ограничением.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Interrupt активной terminal session` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-terminal-interrupt-active-session)

#### Notes:
- Разница с текущим состоянием: `VERIFIED`: runtime path и structured interrupt response реализованы в новом backend; live API smoke вернул `interrupted:true`, хотя мгновенная отмена long-running команды остаётся ограничением.

### Feature: Клавиатурные copy/paste shortcuts

- Status: IN_PROGRESS
- Parity: FULL
- Source: `frontend/src/components/TerminalSurface.tsx`
- Location: `frontend/app/view/term/termwrap.ts`
- Description: Реализованы copy selection и paste clipboard shortcuts.

#### Required for DONE:
- `Клавиатурные copy/paste shortcuts` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Compat terminal всё ещё использует legacy clipboard handlers поверх активного terminal runtime.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Клавиатурные copy/paste shortcuts` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-terminal-copy-paste-shortcuts)

#### Notes:
- Разница с текущим состоянием: Compat terminal всё ещё использует legacy clipboard handlers поверх активного terminal runtime.

### Feature: Follow output / jump to latest

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/components/TerminalSurface.tsx`
- Location: `frontend/app/view/term/termwrap.ts`; `frontend/app/view/term/compat-terminal.tsx`
- Description: Есть follow-state и явный возврат к последнему выводу.

#### Required for DONE:
- `Follow output / jump to latest` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Автоскролл и scrollback есть, но активный compat shell не даёт доказанной TideTerm-like visible `Jump to latest` control surface.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Follow output / jump to latest` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-terminal-follow-output-jump-latest)

#### Notes:
- Разница с текущим состоянием: Автоскролл и scrollback есть, но активный compat shell не даёт доказанной TideTerm-like visible `Jump to latest` control surface.

### Feature: Drag & drop путей в терминал

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `README.md` раздел `Drag & Drop Paths into Terminal`
- Location: `frontend/app/view/term/termwrap.ts`
- Description: Поддерживаются локальные и remote path insert workflows.

#### Required for DONE:
- `Drag & drop путей в терминал` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Local drop-handling есть, но полный TideTerm flow с remote files blocks на active path не подтверждён.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Drag & drop путей в терминал` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-terminal-drag-drop-paths)

#### Notes:
- Разница с текущим состоянием: Local drop-handling есть, но полный TideTerm flow с remote files blocks на active path не подтверждён.

### Feature: Открытие текущей директории терминала в новом block

- Status: TODO
- Parity: MISSING
- Source: `README.md` раздел `Open Current Directory in a New Block`
- Location: `frontend/app/app.tsx`
- Description: TideTerm использует shell metadata для открытия текущего каталога в новом block.

#### Required for DONE:
- `Открытие текущей директории терминала в новом block` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Есть только legacy `AppInner` context-menu path; `CompatAppInner` его не подключает.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Открытие текущей директории терминала в новом block` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-terminal-open-current-directory-new-block)

#### Notes:
- Разница с текущим состоянием: Есть только legacy `AppInner` context-menu path; `CompatAppInner` его не подключает.

### Feature: Multi-session terminals в одном terminal block

- Status: TODO
- Parity: MISSING
- Source: `README.md` раздел `Multi-Session Terminals (Single Block)`; `frontend/v1_front/app/view/term/term.tsx`; `frontend/v1_front/app/view/term/term.scss`
- Location: `frontend/app/tab/tabcontent.tsx`
- Description: В одном terminal block можно держать несколько terminal sessions.

#### Required for DONE:
- `Multi-session terminals в одном terminal block` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Compat tab renderer держит один terminal widget; session sidebar/session list не подключены.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Multi-session terminals в одном terminal block` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-terminal-multi-session-block)

#### Notes:
- Разница с текущим состоянием: Compat tab renderer держит один terminal widget; session sidebar/session list не подключены.

### Feature: Remote tmux resume и tmux session manager

- Status: TODO
- Parity: MISSING
- Source: `README.md` разделы `Remote Terminal Resume (tmux)` и `tmux Session Manager`; `pkg/wshrpc/wshserver/tmux.go`; `frontend/v1_front/app/modals/tmuxsessions.tsx`
- Location: `frontend/app/modals/tmuxsessions.tsx`; `frontend/app/store/wshclientapi.ts`
- Description: Подтверждены resume semantics и отдельный session manager для remote tmux.

#### Required for DONE:
- `Remote tmux resume и tmux session manager` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: В репозитории остался legacy UI/RPC слой, но активный compat path работает на new core HTTP API без этого runtime wiring.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Remote tmux resume и tmux session manager` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-terminal-remote-tmux-resume-manager)

#### Notes:
- Разница с текущим состоянием: В репозитории остался legacy UI/RPC слой, но активный compat path работает на new core HTTP API без этого runtime wiring.

### 2. Workspace

### Feature: Block-based workspace с terminal/files/preview/web/editor/AI

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `README.md` раздел `Highlights`; `README.md` раздел `Create blocks`
- Location: `frontend/app/tab/tabcontent.tsx`; `frontend/app/view/preview/*`; `frontend/app/view/webview/*`; `frontend/app/view/codeeditor/*`
- Description: Workspace TideTerm описан как block-oriented surface с несколькими типами block.

#### Required for DONE:
- `Block-based workspace с terminal/files/preview/web/editor/AI` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Legacy non-terminal views лежат в repo, но compat tab content в active path рендерит только terminal widget и иначе показывает `Unsupported Widget`.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Block-based workspace с terminal/files/preview/web/editor/AI` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-workspace-block-based-surface)

#### Notes:
- Разница с текущим состоянием: Legacy non-terminal views лежат в repo, но compat tab content в active path рендерит только terminal widget и иначе показывает `Unsupported Widget`.

### Feature: Создание block через sidebar / launcher surface

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `README.md` раздел `Create blocks`; `frontend/src/lib/launcherCatalog.ts`
- Location: `frontend/app/workspace/widgets.tsx`; `frontend/app/store/global.ts`
- Description: Подтверждён shell-level creation/discovery path.

#### Required for DONE:
- `Создание block через sidebar / launcher surface` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Entry points `createBlock(...)` сохранились, но active compat workspace snapshot backend-owned и не даёт доказанной parity для non-terminal blocks.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Создание block через sidebar / launcher surface` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-workspace-create-block-sidebar-launcher)

#### Notes:
- Разница с текущим состоянием: Entry points `createBlock(...)` сохранились, но active compat workspace snapshot backend-owned и не даёт доказанной parity для non-terminal blocks.

### Feature: Drag/rearrange blocks внутри workspace

- Status: TODO
- Parity: MISSING
- Source: `README.md` раздел `Create blocks`
- Location: `frontend/app/tab/tabcontent.tsx`
- Description: TideTerm явно заявляет drag-to-rearrange workspace behavior.

#### Required for DONE:
- `Drag/rearrange blocks внутри workspace` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Активный compat path не использует legacy `TileLayout`; block layout DnD отсутствует.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Drag/rearrange blocks внутри workspace` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-workspace-drag-rearrange-blocks)

#### Notes:
- Разница с текущим состоянием: Активный compat path не использует legacy `TileLayout`; block layout DnD отсутствует.

### Feature: Tab switching / focus

- Status: DONE
- Parity: FULL
- Source: `frontend/src/hooks/useWorkspaceActions.ts`; `frontend/src/components/WorkspaceTab.tsx`; `frontend/src/types.ts`
- Location: `frontend/app/tab/tabbar.tsx`; `frontend/app/state/workspace.store.ts`; `frontend/rterm-api/workspace/client.ts`
- Description: Есть tab inventory и focus action.

#### Required for DONE:
- `Tab switching / focus` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: `VERIFIED`: active compat tabbar использует new workspace snapshot/actions; live `focus-tab` smoke переключал `tab-main -> tab-ops -> tab-main` и синхронно менял `active_widget_id`.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Tab switching / focus` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-workspace-tab-switching-focus)

#### Notes:
- Разница с текущим состоянием: `VERIFIED`: active compat tabbar использует new workspace snapshot/actions; live `focus-tab` smoke переключал `tab-main -> tab-ops -> tab-main` и синхронно менял `active_widget_id`.

### Feature: Создание terminal tab

- Status: IN_PROGRESS
- Parity: FULL
- Source: `frontend/src/hooks/useWorkspaceActions.ts`; `frontend/src/lib/api.ts`
- Location: `frontend/app/tab/tabbar.tsx`; `frontend/app/state/workspace.store.ts`; `frontend/rterm-api/workspace/client.ts`; `core/transport/httpapi/api.go`
- Description: Подтверждён `createTerminalTab` и вариант с connection.

#### Required for DONE:
- `Создание terminal tab` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Новые terminal tabs создаются через dedicated workspace endpoints.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Создание terminal tab` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-workspace-create-terminal-tab)

#### Notes:
- Разница с текущим состоянием: Новые terminal tabs создаются через dedicated workspace endpoints.

### Feature: Rename / pin / close tab

- Status: IN_PROGRESS
- Parity: FULL
- Source: `frontend/src/hooks/useWorkspaceActions.ts`; `frontend/src/lib/api.ts`
- Location: `frontend/app/tab/tabbar.tsx`; `frontend/app/state/workspace.store.ts`; `frontend/rterm-api/workspace/client.ts`
- Description: Присутствуют rename, pin/unpin и close operations.

#### Required for DONE:
- `Rename / pin / close tab` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Эти tab mutations wired к новому workspace API.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Rename / pin / close tab` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-workspace-rename-pin-close-tab)

#### Notes:
- Разница с текущим состоянием: Эти tab mutations wired к новому workspace API.

### Feature: Drag reorder tabs

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/components/WorkspaceTab.tsx`; `frontend/src/hooks/useWorkspaceLayout.ts`; `frontend/src/hooks/useWorkspaceActions.ts`
- Location: `frontend/app/tab/tabbar.tsx`; `frontend/app/state/workspace.store.ts`
- Description: Tab strip поддерживает drag/reorder semantics.

#### Required for DONE:
- `Drag reorder tabs` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Reorder работает, но текущий workspace contract уже и проще TideTerm block/tab grammar.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Drag reorder tabs` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-workspace-drag-reorder-tabs)

#### Notes:
- Разница с текущим состоянием: Reorder работает, но текущий workspace contract уже и проще TideTerm block/tab grammar.

### Feature: Focus widget / quick widget access

- Status: IN_PROGRESS
- Parity: FULL
- Source: `frontend/src/hooks/useWorkspaceActions.ts`; `frontend/src/components/WidgetDock.tsx`
- Location: `frontend/app/workspace/widgets.tsx`; `frontend/app/state/workspace.store.ts`
- Description: Widget focus вынесен в отдельное shell action.

#### Required for DONE:
- `Focus widget / quick widget access` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Compat workspace по-прежнему показывает widget rail и умеет фокусировать известные widgets из snapshot.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Focus widget / quick widget access` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-workspace-focus-widget-quick-access)

#### Notes:
- Разница с текущим состоянием: Compat workspace по-прежнему показывает widget rail и умеет фокусировать известные widgets из snapshot.

### 3. AI / Tools

### Feature: Persistent conversation transcript

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/hooks/useConversation.ts`; `frontend/src/components/AgentTranscript.tsx`
- Location: `core/conversation/*`; `core/transport/httpapi/handlers_agent_conversation.go`; `frontend/app/aipanel/waveai-model.tsx`
- Description: Conversation snapshot и transcript feed подтверждены.

#### Required for DONE:
- `Persistent conversation transcript` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Новый backend conversation storage есть, но active compat AIPanel всё ещё использует legacy WaveAI transport, а не `/api/v1/agent/conversation`.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Persistent conversation transcript` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ai-persistent-conversation-transcript)

#### Notes:
- Разница с текущим состоянием: Новый backend conversation storage есть, но active compat AIPanel всё ещё использует legacy WaveAI transport, а не `/api/v1/agent/conversation`.

### Feature: Prompt profile selection

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/components/AgentModeStrip.tsx`; `frontend/src/types.ts`
- Location: `core/agent/*`; `core/transport/httpapi/handlers_agent.go`; `frontend/app/aipanel/aimode.tsx`
- Description: Подтверждены prompt profiles в agent catalog.

#### Required for DONE:
- `Prompt profile selection` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: В core есть prompt profiles, но active compat AI UI завязан на legacy `waveai` mode config, не на new agent catalog.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Prompt profile selection` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ai-prompt-profile-selection)

#### Notes:
- Разница с текущим состоянием: В core есть prompt profiles, но active compat AI UI завязан на legacy `waveai` mode config, не на new agent catalog.

### Feature: Role preset selection

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/components/AgentModeStrip.tsx`; `frontend/src/types.ts`
- Location: `core/agent/*`; `core/transport/httpapi/handlers_agent.go`
- Description: Подтверждены role presets.

#### Required for DONE:
- `Role preset selection` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Backend role presets есть, но active compat UI не использует новый `agent` catalog path.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Role preset selection` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ai-role-preset-selection)

#### Notes:
- Разница с текущим состоянием: Backend role presets есть, но active compat UI не использует новый `agent` catalog path.

### Feature: Work mode selection

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/components/AgentModeStrip.tsx`; `frontend/src/types.ts`
- Location: `core/agent/*`; `core/transport/httpapi/handlers_agent.go`
- Description: Подтверждены selectable work modes.

#### Required for DONE:
- `Work mode selection` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Runtime path существует, однако активная UI wiring остаётся legacy-mode driven.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Work mode selection` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ai-work-mode-selection)

#### Notes:
- Разница с текущим состоянием: Runtime path существует, однако активная UI wiring остаётся legacy-mode driven.

### Feature: Free-text AI conversation

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/hooks/useConversation.ts`; `frontend/src/lib/api.ts`
- Location: `core/transport/httpapi/handlers_agent_conversation.go`; `frontend/app/aipanel/waveai-model.tsx`
- Description: Есть backend-backed conversation submit path.

#### Required for DONE:
- `Free-text AI conversation` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: `NOT VERIFIED` для active UI: free-text conversation реализован в new core, но active compat AIPanel по коду продолжает ждать `/api/post-chat-message`, которого в current core нет.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Free-text AI conversation` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ai-free-text-conversation)

#### Notes:
- Разница с текущим состоянием: `NOT VERIFIED` для active UI: free-text conversation реализован в new core, но active compat AIPanel по коду продолжает ждать `/api/post-chat-message`, которого в current core нет.

### Feature: Явный `/run <command>` execution path

- Status: DONE
- Parity: FULL
- Source: `frontend/src/hooks/useAiCommandExecution.ts`; `frontend/src/lib/aiTerminalCommand.ts`
- Location: `core/app/ai_terminal_command.go`; `core/transport/httpapi/handlers_agent_conversation.go`
- Description: Отдельный AI-triggered terminal command path подтверждён по коду.

#### Required for DONE:
- `Явный `/run <command>` execution path` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: `VERIFIED`: active compat AI panel detects `/run`, executes `term.send_input` through the tool/runtime path, and renders the observed result in the current transcript.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Явный `/run <command>` execution path` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ai-run-command-execution-path)

#### Notes:
- Разница с текущим состоянием: `VERIFIED`: active compat AI panel detects `/run`, executes `term.send_input` through the tool/runtime path, and renders the observed result in the current transcript.

### Feature: Объяснение результата terminal command

- Status: DONE
- Parity: FULL
- Source: `frontend/src/hooks/useAiCommandExecution.ts`; `frontend/src/hooks/useConversation.ts`
- Location: `core/app/ai_terminal_command.go`; `core/transport/httpapi/handlers_agent_conversation.go`
- Description: После выполнения команды вызывается explanation route.

#### Required for DONE:
- `Объяснение результата terminal command` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: `VERIFIED`: active compat AI panel calls the explanation route after `/run` execution and appends the backend assistant reply in the same transcript.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Объяснение результата terminal command` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ai-terminal-command-explanation)

#### Notes:
- Разница с текущим состоянием: `VERIFIED`: active compat AI panel calls the explanation route after `/run` execution and appends the backend assistant reply in the same transcript.

### Feature: Approval внутри AI/tool flow

- Status: DONE
- Parity: FULL
- Source: `frontend/src/hooks/useApprovalFlow.ts`; `frontend/src/hooks/useAiCommandExecution.ts`
- Location: `core/app/tool_policy.go`; `core/toolruntime/*`; `frontend/app/aipanel/aitooluse.tsx`
- Description: Approval tokens и confirm-and-retry интегрированы в AI/tool path.

#### Required for DONE:
- `Approval внутри AI/tool flow` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: `VERIFIED`: active compat AI panel surfaces approval-required `/run`, confirms via `safety.confirm`, retries with `approval_token`, and preserves audit visibility.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Approval внутри AI/tool flow` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ai-approval-flow)

#### Notes:
- Разница с текущим состоянием: `VERIFIED`: active compat AI panel surfaces approval-required `/run`, confirms via `safety.confirm`, retries with `approval_token`, and preserves audit visibility.

### Feature: Manual tool catalog и JSON execution

- Status: TODO
- Parity: MISSING
- Source: `frontend/src/components/ToolConsolePanel.tsx`; `frontend/src/lib/api.ts`
- Location: `core/transport/httpapi/handlers_tools.go`; `frontend/rterm-api/tools/*`
- Description: Есть операторская shell surface для listing/execute tools.

#### Required for DONE:
- `Manual tool catalog и JSON execution` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Active operator/tool console surface не найдена; при этом backend `POST /api/v1/tools/execute` path отдельно `VERIFIED` через live runtime smoke.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Manual tool catalog и JSON execution` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ai-manual-tool-catalog-json-execution)

#### Notes:
- Разница с текущим состоянием: Active operator/tool console surface не найдена; при этом backend `POST /api/v1/tools/execute` path отдельно `VERIFIED` через live runtime smoke.

### 4. Runtime / Remote

### Feature: Local PTY sessions

- Status: IN_PROGRESS
- Parity: FULL
- Source: `frontend/src/components/TerminalSurface.tsx`; `pkg/shellexec/shellexec.go`
- Location: `core/terminal/service.go`; `core/terminal/pty_unix.go`; `frontend/app/view/term/compat-terminal.tsx`
- Description: Локальные terminal sessions являются базовым runtime path.

#### Required for DONE:
- `Local PTY sessions` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Активный terminal runtime локально работает на new PTY service.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Local PTY sessions` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-runtime-local-pty-sessions)

#### Notes:
- Разница с текущим состоянием: Активный terminal runtime локально работает на new PTY service.

### Feature: Saved SSH profiles

- Status: IN_PROGRESS
- Parity: FULL
- Source: `README.md` раздел `Remote Connections (SSH / WSL)`; `frontend/src/components/ConnectionsPanel.tsx`; `pkg/remote/conncontroller/conncontroller.go`
- Location: `core/connections/service.go`; `frontend/rterm-api/connections/*`; `core/transport/httpapi/handlers_connections.go`
- Description: Подтверждены SSH connection workflows и сохранённые профили.

#### Required for DONE:
- `Saved SSH profiles` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Saved SSH profiles backend-owned и типизированы.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Saved SSH profiles` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-runtime-saved-ssh-profiles)

#### Notes:
- Разница с текущим состоянием: Saved SSH profiles backend-owned и типизированы.

### Feature: Выбор default connection для новых shell launches

- Status: IN_PROGRESS
- Parity: FULL
- Source: `frontend/src/components/ConnectionsPanel.tsx`; `frontend/src/hooks/useConnectionsActions.ts`; `frontend/src/types.ts`
- Location: `core/app/tool_connections.go`; `frontend/rterm-api/connections/client.ts`
- Description: Есть active/default target semantics.

#### Required for DONE:
- `Выбор default connection для новых shell launches` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Active connection selection для future tabs реализован.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Выбор default connection для новых shell launches` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-runtime-default-connection-selection)

#### Notes:
- Разница с текущим состоянием: Active connection selection для future tabs реализован.

### Feature: Preflight connection check

- Status: IN_PROGRESS
- Parity: FULL
- Source: `frontend/src/components/ConnectionsPanel.tsx`; `frontend/src/hooks/useConnectionsActions.ts`
- Location: `core/connections/checker.go`; `core/app/tool_connections.go`; `frontend/rterm-api/connections/client.ts`
- Description: Подтверждён явный `Check` flow.

#### Required for DONE:
- `Preflight connection check` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Dedicated check flow есть в runtime/API.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Preflight connection check` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-runtime-preflight-connection-check)

#### Notes:
- Разница с текущим состоянием: Dedicated check flow есть в runtime/API.

### Feature: Open shell against selected connection

- Status: IN_PROGRESS
- Parity: FULL
- Source: `frontend/src/components/ConnectionsPanel.tsx`; `frontend/src/hooks/useWorkspaceActions.ts`
- Location: `core/app/workspace_actions.go`; `core/app/connection_launch.go`; `frontend/rterm-api/workspace/client.ts`
- Description: Есть явный launch remote shell action.

#### Required for DONE:
- `Open shell against selected connection` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: New terminal tab может стартовать с `connection_id`.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Open shell against selected connection` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-runtime-open-shell-selected-connection)

#### Notes:
- Разница с текущим состоянием: New terminal tab может стартовать с `connection_id`.

### Feature: Remote file browsing

- Status: TODO
- Parity: MISSING
- Source: `README.md` разделы `Highlights` и `Work with files`; `pkg/remote/fileshare/*`
- Location: `frontend/app/view/preview/*`; `frontend/app/tab/tabcontent.tsx`
- Description: TideTerm заявляет и хранит backend support для remote filesystem browsing.

#### Required for DONE:
- `Remote file browsing` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Активный compat workspace не поддерживает non-terminal remote file widgets, а new core не содержит TideTerm fileshare parity.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Remote file browsing` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-runtime-remote-file-browsing)

#### Notes:
- Разница с текущим состоянием: Активный compat workspace не поддерживает non-terminal remote file widgets, а new core не содержит TideTerm fileshare parity.

### Feature: Remote file preview/edit

- Status: TODO
- Parity: MISSING
- Source: `README.md` раздел `Work with files`; `pkg/remote/fileshare/*`
- Location: `frontend/app/view/preview/*`; `frontend/app/view/codeeditor/*`
- Description: Remote preview/edit flows подтверждены README и fileshare packages.

#### Required for DONE:
- `Remote file preview/edit` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Остались legacy views, но active compat render path и new runtime contract их не подтверждают.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Remote file preview/edit` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-runtime-remote-file-preview-edit)

#### Notes:
- Разница с текущим состоянием: Остались legacy views, но active compat render path и new runtime contract их не подтверждают.

### Feature: WSL connections

- Status: TODO
- Parity: MISSING
- Source: `README.md` раздел `Remote Connections (SSH / WSL)`; `pkg/wslconn/wslconn.go`; `cmd/wsh/cmd/wshcmd-wsl.go`
- Location: `frontend/app/modals/conntypeahead.tsx`
- Description: Подтверждён отдельный WSL connection path.

#### Required for DONE:
- `WSL connections` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: В current `core/connections` есть только `local | ssh`; отдельного WSL runtime/domain path нет.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `WSL connections` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-runtime-wsl-connections)

#### Notes:
- Разница с текущим состоянием: В current `core/connections` есть только `local | ssh`; отдельного WSL runtime/domain path нет.

### Feature: `wsh` remote helper workflow

- Status: TODO
- Parity: MISSING
- Source: `README.md` раздел `wsh (Shell Extensions)`; `pkg/remote/conncontroller/conncontroller.go`
- Location: `frontend/app/store/wshclientapi.ts`
- Description: Подтверждены install/enable/resume semantics для `wsh`.

#### Required for DONE:
- ``wsh` remote helper workflow` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: New core remote model намеренно не использует TideTerm `wsh` remote helper stack.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить ``wsh` remote helper workflow` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-runtime-wsh-remote-helper-workflow)

#### Notes:
- Разница с текущим состоянием: New core remote model намеренно не использует TideTerm `wsh` remote helper stack.

### Feature: `wsh` CLI для workspace/runtime control

- Status: TODO
- Parity: MISSING
- Source: `README.md` раздел `wsh CLI`; `cmd/wsh/cmd/wshcmd-root.go`; `cmd/wsh/cmd/wshcmd-*.go`
- Location: `—`
- Description: Отдельный CLI surface подтверждён кодом и README.

#### Required for DONE:
- ``wsh` CLI для workspace/runtime control` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: В current repo нет аналога TideTerm `cmd/wsh/*`.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить ``wsh` CLI для workspace/runtime control` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-runtime-wsh-cli-control)

#### Notes:
- Разница с текущим состоянием: В current repo нет аналога TideTerm `cmd/wsh/*`.

### 5. Policy / Security

### Feature: Trusted rules management

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/components/TrustedRulesManager.tsx`; `frontend/src/lib/api.ts`; `frontend/src/types.ts`
- Location: `core/policy/*`; `core/app/tool_policy.go`; `frontend/rterm-api/policy/*`; `frontend/app/view/waveconfig/*`
- Description: Подтверждено управление trusted allowlist rules.

#### Required for DONE:
- `Trusted rules management` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Backend policy rules есть, но active compat shell не даёт доказанной full settings parity surface.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Trusted rules management` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-policy-trusted-rules-management)

#### Notes:
- Разница с текущим состоянием: Backend policy rules есть, но active compat shell не даёт доказанной full settings parity surface.

### Feature: Ignore / secret rules management

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/components/IgnoreRulesManager.tsx`; `frontend/src/lib/api.ts`; `frontend/src/types.ts`
- Location: `core/policy/*`; `core/app/tool_policy.go`; `frontend/rterm-api/policy/*`; `frontend/app/view/waveconfig/*`
- Description: Подтверждено управление ignore/secret protection rules.

#### Required for DONE:
- `Ignore / secret rules management` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Ignore rules поддерживаются runtime, но user-facing compat settings surface остаётся неполной и legacy-driven.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Ignore / secret rules management` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-policy-ignore-secret-rules-management)

#### Notes:
- Разница с текущим состоянием: Ignore rules поддерживаются runtime, но user-facing compat settings surface остаётся неполной и legacy-driven.

### Feature: Allowed roots / capability enforcement

- Status: IN_PROGRESS
- Parity: FULL
- Source: `frontend/src/types.ts`; `pkg/aitoolpolicy/*`; `pkg/aiusechat/policy_runtime.go`
- Location: `core/policy/pipeline.go`; `core/policy/store.go`; `core/toolruntime/*`
- Description: Политика исполнения имеет capability и policy layers.

#### Required for DONE:
- `Allowed roots / capability enforcement` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Enforcement реализован в backend execution pipeline.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Allowed roots / capability enforcement` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-policy-allowed-roots-capability-enforcement)

#### Notes:
- Разница с текущим состоянием: Enforcement реализован в backend execution pipeline.

### Feature: Approval token confirm flow

- Status: DONE
- Parity: FULL
- Source: `frontend/src/hooks/useApprovalFlow.ts`; `frontend/src/lib/api.ts`
- Location: `core/app/tool_policy.go`; `core/toolruntime/approval.go`; `core/transport/httpapi/handlers_tools.go`; `docs/frontend-approval-action-validation.md`
- Description: Есть `safety.confirm` и retry с one-time token.

#### Required for DONE:
- `Approval token confirm flow` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: `VERIFIED`: `safety.confirm` и one-time approval token path реализованы в runtime/API; live smoke дал `428 approval_required`, затем `approval_token`, затем успешный retry и повторный `requires_confirmation` при replay.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Approval token confirm flow` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-policy-approval-token-confirm-flow)

#### Notes:
- Разница с текущим состоянием: `VERIFIED`: `safety.confirm` и one-time approval token path реализованы в runtime/API; live smoke дал `428 approval_required`, затем `approval_token`, затем успешный retry и повторный `requires_confirmation` при replay.

### Feature: Audit trail

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/components/AuditPanel.tsx`; `frontend/src/lib/api.ts`; `frontend/src/types.ts`
- Location: `core/audit/*`; `core/transport/httpapi/handlers_system.go`
- Description: Подтверждён явный audit events surface.

#### Required for DONE:
- `Audit trail` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Audit log backend-owned и доступен по API, но active compat audit panel surface не найдена.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Audit trail` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-policy-audit-trail)

#### Notes:
- Разница с текущим состоянием: Audit log backend-owned и доступен по API, но active compat audit panel surface не найдена.

### Feature: Profile/role/mode policy overlay

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/types.ts`; `frontend/src/components/AgentModeStrip.tsx`
- Location: `core/agent/*`; `core/policy/*`; `core/app/conversation_actions.go`
- Description: Agent selection влияет на effective policy profile.

#### Required for DONE:
- `Profile/role/mode policy overlay` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Overlay logic существует в backend, но active compat AI UI не wired to new agent selection API.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Profile/role/mode policy overlay` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-policy-profile-role-mode-overlay)

#### Notes:
- Разница с текущим состоянием: Overlay logic существует в backend, но active compat AI UI не wired to new agent selection API.

### 6. UX / Shell

### Feature: AI sidebar / AI panel

- Status: IN_PROGRESS
- Parity: FULL
- Source: `frontend/src/App.tsx`; `frontend/src/components/AgentPanel.tsx`
- Location: `frontend/app/workspace/workspace.tsx`; `frontend/app/aipanel/aipanel.tsx`
- Description: Левая AI surface является частью shell layout.

#### Required for DONE:
- `AI sidebar / AI panel` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Левая AI surface реально монтируется в active compat shell.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `AI sidebar / AI panel` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ux-ai-sidebar-panel)

#### Notes:
- Разница с текущим состоянием: Левая AI surface реально монтируется в active compat shell.

### Feature: Workspace switcher

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/components/WorkspaceSwitcher.tsx`
- Location: `frontend/app/tab/tabbar.tsx`; `frontend/app/tab/workspaceswitcher.tsx`; `frontend/app/state/workspace.store.ts`
- Description: Есть отдельный shell popover для workspace context и launch actions.

#### Required for DONE:
- `Workspace switcher` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Workspace switcher surface есть, но полноценная multi-workspace semantics на current runtime не подтверждена.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Workspace switcher` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ux-workspace-switcher)

#### Notes:
- Разница с текущим состоянием: Workspace switcher surface есть, но полноценная multi-workspace semantics на current runtime не подтверждена.

### Feature: Searchable launcher / app entry

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/lib/launcherCatalog.ts`; `frontend/src/components/LauncherPanel.tsx`
- Location: `frontend/app/workspace/widgets.tsx`; `frontend/app/view/launcher/launcher.tsx`
- Description: Shell содержит launcher-like discovery surface.

#### Required for DONE:
- `Searchable launcher / app entry` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Launcher-related legacy surfaces существуют, но active compat path не даёт доказанной non-terminal parity.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Searchable launcher / app entry` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ux-searchable-launcher)

#### Notes:
- Разница с текущим состоянием: Launcher-related legacy surfaces существуют, но active compat path не даёт доказанной non-terminal parity.

### Feature: Right utility / widget dock

- Status: IN_PROGRESS
- Parity: FULL
- Source: `frontend/src/components/WidgetDock.tsx`
- Location: `frontend/app/workspace/widgets.tsx`
- Description: Подтверждён slim utility/widget rail.

#### Required for DONE:
- `Right utility / widget dock` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Правая utility rail активна и видима в compat shell.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Right utility / widget dock` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ux-right-utility-widget-dock)

#### Notes:
- Разница с текущим состоянием: Правая utility rail активна и видима в compat shell.

### Feature: Settings / help surfaces

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/components/SettingsHelpPanel.tsx`; `frontend/src/components/PolicyPanel.tsx`
- Location: `frontend/app/workspace/widgets.tsx`; `frontend/app/view/waveconfig/*`; `frontend/app/view/helpview/helpview.tsx`
- Description: Есть отдельные utility surfaces для settings/help/policy.

#### Required for DONE:
- `Settings / help surfaces` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Gear/help entrypoints есть, но они опираются на legacy `createBlock` views вне доказанного compat render path.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Settings / help surfaces` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ux-settings-help-surfaces)

#### Notes:
- Разница с текущим состоянием: Gear/help entrypoints есть, но они опираются на legacy `createBlock` views вне доказанного compat render path.

### Feature: Connections panel

- Status: IN_PROGRESS
- Parity: PARTIAL
- Source: `frontend/src/components/ConnectionsPanel.tsx`
- Location: `core/app/tool_connections.go`; `frontend/rterm-api/connections/*`; `frontend/app/modals/conntypeahead.tsx`
- Description: Есть отдельная shell panel для connection workflows.

#### Required for DONE:
- `Connections panel` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Backend connection domain реальный, но TideTerm-like dedicated connections panel в active compat shell не подтверждён.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Connections panel` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ux-connections-panel)

#### Notes:
- Разница с текущим состоянием: Backend connection domain реальный, но TideTerm-like dedicated connections panel в active compat shell не подтверждён.

### Feature: Runtime tools / audit utility panels

- Status: TODO
- Parity: MISSING
- Source: `frontend/src/components/ToolConsolePanel.tsx`; `frontend/src/components/AuditPanel.tsx`
- Location: `core/transport/httpapi/handlers_tools.go`; `core/transport/httpapi/handlers_system.go`
- Description: Есть runtime tools console и audit panel.

#### Required for DONE:
- `Runtime tools / audit utility panels` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Backend tools/audit APIs есть, но активной compat UI surface для них не найдено.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Runtime tools / audit utility panels` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ux-runtime-tools-audit-panels)

#### Notes:
- Разница с текущим состоянием: Backend tools/audit APIs есть, но активной compat UI surface для них не найдено.

### Feature: Мгновенное переключение языка English / 中文

- Status: TODO
- Parity: MISSING
- Source: `README.md` раздел `Language (English / 中文)`; `frontend/v1_front/app/view/waveconfig/settingscontent.tsx`; `frontend/v1_front/app/i18n/i18n-core.ts`
- Location: `frontend/app/view/waveconfig/settingscontent.tsx`; `frontend/app/i18n/i18n-core.ts`
- Description: Подтверждено мгновенное переключение языка без рестарта.

#### Required for DONE:
- `Мгновенное переключение языка English / 中文` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Legacy i18n UI осталась, но active compat shell не даёт доказанного settings route до рабочего language switch.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Мгновенное переключение языка English / 中文` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ux-language-switch)

#### Notes:
- Разница с текущим состоянием: Legacy i18n UI осталась, но active compat shell не даёт доказанного settings route до рабочего language switch.

### Feature: Window title auto / rename

- Status: TODO
- Parity: MISSING
- Source: `README.md` раздел `Window Titles (Auto / Rename)`
- Location: `frontend/app/window/windowtitle.tsx`; `frontend/app/app.tsx`
- Description: TideTerm поддерживает auto title и user-defined rename window flows.

#### Required for DONE:
- `Window title auto / rename` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: `WindowTitleManager` подключён только в `AppInner`; `CompatAppInner` его не монтирует.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `Window title auto / rename` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ux-window-title-auto-rename)

#### Notes:
- Разница с текущим состоянием: `WindowTitleManager` подключён только в `AppInner`; `CompatAppInner` его не монтирует.

### Feature: MCP server manager

- Status: TODO
- Parity: MISSING
- Source: `README.md` раздел `MCP Server Manager`; `pkg/mcpconfig/service.go`; `frontend/v1_front/app/view/waveconfig/mcpcontent.tsx`
- Location: `frontend/app/view/waveconfig/mcpcontent.tsx`
- Description: Подтверждён отдельный MCP management surface и backend sync logic.

#### Required for DONE:
- `MCP server manager` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Legacy UI/RPC residue есть, но в current `core/` нет подтверждённого MCP runtime/API parity.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `MCP server manager` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ux-mcp-server-manager)

#### Notes:
- Разница с текущим состоянием: Legacy UI/RPC residue есть, но в current `core/` нет подтверждённого MCP runtime/API parity.

### Feature: API Proxy / WaveProxy

- Status: TODO
- Parity: MISSING
- Source: `README.md` раздел `API Proxy (WaveProxy)`; `pkg/waveproxy/*`; `frontend/v1_front/app/view/proxy/*`
- Location: `frontend/app/view/proxy/*`
- Description: Подтверждён proxy surface с channel management, metrics и history.

#### Required for DONE:
- `API Proxy / WaveProxy` подтверждена на active runtime/UI path RunaTerminal.
- Ограничение из audit снято: Legacy proxy UI присутствует, но current core/runtime path для TideTerm WaveProxy отсутствует.

#### Validation:
- Код: проверить текущий path из поля `Location`.
- Поведение: проверить `API Proxy / WaveProxy` против TideTerm baseline из поля `Source`.

#### Validation log:
- [Validation Log](validation.md#feature-ux-api-proxy-waveproxy)

#### Notes:
- Разница с текущим состоянием: Legacy proxy UI присутствует, но current core/runtime path для TideTerm WaveProxy отсутствует.
