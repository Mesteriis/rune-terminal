# widgets.tsx structural slice result

Дата: `2026-04-16`

## Что было извлечено

- `frontend/app/workspace/widget-types.ts`
  - локальные типы режима рендера, floating window props и pending approval payload
- `frontend/app/workspace/widget-helpers.ts`
  - pure/helpers для сортировки, нормализации app list, JSON formatting и tool context helpers
- `frontend/app/workspace/widget-item.tsx`
  - рендер одного widget item с tooltip и truncated-label логикой
- `frontend/app/workspace/apps-floating-window.tsx`
  - ветка floating window для local apps
- `frontend/app/workspace/settings-floating-window.tsx`
  - ветка floating window для settings/help actions
- `frontend/app/workspace/tools-floating-window.tsx`
  - ветка floating window для tools list / execution / approval UI
- `frontend/app/workspace/audit-floating-window.tsx`
  - ветка floating window для audit entries
- `frontend/app/workspace/widget-action-button.tsx`
  - повторяющийся action-button markup для tools/audit/apps/settings
- `frontend/app/workspace/widgets-measurement.tsx`
  - hidden measurement subtree для mode calculation

## Что осталось в widgets.tsx

- чтение workspace/widget конфигурации через активные atoms
- mode calculation (`normal | compact | supercompact`) и `ResizeObserver`
- open/close state и refs для floating windows
- widgets bar context menu wiring
- top-level visible composition и dispatch между normal/supercompact rail layout
- floating window mounting для apps/tools/audit/settings

## Итоговый файл-лист active slice

- `frontend/app/workspace/widgets.tsx`
- `frontend/app/workspace/widget-types.ts`
- `frontend/app/workspace/widget-helpers.ts`
- `frontend/app/workspace/widget-item.tsx`
- `frontend/app/workspace/widget-action-button.tsx`
- `frontend/app/workspace/widgets-measurement.tsx`
- `frontend/app/workspace/apps-floating-window.tsx`
- `frontend/app/workspace/settings-floating-window.tsx`
- `frontend/app/workspace/tools-floating-window.tsx`
- `frontend/app/workspace/audit-floating-window.tsx`

## Линейный эффект

- `widgets.tsx` до slice: `1160` строк
- `widgets.tsx` после phase 4: `307` строк

## Намеренно отложено

- более широкий refactor `workspace` shell
- перенос state/model логики из `widgets.tsx` в store
- изменения visual/layout/CSS
- любые behavioral changes в tools/audit/terminal flows
