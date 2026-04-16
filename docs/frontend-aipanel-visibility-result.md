# frontend AI panel visibility/open-state result

Дата: `2026-04-16`

## Что вызывало sliver behavior

- `frontend/app/workspace/workspace.tsx` монтировал `<AIPanel />` при любом непустом `tabId`
- одновременно `frontend/app/workspace/workspace-layout-model.ts` держал AI host panel в закрытом состоянии через `aiPanelVisible = false` и layout ширину `0`
- итог: содержимое AI panel жило внутри уже collapsed host panel и в runtime давало почти нулевой видимый трек вместо честно скрытого closed state

## Что изменено

- в `frontend/app/workspace/workspace.tsx` mount condition привязан к уже существующему open-state:
  - было: `{tabId !== "" && <AIPanel />}`
  - стало: `{tabId !== "" && aiPanelVisible && <AIPanel />}`
- это не меняет shell toggle path и не меняет layout model; исправляется только неправильный mount в закрытом состоянии

## Что подтверждено runtime-проверкой

- fresh load в закрытом состоянии больше не держит AI composer/selectors в DOM:
  - `composerPresent: false`
  - `selectorIds: []`
- после клика shell `AI` toggle panel открывается в usable size/state:
  - composer `placeholder="Ask TideTerm AI anything..."`
  - geometry `x: 2`, `width: 296`, `height: 48`
  - selectors `Profile`, `Role`, `Mode` видимы
- conversation transport не изменился:
  - сохранились `GET /api/v1/bootstrap`, `GET /api/v1/agent/conversation`, `GET /api/v1/agent`
  - submit прошёл через `POST /api/v1/agent/conversation/messages`
  - UI отрисовал `visibility slice ping` и `stub-response: visibility slice ping`
- adjacent smoke:
  - `Tools` panel открылся и загрузил `GET /api/v1/tools`
  - `Audit` panel открылся и загрузил `GET /api/v1/audit?limit=50`
  - `consoleErrors: 0`
  - `pageErrors: 0`
  - `loadingFailed: 0`

## Что намеренно отложено

- attachments support
- `/run` и explain-command flow
- любые layout/style изменения вне минимального open-state recovery

## Подтверждение по transport

- corrective slice не менял `frontend/compat/agent.ts`
- corrective slice не менял `frontend/compat/conversation.ts`
- corrective slice не менял backend route usage
- рабочее transport behavior сохранено, изменён только visibility/open-state mount path
