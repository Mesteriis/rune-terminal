import { createEvent, createStore } from 'effector'

import {
  copyCommanderEntries,
  createCommanderWidgetRuntimeState,
  deleteCommanderEntries,
  getCommanderParentPath,
  mkdirCommanderDirectory,
  moveCommanderEntries,
  openCommanderEntry,
  readCommanderDirectory,
  resolveCommanderExistingPath,
} from './fake-client'
import type {
  CommanderPaneId,
  CommanderPaneRuntimeState,
  CommanderSortMode,
  CommanderViewMode,
  CommanderWidgetRuntimeState,
} from './types'

type CommanderWidgetPayload = {
  widgetId: string
}

type CommanderWidgetPanePayload = CommanderWidgetPayload & {
  paneId: CommanderPaneId
}

type CommanderSetPaneCursorPayload = CommanderWidgetPanePayload & {
  entryId: string
}

type CommanderMoveCursorPayload = CommanderWidgetPanePayload & {
  delta: number
}

type CommanderToggleEntrySelectionPayload = CommanderWidgetPanePayload & {
  entryId: string
}

type CommanderSetViewModePayload = CommanderWidgetPayload & {
  viewMode: CommanderViewMode
}

type CommanderSetSortModePayload = CommanderWidgetPayload & {
  sortMode: CommanderSortMode
}

type CommanderOpenEntryPayload = CommanderWidgetPanePayload & {
  entryId: string
}

function getPaneState(widgetState: CommanderWidgetRuntimeState, paneId: CommanderPaneId) {
  return paneId === 'left' ? widgetState.leftPane : widgetState.rightPane
}

function setPaneState(
  widgetState: CommanderWidgetRuntimeState,
  paneId: CommanderPaneId,
  paneState: CommanderPaneRuntimeState,
) {
  if (paneId === 'left') {
    return {
      ...widgetState,
      leftPane: paneState,
    }
  }

  return {
    ...widgetState,
    rightPane: paneState,
  }
}

function updatePaneState(
  widgetState: CommanderWidgetRuntimeState,
  paneId: CommanderPaneId,
  updater: (paneState: CommanderPaneRuntimeState) => CommanderPaneRuntimeState,
) {
  return setPaneState(widgetState, paneId, updater(getPaneState(widgetState, paneId)))
}

function rebuildPaneState(
  widgetState: CommanderWidgetRuntimeState,
  paneState: CommanderPaneRuntimeState,
  nextPath = paneState.path,
) {
  const resolvedPath = resolveCommanderExistingPath(widgetState.widgetId, nextPath)
  const snapshot = readCommanderDirectory(widgetState.widgetId, resolvedPath, {
    showHidden: widgetState.showHidden,
    sortMode: widgetState.sortMode,
  })
  const visibleEntryIds = new Set(snapshot.entries.map((entry) => entry.id))
  const nextSelectedIds = paneState.path === resolvedPath
    ? paneState.selectedIds.filter((entryId) => visibleEntryIds.has(entryId))
    : []
  const nextCursorEntryId = paneState.path === resolvedPath && paneState.cursorEntryId && visibleEntryIds.has(paneState.cursorEntryId)
    ? paneState.cursorEntryId
    : (snapshot.entries[0]?.id ?? null)

  return {
    ...paneState,
    path: resolvedPath,
    entries: snapshot.entries,
    selectedIds: nextSelectedIds,
    cursorEntryId: nextCursorEntryId,
  }
}

function navigatePaneState(
  widgetState: CommanderWidgetRuntimeState,
  paneId: CommanderPaneId,
  nextPath: string,
) {
  return updatePaneState(widgetState, paneId, (paneState) => {
    if (paneState.path === nextPath) {
      return rebuildPaneState(widgetState, paneState)
    }

    const rebuiltPaneState = rebuildPaneState(widgetState, paneState, nextPath)

    return {
      ...rebuiltPaneState,
      historyBack: [...paneState.historyBack, paneState.path],
      historyForward: [],
    }
  })
}

function movePaneCursor(
  paneState: CommanderPaneRuntimeState,
  delta: number,
) {
  if (paneState.entries.length === 0) {
    return paneState
  }

  const currentCursorIndex = paneState.cursorEntryId
    ? paneState.entries.findIndex((entry) => entry.id === paneState.cursorEntryId)
    : -1
  const startIndex = currentCursorIndex === -1 ? 0 : currentCursorIndex
  const nextCursorIndex = Math.min(
    paneState.entries.length - 1,
    Math.max(0, startIndex + delta),
  )

  return {
    ...paneState,
    cursorEntryId: paneState.entries[nextCursorIndex]?.id ?? null,
  }
}

function setCursorToBoundary(
  paneState: CommanderPaneRuntimeState,
  boundary: 'start' | 'end',
) {
  if (paneState.entries.length === 0) {
    return paneState
  }

  return {
    ...paneState,
    cursorEntryId: boundary === 'start'
      ? paneState.entries[0]?.id ?? null
      : paneState.entries[paneState.entries.length - 1]?.id ?? null,
  }
}

function toggleEntrySelection(
  paneState: CommanderPaneRuntimeState,
  entryId: string,
) {
  if (!paneState.entries.some((entry) => entry.id === entryId)) {
    return paneState
  }

  const selectedIds = paneState.selectedIds.includes(entryId)
    ? paneState.selectedIds.filter((selectedId) => selectedId !== entryId)
    : [...paneState.selectedIds, entryId]

  return {
    ...paneState,
    selectedIds,
  }
}

function refreshWidgetPanes(
  widgetState: CommanderWidgetRuntimeState,
  overrides?: {
    leftPane?: Partial<CommanderPaneRuntimeState>
    rightPane?: Partial<CommanderPaneRuntimeState>
  },
) {
  const nextWidgetState = {
    ...widgetState,
    leftPane: {
      ...widgetState.leftPane,
      ...overrides?.leftPane,
    },
    rightPane: {
      ...widgetState.rightPane,
      ...overrides?.rightPane,
    },
  }

  return {
    ...nextWidgetState,
    leftPane: rebuildPaneState(nextWidgetState, nextWidgetState.leftPane),
    rightPane: rebuildPaneState(nextWidgetState, nextWidgetState.rightPane),
  }
}

function getOperationEntryIds(paneState: CommanderPaneRuntimeState) {
  if (paneState.selectedIds.length > 0) {
    return paneState.selectedIds
  }

  return paneState.cursorEntryId ? [paneState.cursorEntryId] : []
}

export const mountCommanderWidget = createEvent<string>()
export const setCommanderActivePane = createEvent<CommanderWidgetPanePayload>()
export const toggleCommanderShowHidden = createEvent<CommanderWidgetPayload>()
export const setCommanderViewMode = createEvent<CommanderSetViewModePayload>()
export const setCommanderSortMode = createEvent<CommanderSetSortModePayload>()
export const setCommanderPaneCursor = createEvent<CommanderSetPaneCursorPayload>()
export const moveCommanderPaneCursor = createEvent<CommanderMoveCursorPayload>()
export const moveCommanderActivePaneCursor = createEvent<CommanderWidgetPayload & { delta: number }>()
export const toggleCommanderPaneSelection = createEvent<CommanderToggleEntrySelectionPayload>()
export const toggleCommanderActivePaneSelection = createEvent<CommanderWidgetPayload & { advance?: boolean }>()
export const openCommanderPaneEntry = createEvent<CommanderOpenEntryPayload>()
export const openCommanderActivePaneEntry = createEvent<CommanderWidgetPayload>()
export const goCommanderPaneParent = createEvent<CommanderWidgetPanePayload>()
export const goCommanderActivePaneParent = createEvent<CommanderWidgetPayload>()
export const switchCommanderActivePane = createEvent<CommanderWidgetPayload>()
export const setCommanderPaneBoundaryCursor = createEvent<CommanderWidgetPanePayload & { boundary: 'start' | 'end' }>()
export const copyCommanderActivePaneSelection = createEvent<CommanderWidgetPayload>()
export const moveCommanderActivePaneSelection = createEvent<CommanderWidgetPayload>()
export const deleteCommanderActivePaneSelection = createEvent<CommanderWidgetPayload>()
export const mkdirCommanderActivePaneDirectory = createEvent<CommanderWidgetPayload>()

export const $commanderWidgets = createStore<Record<string, CommanderWidgetRuntimeState>>({})
  .on(mountCommanderWidget, (widgets, widgetId) => {
    if (widgets[widgetId]) {
      return widgets
    }

    return {
      ...widgets,
      [widgetId]: createCommanderWidgetRuntimeState(widgetId),
    }
  })
  .on(setCommanderActivePane, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        activePane: payload.paneId,
      },
    }
  })
  .on(toggleCommanderShowHidden, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const nextWidgetState = {
      ...widgetState,
      showHidden: !widgetState.showHidden,
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...nextWidgetState,
        leftPane: rebuildPaneState(nextWidgetState, widgetState.leftPane),
        rightPane: rebuildPaneState(nextWidgetState, widgetState.rightPane),
      },
    }
  })
  .on(setCommanderViewMode, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState || widgetState.viewMode === payload.viewMode) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        viewMode: payload.viewMode,
      },
    }
  })
  .on(setCommanderSortMode, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState || widgetState.sortMode === payload.sortMode) {
      return widgets
    }

    const nextWidgetState = {
      ...widgetState,
      sortMode: payload.sortMode,
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...nextWidgetState,
        leftPane: rebuildPaneState(nextWidgetState, widgetState.leftPane),
        rightPane: rebuildPaneState(nextWidgetState, widgetState.rightPane),
      },
    }
  })
  .on(setCommanderPaneCursor, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: updatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        (paneState) => {
          if (!paneState.entries.some((entry) => entry.id === payload.entryId)) {
            return paneState
          }

          return {
            ...paneState,
            cursorEntryId: payload.entryId,
          }
        },
      ),
    }
  })
  .on(moveCommanderPaneCursor, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: updatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        (paneState) => movePaneCursor(paneState, payload.delta),
      ),
    }
  })
  .on(moveCommanderActivePaneCursor, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: updatePaneState(widgetState, widgetState.activePane, (paneState) => (
        movePaneCursor(paneState, payload.delta)
      )),
    }
  })
  .on(toggleCommanderPaneSelection, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: updatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        (paneState) => toggleEntrySelection(paneState, payload.entryId),
      ),
    }
  })
  .on(toggleCommanderActivePaneSelection, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const activePaneState = getPaneState(widgetState, widgetState.activePane)
    const entryId = activePaneState.cursorEntryId

    if (!entryId) {
      return widgets
    }

    let nextWidgetState = updatePaneState(widgetState, widgetState.activePane, (paneState) => (
      toggleEntrySelection(paneState, entryId)
    ))

    if (payload.advance) {
      nextWidgetState = updatePaneState(nextWidgetState, widgetState.activePane, (paneState) => (
        movePaneCursor(paneState, 1)
      ))
    }

    return {
      ...widgets,
      [payload.widgetId]: nextWidgetState,
    }
  })
  .on(openCommanderPaneEntry, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const navigationResult = openCommanderEntry(payload.widgetId, getPaneState(widgetState, payload.paneId).path, payload.entryId)

    if (!navigationResult || navigationResult.kind !== 'directory') {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        navigationResult.path,
      ),
    }
  })
  .on(openCommanderActivePaneEntry, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const activePaneState = getPaneState(widgetState, widgetState.activePane)
    const entryId = activePaneState.cursorEntryId

    if (!entryId) {
      return widgets
    }

    const navigationResult = openCommanderEntry(payload.widgetId, activePaneState.path, entryId)

    if (!navigationResult || navigationResult.kind !== 'directory') {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneState(widgetState, widgetState.activePane, navigationResult.path),
    }
  })
  .on(goCommanderPaneParent, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const paneState = getPaneState(widgetState, payload.paneId)
    const parentPath = getCommanderParentPath(paneState.path)

    if (!parentPath) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        parentPath,
      ),
    }
  })
  .on(goCommanderActivePaneParent, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const paneState = getPaneState(widgetState, widgetState.activePane)
    const parentPath = getCommanderParentPath(paneState.path)

    if (!parentPath) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneState(widgetState, widgetState.activePane, parentPath),
    }
  })
  .on(switchCommanderActivePane, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        activePane: widgetState.activePane === 'left' ? 'right' : 'left',
      },
    }
  })
  .on(setCommanderPaneBoundaryCursor, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: updatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        (paneState) => setCursorToBoundary(paneState, payload.boundary),
      ),
    }
  })
  .on(copyCommanderActivePaneSelection, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const sourcePane = getPaneState(widgetState, widgetState.activePane)
    const targetPaneId = widgetState.activePane === 'left' ? 'right' : 'left'
    const targetPane = getPaneState(widgetState, targetPaneId)
    const entryIds = getOperationEntryIds(sourcePane)

    if (entryIds.length === 0) {
      return widgets
    }

    copyCommanderEntries({
      widgetId: payload.widgetId,
      path: sourcePane.path,
      targetPath: targetPane.path,
      entryIds,
    })

    return {
      ...widgets,
      [payload.widgetId]: refreshWidgetPanes(widgetState),
    }
  })
  .on(moveCommanderActivePaneSelection, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const sourcePane = getPaneState(widgetState, widgetState.activePane)
    const targetPaneId = widgetState.activePane === 'left' ? 'right' : 'left'
    const targetPane = getPaneState(widgetState, targetPaneId)
    const entryIds = getOperationEntryIds(sourcePane)

    if (entryIds.length === 0 || sourcePane.path === targetPane.path) {
      return widgets
    }

    moveCommanderEntries({
      widgetId: payload.widgetId,
      path: sourcePane.path,
      targetPath: targetPane.path,
      entryIds,
    })

    return {
      ...widgets,
      [payload.widgetId]: refreshWidgetPanes(widgetState),
    }
  })
  .on(deleteCommanderActivePaneSelection, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const activePane = getPaneState(widgetState, widgetState.activePane)
    const entryIds = getOperationEntryIds(activePane)

    if (entryIds.length === 0) {
      return widgets
    }

    deleteCommanderEntries({
      widgetId: payload.widgetId,
      path: activePane.path,
      entryIds,
    })

    return {
      ...widgets,
      [payload.widgetId]: refreshWidgetPanes(widgetState),
    }
  })
  .on(mkdirCommanderActivePaneDirectory, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const activePane = getPaneState(widgetState, widgetState.activePane)
    const mkdirResult = mkdirCommanderDirectory(payload.widgetId, activePane.path)

    return {
      ...widgets,
      [payload.widgetId]: refreshWidgetPanes(widgetState, {
        [widgetState.activePane === 'left' ? 'leftPane' : 'rightPane']: {
          cursorEntryId: mkdirResult.entryId,
          selectedIds: [],
        },
      }),
    }
  })
