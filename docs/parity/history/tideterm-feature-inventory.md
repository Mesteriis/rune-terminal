# TideTerm Feature Inventory

Источник инвентаря:

- локальный репозиторий TideTerm: `/Users/avm/projects/Personal/tideterm`
- зафиксированная вершина при audit: `50f7f8fac55f5c9123d9857801479375f9990f14`

Метод:

- просмотрены пользовательские описания в `README.md`
- просмотрены подтверждающие frontend-файлы в `frontend/src/*`
- где текущая пользовательская поверхность живёт только в legacy renderer, просмотрены соответствующие файлы в `frontend/v1_front/*`
- просмотрены backend/runtime опоры в `pkg/*` и `cmd/wsh/*`

Ниже перечислены только те фичи, которые удалось подтвердить по коду и/или явно по `README.md`.

## Terminal

| Фича | Подтверждение в TideTerm | Краткое замечание |
| --- | --- | --- |
| Ввод в терминал | `frontend/src/components/TerminalSurface.tsx`; `frontend/src/lib/api.ts` | xterm-поверхность отправляет ввод в runtime path. |
| Потоковый вывод терминала | `frontend/src/components/TerminalSurface.tsx`; `frontend/src/lib/api.ts` | Поверхность поднимает live stream для terminal output. |
| Scrollback / snapshot hydration | `frontend/src/components/TerminalSurface.tsx`; `frontend/src/lib/terminal.ts` | Перед live stream загружается snapshot с накопленными chunks. |
| Interrupt активной terminal session | `frontend/src/components/TerminalSurface.tsx`; `frontend/src/hooks/useWorkspaceActions.ts` | Есть отдельное действие `term.interrupt`. |
| Клавиатурные copy/paste shortcuts | `frontend/src/components/TerminalSurface.tsx` | Реализованы copy selection и paste clipboard shortcuts. |
| Follow output / jump to latest | `frontend/src/components/TerminalSurface.tsx` | Есть follow-state и явный возврат к последнему выводу. |
| Drag & drop путей в терминал | `README.md` раздел `Drag & Drop Paths into Terminal` | Поддерживаются локальные и remote path insert workflows. |
| Открытие текущей директории терминала в новом block | `README.md` раздел `Open Current Directory in a New Block` | TideTerm использует shell metadata для открытия текущего каталога в новом block. |
| Multi-session terminals в одном terminal block | `README.md` раздел `Multi-Session Terminals (Single Block)`; `frontend/v1_front/app/view/term/term.tsx`; `frontend/v1_front/app/view/term/term.scss` | В одном terminal block можно держать несколько terminal sessions. |
| Remote tmux resume и tmux session manager | `README.md` разделы `Remote Terminal Resume (tmux)` и `tmux Session Manager`; `pkg/wshrpc/wshserver/tmux.go`; `frontend/v1_front/app/modals/tmuxsessions.tsx` | Подтверждены resume semantics и отдельный session manager для remote tmux. |

## Workspace

| Фича | Подтверждение в TideTerm | Краткое замечание |
| --- | --- | --- |
| Block-based workspace с terminal/files/preview/web/editor/AI | `README.md` раздел `Highlights`; `README.md` раздел `Create blocks` | Workspace TideTerm описан как block-oriented surface с несколькими типами block. |
| Создание block через sidebar / launcher surface | `README.md` раздел `Create blocks`; `frontend/src/lib/launcherCatalog.ts` | Подтверждён shell-level creation/discovery path. |
| Drag/rearrange blocks внутри workspace | `README.md` раздел `Create blocks` | TideTerm явно заявляет drag-to-rearrange workspace behavior. |
| Tab switching / focus | `frontend/src/hooks/useWorkspaceActions.ts`; `frontend/src/components/WorkspaceTab.tsx`; `frontend/src/types.ts` | Есть tab inventory и focus action. |
| Создание terminal tab | `frontend/src/hooks/useWorkspaceActions.ts`; `frontend/src/lib/api.ts` | Подтверждён `createTerminalTab` и вариант с connection. |
| Rename / pin / close tab | `frontend/src/hooks/useWorkspaceActions.ts`; `frontend/src/lib/api.ts` | Присутствуют rename, pin/unpin и close operations. |
| Drag reorder tabs | `frontend/src/components/WorkspaceTab.tsx`; `frontend/src/hooks/useWorkspaceLayout.ts`; `frontend/src/hooks/useWorkspaceActions.ts` | Tab strip поддерживает drag/reorder semantics. |
| Focus widget / quick widget access | `frontend/src/hooks/useWorkspaceActions.ts`; `frontend/src/components/WidgetDock.tsx` | Widget focus вынесен в отдельное shell action. |

## Navigation / UI

| Фича | Подтверждение в TideTerm | Краткое замечание |
| --- | --- | --- |
| AI sidebar / AI panel | `frontend/src/App.tsx`; `frontend/src/components/AgentPanel.tsx` | Левая AI surface является частью shell layout. |
| Workspace switcher | `frontend/src/components/WorkspaceSwitcher.tsx` | Есть отдельный shell popover для workspace context и launch actions. |
| Searchable launcher / app entry | `frontend/src/lib/launcherCatalog.ts`; `frontend/src/components/LauncherPanel.tsx` | Shell содержит launcher-like discovery surface. |
| Right utility / widget dock | `frontend/src/components/WidgetDock.tsx` | Подтверждён slim utility/widget rail. |
| Settings / help surfaces | `frontend/src/components/SettingsHelpPanel.tsx`; `frontend/src/components/PolicyPanel.tsx` | Есть отдельные utility surfaces для settings/help/policy. |
| Connections panel | `frontend/src/components/ConnectionsPanel.tsx` | Есть отдельная shell panel для connection workflows. |
| Runtime tools / audit utility panels | `frontend/src/components/ToolConsolePanel.tsx`; `frontend/src/components/AuditPanel.tsx` | Есть runtime tools console и audit panel. |

## Tools / AI

| Фича | Подтверждение в TideTerm | Краткое замечание |
| --- | --- | --- |
| Persistent conversation transcript | `frontend/src/hooks/useConversation.ts`; `frontend/src/components/AgentTranscript.tsx` | Conversation snapshot и transcript feed подтверждены. |
| Prompt profile selection | `frontend/src/components/AgentModeStrip.tsx`; `frontend/src/types.ts` | Подтверждены prompt profiles в agent catalog. |
| Role preset selection | `frontend/src/components/AgentModeStrip.tsx`; `frontend/src/types.ts` | Подтверждены role presets. |
| Work mode selection | `frontend/src/components/AgentModeStrip.tsx`; `frontend/src/types.ts` | Подтверждены selectable work modes. |
| Free-text AI conversation | `frontend/src/hooks/useConversation.ts`; `frontend/src/lib/api.ts` | Есть backend-backed conversation submit path. |
| Явный `/run <command>` execution path | `frontend/src/hooks/useAiCommandExecution.ts`; `frontend/src/lib/aiTerminalCommand.ts` | Отдельный AI-triggered terminal command path подтверждён по коду. |
| Объяснение результата terminal command | `frontend/src/hooks/useAiCommandExecution.ts`; `frontend/src/hooks/useConversation.ts` | После выполнения команды вызывается explanation route. |
| Approval внутри AI/tool flow | `frontend/src/hooks/useApprovalFlow.ts`; `frontend/src/hooks/useAiCommandExecution.ts` | Approval tokens и confirm-and-retry интегрированы в AI/tool path. |
| Manual tool catalog и JSON execution | `frontend/src/components/ToolConsolePanel.tsx`; `frontend/src/lib/api.ts` | Есть операторская shell surface для listing/execute tools. |

## Runtime / Connectivity

| Фича | Подтверждение в TideTerm | Краткое замечание |
| --- | --- | --- |
| Local PTY sessions | `frontend/src/components/TerminalSurface.tsx`; `pkg/shellexec/shellexec.go` | Локальные terminal sessions являются базовым runtime path. |
| Saved SSH profiles | `README.md` раздел `Remote Connections (SSH / WSL)`; `frontend/src/components/ConnectionsPanel.tsx`; `pkg/remote/conncontroller/conncontroller.go` | Подтверждены SSH connection workflows и сохранённые профили. |
| Выбор default connection для новых shell launches | `frontend/src/components/ConnectionsPanel.tsx`; `frontend/src/hooks/useConnectionsActions.ts`; `frontend/src/types.ts` | Есть active/default target semantics. |
| Preflight connection check | `frontend/src/components/ConnectionsPanel.tsx`; `frontend/src/hooks/useConnectionsActions.ts` | Подтверждён явный `Check` flow. |
| Open shell against selected connection | `frontend/src/components/ConnectionsPanel.tsx`; `frontend/src/hooks/useWorkspaceActions.ts` | Есть явный launch remote shell action. |
| Remote file browsing | `README.md` разделы `Highlights` и `Work with files`; `pkg/remote/fileshare/*` | TideTerm заявляет и хранит backend support для remote filesystem browsing. |
| Remote file preview/edit | `README.md` раздел `Work with files`; `pkg/remote/fileshare/*` | Remote preview/edit flows подтверждены README и fileshare packages. |
| WSL connections | `README.md` раздел `Remote Connections (SSH / WSL)`; `pkg/wslconn/wslconn.go`; `cmd/wsh/cmd/wshcmd-wsl.go` | Подтверждён отдельный WSL connection path. |
| `wsh` remote helper workflow | `README.md` раздел `wsh (Shell Extensions)`; `pkg/remote/conncontroller/conncontroller.go` | Подтверждены install/enable/resume semantics для `wsh`. |
| `wsh` CLI для workspace/runtime control | `README.md` раздел `wsh CLI`; `cmd/wsh/cmd/wshcmd-root.go`; `cmd/wsh/cmd/wshcmd-*.go` | Отдельный CLI surface подтверждён кодом и README. |

## Policy / Security

| Фича | Подтверждение в TideTerm | Краткое замечание |
| --- | --- | --- |
| Trusted rules management | `frontend/src/components/TrustedRulesManager.tsx`; `frontend/src/lib/api.ts`; `frontend/src/types.ts` | Подтверждено управление trusted allowlist rules. |
| Ignore / secret rules management | `frontend/src/components/IgnoreRulesManager.tsx`; `frontend/src/lib/api.ts`; `frontend/src/types.ts` | Подтверждено управление ignore/secret protection rules. |
| Allowed roots / capability enforcement | `frontend/src/types.ts`; `pkg/aitoolpolicy/*`; `pkg/aiusechat/policy_runtime.go` | Политика исполнения имеет capability и policy layers. |
| Approval token confirm flow | `frontend/src/hooks/useApprovalFlow.ts`; `frontend/src/lib/api.ts` | Есть `safety.confirm` и retry с one-time token. |
| Audit trail | `frontend/src/components/AuditPanel.tsx`; `frontend/src/lib/api.ts`; `frontend/src/types.ts` | Подтверждён явный audit events surface. |
| Profile/role/mode policy overlay | `frontend/src/types.ts`; `frontend/src/components/AgentModeStrip.tsx` | Agent selection влияет на effective policy profile. |

## Misc

| Фича | Подтверждение в TideTerm | Краткое замечание |
| --- | --- | --- |
| Мгновенное переключение языка English / 中文 | `README.md` раздел `Language (English / 中文)`; `frontend/v1_front/app/view/waveconfig/settingscontent.tsx`; `frontend/v1_front/app/i18n/i18n-core.ts` | Подтверждено мгновенное переключение языка без рестарта. |
| Window title auto / rename | `README.md` раздел `Window Titles (Auto / Rename)` | TideTerm поддерживает auto title и user-defined rename window flows. |
| MCP server manager | `README.md` раздел `MCP Server Manager`; `pkg/mcpconfig/service.go`; `frontend/v1_front/app/view/waveconfig/mcpcontent.tsx` | Подтверждён отдельный MCP management surface и backend sync logic. |
| API Proxy / WaveProxy | `README.md` раздел `API Proxy (WaveProxy)`; `pkg/waveproxy/*`; `frontend/v1_front/app/view/proxy/*` | Подтверждён proxy surface с channel management, metrics и history. |
