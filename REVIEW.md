# Ревью проекта **runa-terminal**

> Дата ревью: 20 апреля 2026
> Скоуп: качество кода, архитектура, дизайн системы и UI
> Формат: только наблюдения и рекомендации, без правок в коде

---

## 1. Краткое резюме

`runa-terminal` — амбициозная попытка пересобрать класс «рабочее место программиста» (терминал + файловый менеджер в духе Total Commander + AI/инструменты + плагины) с нуля. Архитектура заявлена как «Go-ядро + Tauri-оболочка + React-фронтенд + плагины через JSON-line stdio», и на бумаге это сильное, современное решение. Backend (Go) реализован дисциплинированно и заметно опережает остальные слои по зрелости. Фронтенд формально следует слоистой архитектуре, но фактически живёт на mock-данных и пока не подключён к ядру. Документация широкая, но рассинхронизирована с фактическим кодом, а инфраструктуры разработки (CI, согласованные имена пакетов, lockfile-дисциплина в нескольких местах) местами не хватает.

Общее впечатление — **«сильный фундамент, слабая склейка»**: ядро, ADR и протокол плагинов выглядят как готовый продакшен-каркас, тогда как UI и часть инфраструктуры остаются прототипом, который пока не подтверждает заявления в README.

---

## 2. Стек и репозиторий

Корневой каркас:

- `core/` — модули Go-ядра: `agent`, `app`, `audit`, `config`, `connections`, `conversation`, `execution`, `plugins`, `policy`, `terminal`, `toolruntime`, `transport`, `workspace`.
- `cmd/rterm-core/` — CLI-обёртка ядра с подкомандами `serve` и `plugin-example`.
- `apps/desktop/src-tauri/` — Tauri 2.10 desktop-shell на Rust, поднимающий sidecar Go-ядро.
- `frontend/` — React 19 + TypeScript 5.6 + Vite 5 + Effector 23 + Dockview 5 + xterm 6.
- `plugins/example/` — референс-плагин на Go, демонстрация JSON-line протокола.
- `internal/ids/` — генератор ID/токенов на `crypto/rand`.
- `docs/` — 175 файлов документации (включая 21 ADR), `frontend/docs/` — отдельный набор UI-документов.
- `scripts/` — обвязка (build-core, tauri-dev, guard для импортов).

Сборка: `Makefile` (build/run/validate/cross-compile) и npm-скрипты (`tauri:dev`, `tauri:build`, `validate`).

Положительное наблюдение: репозиторий выровнен по стандартному Go-layout (`cmd/`, `internal/`, `core/`), отделяет presentation (`frontend/`, `apps/desktop/`) от ядра, и оставляет место для плагинной экосистемы. Это хороший фундамент.

---

## 3. Архитектура

### 3.1 Go-ядро

`core/app/runtime.go` (≈143 строки) реализует «central composition root»: объект `Runtime` композиционно собирает `Workspace`, `Terminals`, `Connections`, `Agent`, `Conversation`, `Execution`, `Policy`, `Audit`, `Plugins`, `MCP`, `Registry`, `Executor`. Это правильный паттерн — все сервисы создаются в одном месте, что облегчает их подмену в тестах и ясность времени жизни зависимостей.

Сильные стороны:

- **Workspace service** (`core/workspace/service.go`, 498 строк) — потокобезопасный (`sync.RWMutex`), работает через snapshot-clone, чёткое разделение операций над табами/виджетами/лейаутами.
- **Terminal service** (`core/terminal/service.go`, 389 строк) — корректно использует `context.Cancel`, wait-горутины, лимит буфера (`maxBufferedChunks = 512`), чтобы изолировать pty-сессию.
- **Policy pipeline** (`core/policy/pipeline.go`) — пять явных стадий (`capability`, `allowedRoots`, `ignoreRules`, `trustedRules`, `approval`), каждая может остановить пайплайн. Декомпозиция зафиксирована ADR 0015, что показывает осознанный архитектурный шаг.
- **Plugin runtime** (`core/plugins/runtime.go`, 496 строк) — отдельные тайм-ауты на launch/handshake/invoke/teardown, лимит сообщения 1 МБ (`maxProtocolMessageBytes`), kill-and-wait при сбоях. Протокол вынесен (`core/plugins/protocol.go`, версия `rterm.plugin.v1`).
- **Tool runtime** (`core/toolruntime/executor.go`) — оркестрация approval-state-machine, mismatch-детекция, аудит на success/failure с rich-метаданными.
- **Defaults безопасности** в `core/policy/store.go`: ignore-список (`.env`, `.env.*`, `secrets.*`, `*.pem`, `*.key`, `*.p12`, `id_rsa`, `id_ed25519`), файлы с правами `0o600`. Хорошо.

Замечания:

- `module github.com/Mesteriis/rune-terminal` (см. `go.mod`) — модуль называется **rune**, а проект — **runa**. Это явная опечатка в module path; импорты, документация, тулинг будут долго отлавливать её при переименовании. Рекомендуется привести к одному имени.
- Единственная сторонняя зависимость — `github.com/creack/pty/v2 v2.0.1`. Это аккуратно (минимум attack surface), но также сигнал, что `agent`/`conversation`/`mcp` пока не интегрируют реальные SDK провайдеров — стоит уточнить ожидания.
- `core/policy/pipeline.go` (38 строк) и сопутствующие стадии стоит дополнить тестами на каждое раннее завершение пайплайна — стопы по `capability` и `allowedRoots` критичны для безопасности.
- В нескольких сервисах (`workspace`, `terminal`, `plugins`) видна повторяющаяся логика «снапшот + клон + сравнение». Можно выделить общий generic-helper `cloneSnapshot[T]`, чтобы не плодить ручные дубликаты.

### 3.2 Tauri-оболочка

`apps/desktop/src-tauri/src/main.rs` (176 строк) — компактный shell:

- Спаунит Go-сайдкар.
- Генерирует 40-символьный токен (`rand::distr::Alphanumeric`) и пробрасывает через `RTERM_AUTH_TOKEN`.
- Пишет `runtime-ready.json` с адресом, чтобы Tauri знал, куда подключаться.
- 10-секундный ready-timeout.
- Единственная команда `runtime_info`.

Это чисто и сфокусированно. Плюс: ядро не зависит от Tauri и наоборот — границы соблюдены.

Замечания:

- В `tauri.conf.json` `"csp": null` — отключённый CSP в проде даст широкий script-injection surface, особенно при наличии плагинов. Рекомендуется сразу заложить хотя бы default-src 'self' с явным whitelist'ом, иначе позже это будет тяжело внедрить.
- Auth-токен передаётся через переменную окружения — норм для desktop-сценария, но стоит явно описать в ADR требование, чтобы он никогда не уходил в `process.env` рендерера.
- Ready-timeout в 10 секунд — стоит вынести в конфиг (cold-start на медленных машинах легко перешагнёт его на debug-сборке).

### 3.3 React-фронтенд

`frontend/` придерживается слоистой архитектуры (см. `frontend/docs/ui-architecture.md`): `tokens → styles → primitives → components → widgets → layouts → app`. Список примитивов лаконичный: `Box`, `Badge`, `Button`, `Checkbox`, `Input`, `Label`, `Radio`, `ScrollArea`, `Select`, `Separator`, `Surface`, `TerminalViewport`, `Text`, `TextArea`. Эта дисциплина — сильная сторона: при росте проекта она удержит UI от размывания.

Точка сборки `frontend/src/app/App.tsx` (724 строки):

- Владеет Dockview API, шириной AI-сайдбара, табами рабочих пространств.
- Сохраняет лейаут в `localStorage` (`runa-terminal:dockview-workspaces:v1`).
- Resize-хэндл реализован вручную через `pointermove` (нормально).
- Использует Effector-сторы (`$isAiSidebarOpen`, `toggleAiSidebar`).

Серьёзная архитектурная проблема: **во всём `frontend/src/` нет ни одного `fetch`, `EventSource`, `WebSocket`, `invoke('…')`** (проверено `grep -rE`). Это значит, что:

1. Заявление README о «launchable Tauri shell with Go sidecar runtime driving the UI» в текущем коде **не подтверждается**.
2. `commander-widget.tsx` (963 строки) и `features/commander/model/store.ts` (1798 строк) + `fake-client.ts` (1286 строк) — это автономный mock без выхода в backend.
3. Терминал (`widgets/terminal-panel.ts`) содержит хардкод-демо: `cwd: '~/projects/runa-terminal'`, intro-строка `"renderer preview: xterm surface is mounted locally"` — то есть реального стрима из `core/terminal` пока нет.

Это не архитектурный изъян ядра, но это огромный gap между заявленной и фактической готовностью. ADR 0012 описывает HTTP/SSE контракт; в коде фронтенда он не реализован.

Замечания по коду фронтенда:

- `commander-widget.tsx` (963), `store.ts` (1798), `fake-client.ts` (1286), `App.tsx` (724) — чрезмерно крупные модули. AGENTS.md явно предупреждает следить за такими файлами. Здесь явно напрашивается декомпозиция: отделить view/keyboard/selection/clipboard/rename-mode в отдельные модули, fake-client целиком переехать в `__mocks__/` и подключаться через DI/feature-flag.
- В `frontend/package.json` lint-скрипты `lint:active` и `lint:all` оба сводятся к `tsc --noEmit` — линтер по сути отсутствует. Ни ESLint, ни Biome, ни Stylelint. Это немедленно стоит подключить (Biome — самый дешёвый вход).
- `package.json` (root) пинит `"typescript": "^6.0.2"` — на момент cutoff такой версии не существует. Это либо preview, либо опечатка. Внутри `frontend/package.json` стоит `"typescript": "^5.6.3"`. Несогласованность пинов сломается на свежем `npm install`.

### 3.4 Плагины

`plugins/example/plugin.go` (116 строк) — компактный референс на Go, реализующий handshake/request/response, тулчейн `plugin.example_echo`. Это даёт авторам плагинов конкретный пример, но язык бэкенда «зашит» под Go. Для заявленной плагинной экосистемы стоит:

- Опубликовать пример на другом языке (Python/Node) — это докажет, что протокол действительно язык-нейтральный.
- Зафиксировать совместимость версий протокола (`rterm.plugin.v1`) и стратегию деградации.
- Описать sandbox/permissions модель: сейчас плагин получает stdio и доверие, явных capability checks на стороне core не видно (есть policy pipeline, но связка «плагин → policy» в коде не очевидна).

---

## 4. Качество кода

### Backend (Go)

- Стиль идиоматичный, маленькие компактные пакеты, явные интерфейсы, контексты пробрасываются.
- Mutex'ы аккуратные, snapshot-pattern везде, что снижает шанс races.
- Тайм-ауты, лимиты буфера, kill-and-wait — следы зрелого мышления о failure modes.
- Generic-хелперы вроде `DecodeJSON[T]` в `core/toolruntime/types.go` — приятно.
- Видна дисциплина именования error codes и tier-моделей approval.

Что можно улучшить:

- Тесты — в репозитории есть `*_test.go`, но без CI трудно понять покрытие. Стоит добавить `go test ./... -coverprofile=…` в `make validate` и публиковать отчёт.
- Несколько крупных файлов (`window_layout.go` ≈ 662 строки, `workspace_actions.go` ≈ 512) — кандидаты на дробление по операциям.
- Стоит добавить `golangci-lint` (или хотя бы `go vet` + `staticcheck`) в Makefile/CI.

### Frontend (TypeScript/React)

- Эффектор используется по делу (state со side-effects в одном месте).
- Слоистая архитектура реально соблюдена — это редкость и большой плюс.
- Коммандер-widget хорошо инкапсулирован визуально, но переплетён с Effector-store без чёткой границы «view vs domain».
- Отсутствие линтера и тестов фронтенда — главный пробел качества.
- Нет E2E (Playwright/Tauri-driver) и нет storybook/visual-regression для примитивов.

Замечания:

- `main.tsx` глобально отключает зум страницы через `wheel`/`keydown` — может ломать accessibility, особенно для пользователей с увеличенными шрифтами. Лучше скоупировать на конкретные виджеты.
- LocalStorage-ключ `runa-terminal:dockview-workspaces:v1` — версионирование заложено, хорошо. Стоит описать миграции.

### Rust (Tauri)

- Мало кода, легко читается, явные ошибки, корректное ожидание готовности sidecar'а.
- Не хватает unit-теста на парсинг `runtime-ready.json` и graceful-shutdown sidecar'а при закрытии окна (нужно убедиться, что Go-процесс не остаётся «висеть»).

---

## 5. Дизайн системы

### 5.1 Контракт «фронт ↔ ядро»

ADR 0012 декларирует HTTP/JSON + SSE как транспорт. В backend это реализовано (`core/transport/httpapi/api.go`, ≈84 строки, 50+ маршрутов на Go 1.22 mux-синтаксисе; `middleware.go` с CORS и auth). В frontend — пока не используется. Это нарушение ADR-контракта — UI «ушёл вперёд» в стиле, но ещё не подключился.

CORS в `middleware.go` пускает `tauri://localhost`, `localhost`, `127.0.0.1`, `::1`, `tauri.localhost`. Для desktop-сценария это адекватно, но в момент, когда появятся web-режим/remote-SSH, нужно явно ужесточать. SSE для terminal-стрима принимает токен из query (ADR 0018 фиксирует это как осознанный trade-off MVP) — допустимо, но нужно описать миграцию на Bearer/header.

### 5.2 Policy и safety

Policy pipeline + ignore-defaults + 0o600 файлы конфигов + audit-logger дают серьёзную модель безопасности «из коробки». Это лучше, чем у большинства open-source терминалов. Узкие места:

- `tauri.conf.json` `"csp": null` (см. выше) ослабляет всю модель.
- В Tauri shell отсутствует явный allowlist на команды (один `runtime_info`, остальное — http к sidecar). Это нормально, но нужно зафиксировать в SECURITY.md.
- Не виден rate-limiting на http-API — для desktop важен меньше, но при добавлении remote-SSH (ADR 0019) станет критичным.

### 5.3 Плагинный протокол

`rterm.plugin.v1` — JSON-line stdio, handshake/request/response, отдельные тайм-ауты на этапы. Это здравый выбор: легко портируется, легко санитизируется. Не хватает:

- Версионирования сообщений (forward-compat), а не только версии протокола.
- Capability declaration в handshake (плагин должен явно говорить, какие ресурсы хочет).
- Описания sandbox-стратегии (например, отдельный uid/cwd, network policy).

### 5.4 Дизайн UI

`frontend/docs/ui-architecture.md` описывает строгие правила: «commander operations stay entirely inside the local fake client and a single widget instance», слои tokens→styles→primitives→…

Положительное:

- Список примитивов компактный и осознанный.
- Dockview как панельная система — современный выбор.
- Terminal viewport как отдельный примитив — даёт переиспользуемость.
- Типизация состояния коммандера (`commander/model/types.ts`) подробная: `CommanderPaneRuntimeState`, `CommanderWidgetPersistedState`, `CommanderRenamePreviewItem` и т.д. Видно зрелое моделирование domain-объектов.

Что можно улучшить:

- Нет дизайн-токенов в виде дискретного источника (например, `tokens/colors.css`/`tokens/spacing.ts`) — стоит прояснить, где живёт «правда» о токенах.
- Документация о том, как primitives собираются в widgets, есть, но нет storybook/viewer'а.
- Доступность (a11y) явно нигде не описана. Для терминала и файлового менеджера это критично (фокус-менеджмент, ARIA, screen-reader).

---

## 6. Документация

В `docs/` 175 файлов; `docs/_meta/docs-inventory.md` сам признаётся: 74 ACTIVE, 78 DUPLICATE, 2 OUTDATED, 1 UNCLEAR. Это серьёзный документационный долг.

Дополнительные находки:

- В `docs/architecture/adr/` два файла с номером **0020**: `0020-ai-conversation-backend-foundation.md` и `0020-ai-terminal-command-execution-path.md`. Один из них нужно перенумеровать.
- `docs/workflow/roadmap.md` ссылается на пути `frontend/app/workspace/workspace.tsx`, `frontend/app/tab/tabbar.tsx`, `frontend/rterm-api/…` — этих директорий **в текущем коде нет**. Roadmap описывает структуру, которой больше нет.
- `AGENTS.md` тоже перечисляет несуществующие watch-files (`frontend/app/workspace/workspace.tsx` и т.п.). Документ устарел и вводит в заблуждение нового агента/контрибьютора.
- `scripts/check-active-path-api-imports.sh` сторожит импорты по тем же мёртвым путям — guard сам по себе мёртвый.
- README в целом качественный (≈395 строк, разделы Lineage, Design Principles, Layout, Prerequisites, Dev Commands), но утверждение про «driving the UI» опережает реальность кода.

Положительное:

- 21 ADR (с двумя дублями номера) — большая база архитектурных решений, что само по себе ценно.
- `docs/workflow/known-limitations.md` честно перечисляет gap'ы (builder parity, proxy, preview zoo, code editor, streaming AI, broad plugin ecosystem) — это хорошая инженерная честность.

---

## 7. Инфраструктура и тулинг

- **CI отсутствует**: `.github/` нет в репозитории. Это удивительно для проекта такого масштаба и влияет на всё остальное (нельзя гарантировать прохождение `make validate` на PR, нет автоматических secret-scans).
- **`Makefile`** покрывает основные действия (run/build/validate/cross-compile), но не хватает `test-coverage`, `lint`, `release-notes`.
- **`package.json` validate** = lint:frontend (= tsc) + build:frontend + test:go + build:go + tauri:check. Хорошая идея single-entry, но без CI она не enforced.
- **Имена пакетов**: `rterm` (root npm), `runa-terminal-frontend` (frontend), `RunaTerminal` (productName), `dev.runa.rterm` (Tauri identifier), `github.com/Mesteriis/rune-terminal` (Go module). Пять разных написаний, минимум одно (`rune`) — опечатка. Это отдельный source of confusion.
- **`tmp/`** в корне — желательно либо `.gitignore`, либо вынести во временные пути.
- **`node_modules`** в корне зафиксирован в дереве — вероятно, лежит в `.gitignore`, но стоит проверить, что в репозитории нет случайных артефактов (`tmp/`, `dist/`).
- **Lockfile-дисциплина**: есть `package-lock.json` в корне; нужен ли отдельный lockfile для `frontend/`? — стоит явно зафиксировать в DEVELOPMENT.md.

---

## 8. Критические наблюдения (короткий список приоритетов)

В порядке убывания важности:

1. **Фронтенд не подключён к ядру.** UI работает на mock-данных, реализация HTTP/SSE-контракта (ADR 0012) на стороне фронта отсутствует. Это главный gap между обещаниями README и фактом.
2. **CI отсутствует.** Без `.github/workflows/` любой `make validate` — добровольный. Нужно завести минимальный pipeline (Go test, tsc, tauri:check, secret-scan).
3. **Документация рассинхронизирована с кодом.** Roadmap, AGENTS.md, guard-скрипты ссылаются на несуществующие пути; 78/175 doc-файлов помечены как DUPLICATE; два ADR с номером 0020.
4. **Несогласованные имена пакетов** (`rterm` / `RunaTerminal` / `runa-terminal-frontend` / `dev.runa.rterm` / `Mesteriis/rune-terminal`) и опечатка `rune` в Go module path.
5. **`tauri.conf.json` `"csp": null`** — отсутствие CSP в desktop-shell с плагинной системой — серьёзный риск.
6. **TS-версии**: root pinит `^6.0.2` (несуществующая на cutoff), frontend — `^5.6.3`. Сборка может ломаться на свежем install.
7. **Огромные модули фронтенда**: `store.ts` 1798, `fake-client.ts` 1286, `commander-widget.tsx` 963, `App.tsx` 724. Нужна декомпозиция, иначе maintainability будет деградировать.
8. **Линтер фронтенда отсутствует**: `lint:active`/`lint:all` сводятся к `tsc --noEmit`. Нужен ESLint/Biome.
9. **Плагины**: язык-нейтральность объявлена, но пример только на Go; capability/sandbox-модель не описана.
10. **Доступность (a11y) и i18n** не упомянуты ни в коде, ни в дизайн-документах.

---

## 9. Что сделано хорошо (короткий список сильных сторон)

- Чистая, дисциплинированная архитектура Go-ядра: маленькие пакеты, явные интерфейсы, snapshot-pattern, корректные тайм-ауты.
- Сильная модель безопасности (policy pipeline, ignore defaults, 0o600 конфиги, audit-logger).
- Серьёзный плагинный протокол с лимитами, тайм-аутами и kill-and-wait.
- Tauri-shell минимален и сфокусирован — границы слоёв соблюдены.
- Frontend дисциплинированно следует слоистой UI-архитектуре с явным списком примитивов.
- 21 ADR — реальная архитектурная дисциплина, фиксирующая trade-offs (`0015` декомпозиция policy, `0018` SSE query-token MVP, `0019` remote-SSH foundation).
- Honest gap list в `known-limitations.md` — инженерная зрелость.
- Подробная типизация фронтенд-моделей (например, `CommanderRenamePreviewItem`, `CommanderPendingOperation`) показывает зрелое domain-modelling.

---

## 10. Рекомендации (без правок, по уровню приоритета)

### P0 — делать в первую очередь

- Зафиксировать единое имя проекта и привести к нему все артефакты (`go.mod`, `package.json`, `productName`, Tauri identifier, README).
- Завести CI (GitHub Actions): `make validate` + `go test ./... -race -coverprofile`, `tsc --noEmit`, `tauri build --debug` smoke, secret-scan.
- Реализовать на фронте реальный клиент к `core/transport/httpapi` (хотя бы `workspace`/`terminal stream`) и убрать «fake» из горячего пути.
- Включить CSP в Tauri (даже слабый default лучше `null`).

### P1 — следом

- Перенумеровать дублирующийся ADR 0020.
- Прогнать `docs-inventory.md` и удалить/смержить 78 DUPLICATE.
- Обновить `AGENTS.md`, `docs/workflow/roadmap.md`, `scripts/check-active-path-api-imports.sh` под актуальную структуру `frontend/src/`.
- Привести TS-версии к одной (`5.6.x` в обоих package.json).
- Добавить ESLint/Biome во фронтенд.

### P2 — стратегические

- Декомпозировать `commander-widget.tsx`, `store.ts`, `fake-client.ts` — выделить view/keyboard/selection/clipboard/rename-modes в отдельные модули, fake-client спрятать за интерфейсом.
- Добавить storybook/viewer для primitives и a11y-чеклист.
- Опубликовать пример плагина не на Go (Python/Node), задокументировать sandbox/capabilities.
- Описать стратегию миграции localStorage-схем (`runa-terminal:dockview-workspaces:v1` → vN).
- Добавить unit-тест/CI-проверку graceful shutdown sidecar'а из Tauri.
- Покрыть policy pipeline таблицами тестов (по одной на стадию ранней остановки).

---

## 11. Итог

`runa-terminal` уверенно выглядит на уровне ядра, дизайна модели безопасности и плагинного протокола — это самые сильные части проекта. Его слабое место — стык: фронтенд пока не разговаривает с ядром, документация описывает другую структуру, а инфраструктура (CI, линтеры, согласованные имена) недоинвестирована. Это решаемые проблемы, но именно они отделяют проект от состояния «работающий продукт» и создают впечатление «всё ещё прототип в дорогой обёртке».

Если приоритезировать: **(1) подключить фронтенд к ядру**, **(2) завести CI**, **(3) синхронизировать документы и имена**, **(4) добавить CSP и линтеры** — после этих четырёх шагов проект начнёт читаться как серьёзный кандидат на «modern Total Commander + Terminal + AI», а не как набор отдельных слоёв.
