# Principal Engineer Review — RunaTerminal

**Дата:** 2026-04-16  
**Ревьюер:** Principal Engineer (AI-assisted)  
**Фаза проекта:** `1.0.0-rc1` release hardening  
**Скоуп ревью:** архитектура, кодовая база, процесс, зрелость к релизу

---

## 1. Executive Summary

RunaTerminal — амбициозный clean-room rewrite терминального workspace-приложения (TideTerm/WaveTerminal), перенесённый на стек **Tauri + Go + React/TypeScript**. Проект находится в фазе release hardening для `v1.0.0-rc1`.

**Общая оценка: проект архитектурно здоровый, документация исключительно честная, но до настоящего RC-качества остаётся ощутимый разрыв между backend-ready и frontend-wired состоянием.**

### Сильные стороны
- Чёткое архитектурное разделение (Go core / transport / frontend)
- Security-first design с policy pipeline, approvals, audit — с первого дня
- Исключительно честная документация (known limitations, validation log с `NOT RUN` статусами)
- Хорошее ADR-покрытие (21 ADR)
- Тестовое покрытие в Go core (тесты в каждом модуле)

### Ключевые риски
- Разрыв backend↔frontend: многие backend-ready фичи не wired в active UI
- Legacy frontend residue: ~31K строк TS в active path, включая значительный legacy код
- Validation gap: из ~40 feature entries в roadmap только ~8 имеют `VERIFIED` статус
- Единственная Go-зависимость (`creack/pty`) — плюс для минимализма, но SSE auth через query string — tech debt

---

## 2. Архитектура

### 2.1 Layering — ✅ Отлично

```
Frontend (React+TS) → HTTP/SSE → Go Core → Domain Services
                                     ↕
                              Tauri Shell (Rust, minimal)
```

Чётко выдержан принцип: **Go core owns truth, transport is adapter, Rust is thin shell**. Ни один из слоёв не «протекает» в соседний. Это правильно.

### 2.2 Go Core — ✅ Хорошо

| Модуль | Файлов | Строк | Оценка |
|--------|--------|-------|--------|
| `core/app` | ~15 | 2,583 | Крупнейший модуль, но логически делится на tool_*, workspace_actions, conversation_actions. Пока приемлемо. |
| `core/transport/httpapi` | ~20 | 1,761 | Хорошая декомпозиция handlers по домену. Test coverage видим. |
| `core/terminal` | 9 | 1,277 | Ядро PTY runtime. `service.go` (338 строк) — пограничный размер, но контролируемый. |
| `core/policy` | 10 | 1,228 | Зрелый staged pipeline. Хорошее табличное тестирование. |
| `core/toolruntime` | 9 | 712 | Компактный executor/registry/approval. |
| `core/workspace` | — | — | — |
| `core/connections` | — | — | — |
| `core/conversation` | — | — | — |
| `core/agent` | — | — | — |
| `core/audit` | — | — | — |

**Observation:** Всего 102 Go-файла, ~10.5K строк. Для backend терминального приложения с policy/audit/tools/connections это **компактно и дисциплинированно**. Единственная внешняя зависимость (`creack/pty`) — показатель зрелости решений о границах.

**Concern:** `core/app/tool_workspace.go` (419 строк) растёт. При добавлении новых workspace actions стоит вынести read-only queries в отдельный файл.

### 2.3 Frontend — ⚠️ Требует внимания

| Область | Строк | Observation |
|---------|-------|-------------|
| `frontend/app/aipanel/` | 5,354 | **Самый большой frontend кластер.** `waveai-model.tsx` (702), `aipanel-compat.tsx` (620), `aipanel.tsx` (611) — три файла с пересекающимися обязанностями. |
| `frontend/app/tab/tabbar.tsx` | 832 | Крупный файл. Context menu, drag, rename, pin — всё в одном. Нужна декомпозиция. |
| `frontend/app/workspace/` | 1,356 | Приемлемо. `widgets.tsx` (307) — ранее был крупнее, рефакторинг уже проведён. |
| `frontend/rterm-api/` | — | Чистый API client layer. Правильная абстракция. |

**Concerns:**
1. **`aipanel` кластер** — три варианта (aipanel, aipanel-compat, waveai-model) говорят о незавершённой миграции. Это крупнейший frontend risk для RC.
2. **`tabbar.tsx` (832 строк)** — нарушает shell/hook discipline из AGENTS.md. Рекомендуется split.
3. **Legacy residue** — в репозитории `?312` untracked files (видно из git prompt). Вероятно `tideterm-src/` и legacy views. Это не проблема runtime, но это noise для контрибьюторов.

### 2.4 Security Model — ✅ Отлично

Staged policy pipeline (capability → allowed roots → ignore → trusted → approval) — это **production-grade** подход. Ключевые свойства:
- Approval tokens — одноразовые и не replay-able
- Ignore rules не обходятся trusted rules
- Role/mode overlays реально проецируются в policy
- Audit — first-class citizen, не afterthought

**Единственный concern:** SSE auth через query string (ADR-0018). Документировано как MVP trade-off, но для RC это стоит явно зафиксировать в release notes как known security limitation.

### 2.5 Transport — ✅ Хорошо

- HTTP semantics чистые: `401`, `400`, `403`, `428`, `500` — правильно размеченные
- `428 Precondition Required` для approval — элегантное решение
- SSE для terminal streaming — правильный выбор
- Loopback-only — правильно для десктопного приложения

---

## 3. Процесс и документация

### 3.1 Documentation — ✅✅ Исключительно

Это **лучшая** часть проекта. Документация:
- Честная (не overclaim, `NOT RUN` явно помечен)
- Трёхуровневая (архитектура → behavior → validation)
- Release-ориентированная (parity matrix, release checklist, known limitations)
- 21 ADR покрывают все значимые архитектурные решения

### 3.2 Validation — ⚠️ Главный gap к RC

Из validation.md:

| Статус | Количество feature entries |
|--------|--------------------------|
| `VERIFIED` | ~8 (terminal input, stream, interrupt, tab switch, approval token, tools/audit panels, /run command, conversation) |
| `NOT RUN` | ~32 |

**Это главный blocker для RC.** Многие `IN_PROGRESS` features в roadmap имеют `NOT RUN` validation. Для RC хотя бы P0-features должны пройти валидацию.

### 3.3 Commit Discipline — ✅ Хорошо

Git history показывает small-step discipline: `feat → fix → docs → validation` лестницы. Это правильно для release hardening.

---

## 4. Release Readiness Assessment

### 4.1 P0 Blockers (из parity-matrix.md)

| Blocker | Текущий статус | Моя оценка |
|---------|---------------|------------|
| App shell behavior | `partial` | Функционально — ок, визуально — drift от TideTerm |
| Terminal UX | `partial` | **Strongest area.** Core daily-driver path работает. |
| AI panel | `partial` | Backend wired, но conversation + /run ещё хрупкие |
| Tabs | `partial` | Работают, но UI drift |
| Remote/SSH | `partial` | Один happy path validated. Нужен failure-mode smoke. |
| Approval UX | `partial` | Backend solid, frontend wiring неполный |
| Local runtime | `done` | ✅ |
| Startup/bootstrap | `partial` | Recovery hints добавлены. Нужен final smoke. |

### 4.2 Backend vs Frontend Maturity Gap

Это **главный structural finding** ревью:

```
Backend maturity:  ████████████░░  ~85%
Frontend maturity: ██████░░░░░░░░  ~45%
Docs maturity:     █████████████░  ~95%
```

Go core закрыт по архитектуре и покрытию. Frontend застрял между legacy TideTerm compat layer и новой архитектурой. AI panel — яркий пример: три файла делают похожее, потому что миграция не завершена.

### 4.3 Honest RC Readiness

**Моя оценка: проект не готов к RC1 как daily-driver замена TideTerm.** Но он готов к **RC1 как narrow-scope local terminal + AI `/run` daily-driver**, если:

1. P0 validation gap закрывается (хотя бы build + launch + terminal + /run + tab switch smoke)
2. AI panel migration завершается (убирается compat/legacy split)
3. SSH failure modes получают хотя бы один additional smoke pass

---

## 5. Рекомендации

### 5.1 Немедленные (до RC1)

| # | Рекомендация | Приоритет |
|---|-------------|-----------|
| 1 | **Запустить `npm run validate` и `npm run tauri:dev` + smoke** и записать результат в validation.md | P0 |
| 2 | **Объединить aipanel-compat.tsx и aipanel.tsx** — два пути для одной surface создают regression risk | P0 |
| 3 | **Закрыть NOT RUN валидации для P0 features** — tab create/close, SSH launch, approval in AI flow | P0 |
| 4 | **Добавить SSE auth limitation в release notes** | P0 |

### 5.2 Краткосрочные (RC1 → RC2)

| # | Рекомендация | Приоритет |
|---|-------------|-----------|
| 5 | **Split `tabbar.tsx`** — вынести context menu, drag logic, tab actions в отдельные hooks/компоненты | P1 |
| 6 | **Split `waveai-model.tsx`** — 702 строки для model adapter — это signal что abstraction boundary нечёткий | P1 |
| 7 | **Добавить integration test для /run → explain pipeline** в Go | P1 |
| 8 | **Очистить untracked files** или добавить в .gitignore | P1 |

### 5.3 Среднесрочные (post-1.0)

| # | Рекомендация |
|---|-------------|
| 9 | Заменить SSE query-string auth на scoped stream tickets |
| 10 | Добавить session identity layer отдельный от widget ID |
| 11 | Рассмотреть WebSocket вместо SSE для bidirectional terminal needs |
| 12 | Формализовать frontend state management (сейчас ad-hoc stores) |

---

## 6. Метрики кодовой базы

| Метрика | Значение |
|---------|----------|
| Go core files | 102 |
| Go core lines | ~10,500 |
| Go external deps | 1 (`creack/pty`) |
| Frontend TS/TSX files (active) | 211 |
| Frontend active lines | ~31,200 |
| ADRs | 21 |
| Validated features | ~8 / ~40 |
| Test files (Go) | Присутствуют в каждом core module |
| Tauri/Rust | Minimal (~1 file `main.rs`) |

---

## 7. Заключение

RunaTerminal — **архитектурно сильный проект** с правильными решениями в backend, security model и документации. Главный вызов сейчас — не архитектура, а **завершение frontend миграции и validation coverage**. 

Документация проекта — образцовая для open-source. Честность validation log (`NOT RUN` вместо молчаливого пропуска) — это редкость и ценность.

Для перехода из «хорошо спроектированный backend с frontend в процессе миграции» в «ready-to-ship RC» нужно сфокусироваться на трёх вещах:
1. Frontend convergence (один путь вместо legacy + compat)
2. Validation sweep (превратить `NOT RUN` в `VERIFIED` или `KNOWN GAP`)
3. SSH failure-mode confidence

Архитектурных blocker'ов для релиза нет. Все blockers — operational и execution-level.

