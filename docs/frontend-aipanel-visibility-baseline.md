# frontend AI panel visibility/open-state baseline

Дата: `2026-04-16`

## 1. Текущий mount path

- active compat shell монтирует AI surface в `frontend/app/workspace/workspace.tsx`
- путь:
  - `Workspace`
  - `Group`
  - `Panel id="workspace-ai-panel"`
  - wrapper `div`
  - `{tabId !== "" && <AIPanel />}`

## 2. Текущий open-state path

- source of truth: `frontend/app/workspace/workspace-layout-model.ts`
- state:
  - `aiPanelVisible`
  - `panelVisibleAtom`
- toggle path:
  - `frontend/app/tab/tabbar.tsx`
  - `WaveAIButton`
  - `WorkspaceLayoutModel.setAIPanelVisible(!currentVisible)`

## 3. Текущий visibility/size path

- `WorkspaceLayoutModel.getAIPanelVisible()` определяет открыт ли panel
- `WorkspaceLayoutModel.getAIPanelPercentage(windowWidth)` возвращает `0`, если panel закрыт
- `workspace.tsx` передаёт этот layout в `react-resizable-panels` как `defaultLayout`
- `WorkspaceLayoutModel.syncAIPanelRef()` вызывает `expand()` / `collapse()` и затем `setLayout(...)`

## 4. Причина sliver behavior

- в compat runtime AI panel по умолчанию находится в закрытом состоянии (`aiPanelVisible = false`)
- layout model действительно схлопывает host panel почти до нуля
- но `workspace.tsx` всё равно безусловно монтирует `<AIPanel />`, пока есть `tabId`
- результат:
  - collapsed host panel остаётся в DOM как узкий трек
  - содержимое AI panel живёт внутри этого collapsed host
  - видимый результат в runtime: почти схлопнутый sliver вместо честно скрытого panel

## 5. Граница slice

- только recovery visible/open-state для active AI panel
- без redesign
- без attachments
- без `/run` integration
- без unrelated panel work
