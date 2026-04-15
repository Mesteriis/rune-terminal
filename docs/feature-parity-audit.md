# Feature Parity Audit

Область оценки для RunaTerminal в этом audit:

- активная browser/desktop entrypoint идёт через `frontend/index.html -> frontend/wave.ts -> initBrowserCompatRuntime() -> <App compatMode />`
- активный shell рендерится через `frontend/app/workspace/workspace.tsx`
- активный compat tab render идёт через `frontend/app/tab/tabcontent.tsx`
- legacy view-файлы под `frontend/app/view/*`, `frontend/app/modals/*` и `frontend/app/store/wshclientapi.ts` не считаются `FULL` сами по себе; для `FULL` нужна доказанная активная compat wiring и текущий `core/` runtime/API path

## Terminal

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Ввод в терминал | FULL | `frontend/app/view/term/compat-terminal.tsx`; `frontend/app/state/terminal.store.ts`; `core/transport/httpapi/handlers_terminal.go` | Активный compat terminal посылает input через `terminalStore -> compat facade -> /api/v1/terminal/{widget}/input`. |
| Потоковый вывод терминала | FULL | `frontend/app/state/terminal.store.ts`; `frontend/rterm-api/http/sse.ts`; `core/transport/httpapi/handlers_terminal.go` | Активный terminal читает snapshot и live chunks из нового HTTP/SSE path. |
| Scrollback / snapshot hydration | FULL | `frontend/app/state/terminal.store.ts`; `core/transport/httpapi/handlers_terminal.go` | Store сначала refresh snapshot, затем поднимает stream от `next_seq`. |
| Interrupt активной terminal session | FULL | `core/app/tool_terminal.go`; `docs/frontend-terminal-interrupt-validation.md` | Runtime path и structured interrupt response реализованы в новом backend. |
| Клавиатурные copy/paste shortcuts | FULL | `frontend/app/view/term/termwrap.ts` | Compat terminal всё ещё использует legacy clipboard handlers поверх активного terminal runtime. |
| Follow output / jump to latest | PARTIAL | `frontend/app/view/term/termwrap.ts`; `frontend/app/view/term/compat-terminal.tsx` | Автоскролл и scrollback есть, но активный compat shell не даёт доказанной TideTerm-like visible `Jump to latest` control surface. |
| Drag & drop путей в терминал | PARTIAL | `frontend/app/view/term/termwrap.ts` | Local drop-handling есть, но полный TideTerm flow с remote files blocks на active path не подтверждён. |
| Открытие текущей директории терминала в новом block | MISSING | `frontend/app/app.tsx` | Есть только legacy `AppInner` context-menu path; `CompatAppInner` его не подключает. |
| Multi-session terminals в одном terminal block | MISSING | `frontend/app/tab/tabcontent.tsx` | Compat tab renderer держит один terminal widget; session sidebar/session list не подключены. |
| Remote tmux resume и tmux session manager | MISSING | `frontend/app/modals/tmuxsessions.tsx`; `frontend/app/store/wshclientapi.ts` | В репозитории остался legacy UI/RPC слой, но активный compat path работает на new core HTTP API без этого runtime wiring. |

## Workspace

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Block-based workspace с terminal/files/preview/web/editor/AI | PARTIAL | `frontend/app/tab/tabcontent.tsx`; `frontend/app/view/preview/*`; `frontend/app/view/webview/*`; `frontend/app/view/codeeditor/*` | Legacy non-terminal views лежат в repo, но compat tab content в active path рендерит только terminal widget и иначе показывает `Unsupported Widget`. |
| Создание block через sidebar / launcher surface | PARTIAL | `frontend/app/workspace/widgets.tsx`; `frontend/app/store/global.ts` | Entry points `createBlock(...)` сохранились, но active compat workspace snapshot backend-owned и не даёт доказанной parity для non-terminal blocks. |
| Drag/rearrange blocks внутри workspace | MISSING | `frontend/app/tab/tabcontent.tsx` | Активный compat path не использует legacy `TileLayout`; block layout DnD отсутствует. |
| Tab switching / focus | FULL | `frontend/app/tab/tabbar.tsx`; `frontend/app/state/workspace.store.ts`; `frontend/rterm-api/workspace/client.ts` | Active compat tabbar использует new workspace snapshot/actions. |
| Создание terminal tab | FULL | `frontend/app/tab/tabbar.tsx`; `frontend/app/state/workspace.store.ts`; `frontend/rterm-api/workspace/client.ts`; `core/transport/httpapi/api.go` | Новые terminal tabs создаются через dedicated workspace endpoints. |
| Rename / pin / close tab | FULL | `frontend/app/tab/tabbar.tsx`; `frontend/app/state/workspace.store.ts`; `frontend/rterm-api/workspace/client.ts` | Эти tab mutations wired к новому workspace API. |
| Drag reorder tabs | PARTIAL | `frontend/app/tab/tabbar.tsx`; `frontend/app/state/workspace.store.ts` | Reorder работает, но текущий workspace contract уже и проще TideTerm block/tab grammar. |
| Focus widget / quick widget access | FULL | `frontend/app/workspace/widgets.tsx`; `frontend/app/state/workspace.store.ts` | Compat workspace по-прежнему показывает widget rail и умеет фокусировать известные widgets из snapshot. |

## Navigation / UI

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| AI sidebar / AI panel | FULL | `frontend/app/workspace/workspace.tsx`; `frontend/app/aipanel/aipanel.tsx` | Левая AI surface реально монтируется в active compat shell. |
| Workspace switcher | PARTIAL | `frontend/app/tab/tabbar.tsx`; `frontend/app/tab/workspaceswitcher.tsx`; `frontend/app/state/workspace.store.ts` | Workspace switcher surface есть, но полноценная multi-workspace semantics на current runtime не подтверждена. |
| Searchable launcher / app entry | PARTIAL | `frontend/app/workspace/widgets.tsx`; `frontend/app/view/launcher/launcher.tsx` | Launcher-related legacy surfaces существуют, но active compat path не даёт доказанной non-terminal parity. |
| Right utility / widget dock | FULL | `frontend/app/workspace/widgets.tsx` | Правая utility rail активна и видима в compat shell. |
| Settings / help surfaces | PARTIAL | `frontend/app/workspace/widgets.tsx`; `frontend/app/view/waveconfig/*`; `frontend/app/view/helpview/helpview.tsx` | Gear/help entrypoints есть, но они опираются на legacy `createBlock` views вне доказанного compat render path. |
| Connections panel | PARTIAL | `core/app/tool_connections.go`; `frontend/rterm-api/connections/*`; `frontend/app/modals/conntypeahead.tsx` | Backend connection domain реальный, но TideTerm-like dedicated connections panel в active compat shell не подтверждён. |
| Runtime tools / audit utility panels | MISSING | `core/transport/httpapi/handlers_tools.go`; `core/transport/httpapi/handlers_system.go` | Backend tools/audit APIs есть, но активной compat UI surface для них не найдено. |

## Tools / AI

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Persistent conversation transcript | PARTIAL | `core/conversation/*`; `core/transport/httpapi/handlers_agent_conversation.go`; `frontend/app/aipanel/waveai-model.tsx` | Новый backend conversation storage есть, но active compat AIPanel всё ещё использует legacy WaveAI transport, а не `/api/v1/agent/conversation`. |
| Prompt profile selection | PARTIAL | `core/agent/*`; `core/transport/httpapi/handlers_agent.go`; `frontend/app/aipanel/aimode.tsx` | В core есть prompt profiles, но active compat AI UI завязан на legacy `waveai` mode config, не на new agent catalog. |
| Role preset selection | PARTIAL | `core/agent/*`; `core/transport/httpapi/handlers_agent.go` | Backend role presets есть, но active compat UI не использует новый `agent` catalog path. |
| Work mode selection | PARTIAL | `core/agent/*`; `core/transport/httpapi/handlers_agent.go` | Runtime path существует, однако активная UI wiring остаётся legacy-mode driven. |
| Free-text AI conversation | PARTIAL | `core/transport/httpapi/handlers_agent_conversation.go`; `frontend/app/aipanel/waveai-model.tsx` | Free-text conversation реализован в new core, но active compat AIPanel по коду продолжает ждать `/api/post-chat-message`, которого в current core нет. |
| Явный `/run <command>` execution path | PARTIAL | `core/app/ai_terminal_command.go`; `core/transport/httpapi/handlers_agent_conversation.go` | `/run` path реализован в backend/docs, но active compat AI panel не использует этот path. |
| Объяснение результата terminal command | PARTIAL | `core/app/ai_terminal_command.go`; `core/transport/httpapi/handlers_agent_conversation.go` | Explanation route существует, но active compat AI panel на него не переключён. |
| Approval внутри AI/tool flow | PARTIAL | `core/app/tool_policy.go`; `core/toolruntime/*`; `frontend/app/aipanel/aitooluse.tsx` | Approval runtime есть, но active AI surface живёт на legacy tool-use approval semantics, не на new `safety.confirm` UI wiring. |
| Manual tool catalog и JSON execution | MISSING | `core/transport/httpapi/handlers_tools.go`; `frontend/rterm-api/tools/*` | HTTP execution API есть, но активной operator/tool console surface в compat shell не найдено. |

## Runtime / Connectivity

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Local PTY sessions | FULL | `core/terminal/service.go`; `core/terminal/pty_unix.go`; `frontend/app/view/term/compat-terminal.tsx` | Активный terminal runtime локально работает на new PTY service. |
| Saved SSH profiles | FULL | `core/connections/service.go`; `frontend/rterm-api/connections/*`; `core/transport/httpapi/handlers_connections.go` | Saved SSH profiles backend-owned и типизированы. |
| Выбор default connection для новых shell launches | FULL | `core/app/tool_connections.go`; `frontend/rterm-api/connections/client.ts` | Active connection selection для future tabs реализован. |
| Preflight connection check | FULL | `core/connections/checker.go`; `core/app/tool_connections.go`; `frontend/rterm-api/connections/client.ts` | Dedicated check flow есть в runtime/API. |
| Open shell against selected connection | FULL | `core/app/workspace_actions.go`; `core/app/connection_launch.go`; `frontend/rterm-api/workspace/client.ts` | New terminal tab может стартовать с `connection_id`. |
| Remote file browsing | MISSING | `frontend/app/view/preview/*`; `frontend/app/tab/tabcontent.tsx` | Активный compat workspace не поддерживает non-terminal remote file widgets, а new core не содержит TideTerm fileshare parity. |
| Remote file preview/edit | MISSING | `frontend/app/view/preview/*`; `frontend/app/view/codeeditor/*` | Остались legacy views, но active compat render path и new runtime contract их не подтверждают. |
| WSL connections | MISSING | `frontend/app/modals/conntypeahead.tsx` | В current `core/connections` есть только `local | ssh`; отдельного WSL runtime/domain path нет. |
| `wsh` remote helper workflow | MISSING | `frontend/app/store/wshclientapi.ts` | New core remote model намеренно не использует TideTerm `wsh` remote helper stack. |
| `wsh` CLI для workspace/runtime control | MISSING | `—` | В current repo нет аналога TideTerm `cmd/wsh/*`. |

## Policy / Security

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Trusted rules management | PARTIAL | `core/policy/*`; `core/app/tool_policy.go`; `frontend/rterm-api/policy/*`; `frontend/app/view/waveconfig/*` | Backend policy rules есть, но active compat shell не даёт доказанной full settings parity surface. |
| Ignore / secret rules management | PARTIAL | `core/policy/*`; `core/app/tool_policy.go`; `frontend/rterm-api/policy/*`; `frontend/app/view/waveconfig/*` | Ignore rules поддерживаются runtime, но user-facing compat settings surface остаётся неполной и legacy-driven. |
| Allowed roots / capability enforcement | FULL | `core/policy/pipeline.go`; `core/policy/store.go`; `core/toolruntime/*` | Enforcement реализован в backend execution pipeline. |
| Approval token confirm flow | FULL | `core/app/tool_policy.go`; `core/toolruntime/approval.go`; `core/transport/httpapi/handlers_tools.go`; `docs/frontend-approval-action-validation.md` | `safety.confirm` и one-time approval token path реализованы в runtime/API. |
| Audit trail | PARTIAL | `core/audit/*`; `core/transport/httpapi/handlers_system.go` | Audit log backend-owned и доступен по API, но active compat audit panel surface не найдена. |
| Profile/role/mode policy overlay | PARTIAL | `core/agent/*`; `core/policy/*`; `core/app/conversation_actions.go` | Overlay logic существует в backend, но active compat AI UI не wired to new agent selection API. |

## Misc

| Feature | Status | Location | Notes |
| --- | --- | --- | --- |
| Мгновенное переключение языка English / 中文 | MISSING | `frontend/app/view/waveconfig/settingscontent.tsx`; `frontend/app/i18n/i18n-core.ts` | Legacy i18n UI осталась, но active compat shell не даёт доказанного settings route до рабочего language switch. |
| Window title auto / rename | MISSING | `frontend/app/window/windowtitle.tsx`; `frontend/app/app.tsx` | `WindowTitleManager` подключён только в `AppInner`; `CompatAppInner` его не монтирует. |
| MCP server manager | MISSING | `frontend/app/view/waveconfig/mcpcontent.tsx` | Legacy UI/RPC residue есть, но в current `core/` нет подтверждённого MCP runtime/API parity. |
| API Proxy / WaveProxy | MISSING | `frontend/app/view/proxy/*` | Legacy proxy UI присутствует, но current core/runtime path для TideTerm WaveProxy отсутствует. |
