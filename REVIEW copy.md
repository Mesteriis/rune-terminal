🔍 Детальное ревью фронтенда rune-terminal
📊 Общая статистика
Метрика	Значение
Всего .tsx/.ts файлов	~70
Всего строк кода (top-7 файлов)	7 881
Файлов > 1000 строк	3 (❌ монолиты)
CSS файлов	2
ESLint/Prettier	отсутствуют (❌)
Тесты	ноль (❌)
JSDoc покрытие	~0% (❌)
🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ
1. Гигантские монолитные файлы
Файл	Строк	Рекомендуемый лимит
features/commander/model/store.ts	2 187	300–400
widgets/commander/commander-widget.tsx	1 813	300–400
features/commander/model/fake-client.ts	1 448	300–400
widgets/commander/commander-widget.styles.ts	847	300–400
app/App.tsx	725	200–300
Проблема: Невозможно ревьюить, тестировать, поддерживать. Один PR в commander-widget.tsx = merge conflict для всей команды.

Рекомендация:

store.ts → разбить на: store-navigation.ts, store-selection.ts, store-operations.ts, store-persistence.ts
commander-widget.tsx → извлечь: CommanderPane, CommanderFileDialog, CommanderPendingBar, CommanderRenamePreview, CommanderHeaderRow, CommanderPathEditor
fake-client.ts → извлечь: fake-directory-ops.ts, fake-file-ops.ts, fake-rename-ops.ts
App.tsx → извлечь: WorkspaceManager, AiPanelController, DockviewShell
2. Полное отсутствие тестов
Во всём frontend нет ни одного .test.ts / .test.tsx файла. При этом tsconfig.app.json уже исключает тест-файлы из компиляции (exclude: ["src/**/*.test.ts"]), что говорит о том, что тесты планировались, но не были написаны.

Рекомендация:

Добавить Vitest + React Testing Library
Покрыть unit-тестами: fake-client.ts (чистая логика), persistence.ts (сериализация), types.ts (type guards)
Покрыть компонентными тестами: все примитивы, критичные компоненты (DialogPopup, Tabs, SearchableMultiSelect)
3. Отсутствие линтера и форматтера
В package.json нет eslint, prettier, stylelint. Нет .eslintrc, .prettierrc.

Рекомендация: Добавить:

eslint + eslint-plugin-react-hooks + eslint-plugin-import
prettier для единообразного форматирования
Pre-commit hook через lint-staged + husky
4. Нарушение архитектурных слоёв (Layer Violations)
Документ ui-architecture.md декларирует строгое направление зависимостей:

Code
tokens → styles → primitives → components → widgets → layouts → app
Найденные нарушения:

Нарушение	Файл	Проблема
Widget → Layout	widgets/panel/dockview-panel-widget.tsx	Импортирует CommanderDemoLayout (layout layer)
Widget → Layout	widgets/shell/right-action-rail-widget.tsx	Импортирует CommanderDemoLayout
Component → Raw HTML	shared/ui/components/avatar.tsx:46	Использует <img> вместо примитива
Widget → Raw HTML	widgets/commander/commander-widget.tsx:225-260	CommanderPlainButton / CommanderPlainBox — заново создают <button> и <div> вместо использования примитивов Button и Box
Widget → Raw HTML	widgets/panel/widget-busy-overlay-widget.tsx:376-567	Сырой SVG и <div> без абстракции
Почему это критично: Дублирование семантики DOM Identity (data-runa-*) вручную в каждом месте вместо использования примитивов. Любое изменение в примитивах не дойдёт до этих мест.

🟠 ВЫСОКИЕ ПРОБЛЕМЫ
5. Массовые inline-стили вместо style-модулей
Практически все виджеты и компоненты содержат десятки inline CSSProperties объектов прямо в теле компонентов:

Файл	Строк стилей в компоненте
shell-topbar-widget.tsx	~80 строк стилей
right-action-rail-widget.tsx	~92 строки
modal-host-widget.tsx	~43 строки
widget-busy-overlay-widget.tsx	~94 строки
dialog-popup.tsx	~90 строк
terminal-status-header.tsx	~90 строк
terminal-toolbar.tsx	~82 строки
Проблема:

Стили воссоздаются на каждом рендере (нет useMemo)
Снижается читаемость компонентов
Нарушается принцип разделения логики и представления
Архитектура декларирует отдельный styles слой, но только commander-widget и ai-panel-widget его используют
Рекомендация: Каждый виджет/компонент с >10 строк стилей должен выносить их в *.styles.ts.

6. Хардкод цветов (RGBA/HEX вместо токенов)
При наличии токен-системы в tokens/index.css, множество файлов содержат хардкод:

Code
ai-panel-widget.styles.ts:41  → rgba(15, 31, 28, 0.98)
ai-panel-widget.styles.ts:105 → rgba(14, 28, 25, 0.92)
ai-panel-widget.styles.ts:266 → rgba(45, 143, 118, 0.12)
ai-panel-widget.styles.ts:286 → rgba(224, 197, 124, 0.14)
commander-widget.tsx:450-471   → 4+ RGBA значений в getRenamePreviewStatusStyle()
shell-topbar-widget.tsx:69     → rgba(56, 92, 82, 0.78)
shell-topbar-widget.tsx:71-72  → rgba(132, 198, 178, ...)
widget-busy-overlay-widget.tsx → rgba(5, 14, 12, 0.5), #06110f
index.css:27                   → rgba(130, 188, 170, 0.12)
index.css:184-186              → hardcoded hex
Насчитано 30+ хардкод-значений цветов. Каждое — потенциальная проблема при смене темы.

Рекомендация: Все цвета → CSS custom properties в tokens/index.css.

7. Несогласованный forwardRef в примитивах
Компонент	forwardRef	displayName
Box	✅	✅
Input	✅	✅
ScrollArea	✅	✅
Surface	✅	✅
TerminalViewport	✅	✅
Button	❌	❌
Badge	❌	❌
Text	❌	❌
Label	❌	❌
Checkbox	❌	❌
Radio	❌	❌
Select	❌	❌
Textarea	❌	❌
Separator	❌	❌
9 из 14 примитивов не поддерживают forwardRef. Это блокирует:

Фокус-менеджмент из родительского компонента
Интеграцию с form-библиотеками
Тестирование через ref
Также import type * as React в файлах без forwardRef — несогласованность: файлы с forwardRef используют import * as React (runtime import), остальные — import type * as React.

8. Нарушение DRY в примитивах
Все форм-примитивы (Button, Checkbox, Input, Radio, Select, Textarea) содержат идентичную логику вывода семантического имени:

TSX
const semanticComponent =
  runaComponent ??
  (typeof props['aria-label'] === 'string' && props['aria-label'].trim() !== ''
    ? props['aria-label']
    : props.name ?? props.placeholder ?? `${scope.component}-input`)
Эта логика 6 раз скопирована с минимальными вариациями.

Рекомендация: Извлечь в getSemanticComponentName(props, scope, fallbackSuffix).

9. DRY-нарушение в компонентах: "reset box" стиль
Компоненты DialogPopup, Notify, SwitcherGroup, RadioGroup, SwitcherControl, RadioControl, TerminalToolbar — все содержат идентичный блок "reset" стилей:

TSX
padding: 0,
border: 'none',
borderRadius: 0,
background: 'transparent',
boxShadow: 'none',
backdropFilter: 'none',
WebkitBackdropFilter: 'none',
Рекомендация: Создать общий resetBoxStyle в tokens/styles и реиспользовать.

10. App.tsx — слишком много ответственности
App.tsx (725 строк) совмещает:

Управление Dockview (workspace tabs, panels, API)
Анимация AI-панели (resize, motion)
Управление рабочими пространствами (localStorage persistence)
Управление фокусом виджетов
Стили (14+ inline style-объектов)
Обработчики событий (8+ useEffect цепочек)
Привязка Shell виджетов
Рекомендация: Декомпозировать на:

useDockviewWorkspace() — хук управления workspace
useAiPanelResize() — хук анимации/resize AI-панели
DockviewShell — компонент, рендерящий Dockview
AppShell — верхнеуровневый layout без бизнес-логики
🟡 СРЕДНИЕ ПРОБЛЕМЫ
11. Effector anti-patterns в store.ts
Проблема 1: Persistence через .watch() + mutable setTimeout:

ts
// store.ts:2157-2187
let persistCommanderWidgetsTimeout: ReturnType<typeof setTimeout> | null = null
let hasInitializedCommanderPersistence = false
$commanderWidgets.watch((widgets) => { ... })
Мутабельные переменные уровня модуля вне Effector = утечки при тестировании, невозможность изоляции.

Правильно: использовать sample() + debounce() из patronum, или Effect для сайд-эффектов.

Проблема 2: Монолитный store $commanderWidgets на все виджеты сразу. Каждый .on() повторяет паттерн:

ts
.on(someEvent, (widgets, payload) => {
  const widgetState = widgets[payload.widgetId]
  if (!widgetState) return widgets
  // ... мутация
  return { ...widgets, [payload.widgetId]: { ...widgetState, ... } }
})
Этот паттерн повторяется 40+ раз с минимальными вариациями.

Рекомендация: Создать withWidgetState(handler) — generic wrapper, который извлекает widgetState и возвращает обновлённый объект.

12. Отсутствие Accessibility
Проблема	Файл
Нет @media (prefers-reduced-motion)	index.css (анимации без альтернативы)
Нет @media (prefers-contrast)	index.css
main.tsx блокирует zoom (Ctrl+Plus/Minus)	main.tsx:52 — нарушение WCAG 2.1
autoFocus без управления	terminal-toolbar.tsx:138
Неверные ARIA-атрибуты	searchable-multi-select.tsx:83 (aria-multiselectable)
aria-pressed вместо aria-selected	searchable-multi-select.tsx:89
Неверное размещение role="radiogroup"	radio-group.tsx:80-81
13. Keyboard handler — 370-строчный монолит
features/commander/model/keyboard.ts — один useCallback на 370 строк, содержащий 3 вложенных switch и множество if/else.

Рекомендация: Разбить на:

handleFileDialogKeys()
handlePendingOperationKeys()
handleNavigationKeys()
handleModifierKeys()
handleTypeahead()
Создать keyboard shortcut registry (map key → handler) вместо императивного ветвления.

14. fake-client.ts — глобальный мутабельный Map
ts
// fake-client.ts:40
const clients = new Map<string, CommanderClientState>()
Глобальное мутабельное состояние уровня модуля:

Невозможно тестировать параллельно
Нет функции reset/cleanup
Утекает при hot-reload
Рекомендация: Перенести в Effector store или передавать через DI/Context.

15. Утечки памяти в main.tsx
TSX
document.addEventListener('wheel', disableWheel, { passive: false })
window.addEventListener('keydown', disablePinchKeys)
Listener-ы на window / document никогда не убираются. При hot-reload — множественные подписки.

16. DOM-запросы из виджетов
Файл	Строка	Запрос
terminal-surface.tsx	420	document.querySelector('.dv-groupview')
widget-busy-overlay-widget.tsx	134-147	document.querySelector()
modal-host-widget.tsx	65	document.querySelector()
Виджеты не должны знать о DOM-структуре снаружи себя. Это жёсткая привязка к Dockview internals.

Рекомендация: Передавать mount-nodes через props/context.

17. Props drilling в CommanderPane
CommanderPane (внутренний компонент commander-widget.tsx) принимает 23+ пропса. Это классический анти-паттерн.

Рекомендация: Группировать в конфигурационные объекты или использовать Context.

18. persistence.ts — ручная валидация вместо schema
ts
// persistence.ts:24-96 — ручная валидация каждого поля
if (typeof raw.cursorIndex !== 'number') ...
if (typeof raw.path !== 'string') ...
Рекомендация: Использовать zod для schema validation. Это:

Типобезопасно
Самодокументируемо
Автоматически синхронизируется с типами
19. types.ts — широкий union вместо discriminated
ts
type CommanderPendingOperation = {
  kind: CommanderPendingOperationKind
  sourcePaneId?: string
  entries?: CommanderFileRow[]
  conflictEntryNames?: string[]
  renameTemplate?: string
  // ... ещё 8 опциональных полей
}
Позволяет невалидные комбинации (например, kind: 'delete' + renameTemplate).

Рекомендация: Discriminated union:

ts
type CommanderPendingOperation =
  | { kind: 'delete'; entries: CommanderFileRow[] }
  | { kind: 'rename'; entry: CommanderFileRow; renameTemplate: string }
  | { kind: 'copy'; entries: CommanderFileRow[]; conflictEntryNames?: string[] }
  // ...
🟢 НИЗКИЕ ПРОБЛЕМЫ (стиль и чистота)
20. Отсутствие JSDoc
Ни один экспортируемый компонент, хук или утилита не имеют JSDoc. Для проекта с >70 файлов и активной разработкой — это серьёзный долг.

21. Нет responsive-токенов
tokens/index.css определяет фиксированные значения без @media-альтернатив. Z-index система неполна (только 3 значения).

22. Мёртвый код
terminal-status-header.tsx:200-201 — const iconSize = compact ? 14 : 14 → оба варианта одинаковы
fake-client.ts:209-211 — splitEntryName() просто возвращает input
23. !important в CSS
index.css содержит 12+ правил с !important (строки 317, 336, 340-346, 351, 355-364). Это индикатор войны специфичности с Dockview-стилями. Лучше: создать более специфичные селекторы или использовать CSS layers.

24. Нет @media print и prefers-color-scheme
25. data-runa-* атрибуты на каждом элементе
Каждый примитив добавляет 4 data-* атрибута к DOM. В списках из 100+ элементов это ощутимый DOM-оверхед. Стоит сделать опциональным.

📋 Сводная таблица
Категория	Критичных	Высоких	Средних	Низких
Архитектура (монолиты, слои)	5	3	2	0
Стили (inline, хардкод)	1	2	3	2
Компоненты (forwardRef, DRY)	1	3	2	1
State management (Effector)	1	2	1	0
Accessibility	0	1	5	2
Тесты и тулинг	2	1	0	0
Типизация	0	1	2	1
DOM / производительность	0	2	3	2
Итого	10	15	18	8
🗺️ Приоритетный план исправлений
Фаза 1 — Тулинг и гигиена (1-2 дня)
Добавить ESLint + Prettier + lint-staged
Добавить Vitest, написать первые тесты для fake-client.ts и persistence.ts
Убрать мёртвый код
Фаза 2 — Архитектура (3-5 дней)
Разбить store.ts на 4-5 модулей
Разбить commander-widget.tsx на 6+ компонентов
Разбить fake-client.ts на 3 модуля
Декомпозировать App.tsx на хуки + подкомпоненты
Исправить layer violations (widget → layout)
Фаза 3 — Стили и токены (2-3 дня)
Вынести inline-стили в *.styles.ts для всех виджетов
Заменить все хардкод-цвета на CSS custom properties
Создать resetBoxStyle общий utility
Убрать !important из index.css
Фаза 4 — Компоненты (1-2 дня)
Добавить forwardRef ко всем 9 примитивам
Извлечь getSemanticComponentName() utility
Устранить raw HTML в компонентах (Avatar, CommanderPlainButton/Box)
Исправить CommanderPendingOperation на discriminated union
Фаза 5 — Accessibility и качество (1-2 дня)
Добавить @media (prefers-reduced-motion)
Исправить ARIA-атрибуты
Убрать блокировку zoom
Добавить JSDoc к публичным API
