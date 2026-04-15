# Feature Gap Summary

Сводка по `docs/feature-parity-audit.md`:

- всего фич в inventory: `54`
- `FULL`: `18`
- `PARTIAL`: `21`
- `MISSING`: `15`
- `UNKNOWN`: `0`

## Missing Features (Top Priority)

- Active compat shell остаётся terminal-first surface и не даёт TideTerm-style block workspace с рабочими `files / preview / web / editor` widgets.
- Active compat AI panel не подключён к новому `core/transport/httpapi` agent path; по коду он ждёт legacy `/api/post-chat-message`, которого в current core нет.
- В active compat shell не найдена рабочая surface для runtime tools / audit utility panels, хотя backend APIs `/api/v1/tools` и `/api/v1/audit` существуют.
- В current core нет TideTerm-equivalent remote breadth: remote file browsing, remote preview/edit, WSL connections, `wsh` remote helper workflow, `wsh` CLI.
- В active compat shell отсутствует рабочая parity для language switch, window title auto/rename, MCP manager и WaveProxy.

## Partial Features (Need Completion)

- Workspace и launcher entrypoints частично сохранились, но active compat renderer в `frontend/app/tab/tabcontent.tsx` поддерживает только terminal widget и не доводит legacy `createBlock(...)` flows до полноценного результата.
- AI-related backend pieces (`core/agent`, `core/conversation`, `core/app/ai_terminal_command.go`) существуют, но active compat UI использует legacy `WaveAIModel`, а не новые `/api/v1/agent/*` endpoints.
- Connections runtime в new core реален и типизирован, но user-facing UX в active compat path остаётся уже TideTerm panel semantics и опирается на legacy selector residue.
- Policy runtime реализован в new core, но trusted/ignore/audit surfaces в compat shell не достигли подтверждённой пользовательской parity.
- Terminal slice в целом рабочий, но follow/jump-latest и drag-and-drop сохраняют только часть TideTerm behavior.
- Tab model поддерживает focus/create/rename/pin/close/reorder, но текущий contract уже TideTerm full workspace grammar и не покрывает block-layout richness.

## Risk Areas

- В репозитории одновременно живут новый backend/API слой и legacy compat UI; из-за этого наличие `core/*` feature не означает, что active shell действительно её показывает пользователю.
- Legacy view-файлы под `frontend/app/view/*` создают ложное ощущение parity breadth, хотя active compat tab renderer не рендерит non-terminal widgets.
- Legacy `wshclientapi`/modal/view residue создаёт видимость remote/MCP/proxy breadth без подтверждённого current core wiring.
- Документы, написанные вокруг нового backend path, могут переоценивать пользовательскую готовность AI/settings/runtime surfaces, пока active UI остаётся compat-layer based.
- Tool/runtime approval flow backend-validated, но active compat AI surface остаётся отдельным legacy миром и не доказывает parity нового AI execution UX.

## False Assumptions

- Backend conversation и `/run` path выглядят как завершённая AI parity, но active compat AIPanel не использует `/api/v1/agent/conversation` и `/api/v1/agent/terminal-commands/explain`.
- Settings/help/MCP/proxy могут казаться реализованными из-за наличия `frontend/app/view/waveconfig/*` и `frontend/app/view/proxy/*`, но active compat shell не подтверждает их как рабочие пользовательские surfaces.
- Window title management может казаться готовым из-за `frontend/app/window/windowtitle.tsx`, но `CompatAppInner` этот manager не монтирует.
- Language switch может казаться существующим из-за `frontend/app/view/waveconfig/settingscontent.tsx`, но активный compat path не доказывает рабочую route до этого settings surface.
- Remote breadth может казаться близкой к TideTerm из-за `conntypeahead`, `tmuxsessions` и legacy RPC helpers, но current new core сознательно ограничен `local + ssh` и не воспроизводит TideTerm remote controller/fileshare stack.
