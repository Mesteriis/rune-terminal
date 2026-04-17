# widgets.tsx Structural Slice Baseline

Дата фиксации: `2026-04-16`

## Текущие ответственности внутри `frontend/app/workspace/widgets.tsx`

- доменные helper-функции для widget rail:
  - сортировка widgets
  - вычисление compact/supercompact режима
  - нормализация apps/tool/audit payload helper logic
  - построение tool execution context
- локальный presentational widget item renderer (`Widget`)
- четыре floating utility surface в одном файле:
  - `AppsFloatingWindow`
  - `SettingsFloatingWindow`
  - `ToolsFloatingWindow`
  - `AuditFloatingWindow`
- orchestration правого rail:
  - refs для anchor elements
  - open/close state для floating panels
  - `auditRefreshNonce`
  - layout mode selection
  - render normal/supercompact branches
  - hidden measurement branch для вычисления режима

## Предлагаемые группы extraction

### 1. Чистые helpers / types

- сортировка и normalization helpers
- JSON / timestamp formatting helpers
- tool execution context helpers
- локальные prop/type aliases для extracted components

### 2. Small presentational components

- `Widget` item renderer
- при необходимости маленькие rail action item components, если extraction не меняет tree behavior

### 3. Utility panel render branches

- отдельный файл для floating panels, потому что это самый крупный смешанный блок внутри `widgets.tsx`
- shared props должны оставаться явными, без нового global state

### 4. Что должно остаться в `widgets.tsx`

- top-level `Widgets` composition entry
- локальный rail state:
  - `mode`
  - panel open/close state
  - anchor refs
  - `auditRefreshNonce`
- layout mode orchestration и measurement wiring
- wiring между active rail buttons и extracted panels

## Safe-first extraction order

1. helper functions и локальные type aliases
2. `Widget` item renderer
3. floating utility panels
4. финальное сжатие `widgets.tsx` до orchestrator/composition роли

## Явные non-goals

- без redesign
- без behavior change
- без store rewrite
- без изменения tools/audit/terminal flows
- без изменения visual structure правого rail
