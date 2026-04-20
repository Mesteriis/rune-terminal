import { createEvent, createStore } from 'effector'

import {
  copyCommanderEntries,
  createCommanderWidgetRuntimeState,
  deleteCommanderEntries,
  getCommanderClientSnapshot,
  getCommanderConflictingEntryNames,
  getCommanderEntryNameConflict,
  getCommanderParentPath,
  hydrateCommanderClient,
  mkdirCommanderDirectory,
  moveCommanderEntries,
  openCommanderEntry,
  previewCommanderRenameEntries,
  readCommanderDirectory,
  renameCommanderEntry,
  renameCommanderEntries,
  resolveCommanderExistingPath,
} from './fake-client'
import {
  serializeCommanderWidgetRuntimeState,
  writePersistedCommanderWidgets,
} from './persistence'
import type {
  CommanderPendingOperation,
  CommanderPaneId,
  CommanderPaneRuntimeState,
  CommanderWidgetPersistedSnapshot,
  CommanderSortMode,
  CommanderViewMode,
  CommanderWidgetRuntimeState,
} from './types'

const COMMANDER_PERSIST_DEBOUNCE_MS = 120

type CommanderWidgetPayload = {
  widgetId: string
}

type CommanderMountWidgetPayload = CommanderWidgetPayload & {
  persistedWidget?: CommanderWidgetPersistedSnapshot | null
}

type CommanderWidgetPanePayload = CommanderWidgetPayload & {
  paneId: CommanderPaneId
}

type CommanderSetPaneCursorPayload = CommanderWidgetPanePayload & {
  entryId: string
  rangeSelect?: boolean
}

type CommanderMoveCursorPayload = CommanderWidgetPanePayload & {
  delta: number
  extendSelection?: boolean
}

type CommanderToggleEntrySelectionPayload = CommanderWidgetPanePayload & {
  entryId: string
}

type CommanderSetPaneBoundaryCursorPayload = CommanderWidgetPanePayload & {
  boundary: 'start' | 'end'
  extendSelection?: boolean
}

type CommanderSetViewModePayload = CommanderWidgetPayload & {
  viewMode: CommanderViewMode
}

type CommanderSetSortModePayload = CommanderWidgetPayload & {
  sortMode: CommanderSortMode
}

type CommanderSetPendingOperationInputPayload = CommanderWidgetPayload & {
  inputValue: string
}

type CommanderResolvePendingConflictPayload = CommanderWidgetPayload & {
  resolution: 'overwrite-current' | 'skip-current' | 'overwrite-all' | 'skip-all'
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
  const nextSelectionAnchorEntryId =
    paneState.path === resolvedPath
    && paneState.selectionAnchorEntryId
    && visibleEntryIds.has(paneState.selectionAnchorEntryId)
      ? paneState.selectionAnchorEntryId
      : nextCursorEntryId

  return {
    ...paneState,
    path: resolvedPath,
    entries: snapshot.entries,
    selectedIds: nextSelectedIds,
    cursorEntryId: nextCursorEntryId,
    selectionAnchorEntryId: nextSelectionAnchorEntryId,
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

function navigatePaneHistory(
  widgetState: CommanderWidgetRuntimeState,
  paneId: CommanderPaneId,
  direction: 'back' | 'forward',
) {
  return updatePaneState(widgetState, paneId, (paneState) => {
    const historyStack = direction === 'back' ? paneState.historyBack : paneState.historyForward
    const targetPath = historyStack[historyStack.length - 1]

    if (!targetPath) {
      return paneState
    }

    const rebuiltPaneState = rebuildPaneState(widgetState, paneState, targetPath)

    if (direction === 'back') {
      return {
        ...rebuiltPaneState,
        historyBack: paneState.historyBack.slice(0, -1),
        historyForward: [...paneState.historyForward, paneState.path],
      }
    }

    return {
      ...rebuiltPaneState,
      historyBack: [...paneState.historyBack, paneState.path],
      historyForward: paneState.historyForward.slice(0, -1),
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
    selectionAnchorEntryId: paneState.entries[nextCursorIndex]?.id ?? null,
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
    selectionAnchorEntryId: boundary === 'start'
      ? paneState.entries[0]?.id ?? null
      : paneState.entries[paneState.entries.length - 1]?.id ?? null,
  }
}

function movePaneCursorWithSelection(
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
  const nextCursorEntryId = paneState.entries[nextCursorIndex]?.id ?? null

  if (!nextCursorEntryId) {
    return paneState
  }

  return setSelectionRangeAtCursor(paneState, nextCursorEntryId)
}

function setSelectionRangeAtCursor(
  paneState: CommanderPaneRuntimeState,
  targetEntryId: string,
) {
  const targetIndex = paneState.entries.findIndex((entry) => entry.id === targetEntryId)

  if (targetIndex === -1) {
    return paneState
  }

  const anchorEntryId = paneState.selectionAnchorEntryId ?? paneState.cursorEntryId ?? targetEntryId
  const anchorIndex = paneState.entries.findIndex((entry) => entry.id === anchorEntryId)
  const resolvedAnchorIndex = anchorIndex === -1 ? targetIndex : anchorIndex
  const [rangeStartIndex, rangeEndIndex] = resolvedAnchorIndex <= targetIndex
    ? [resolvedAnchorIndex, targetIndex]
    : [targetIndex, resolvedAnchorIndex]
  const selectedIds = paneState.entries
    .slice(rangeStartIndex, rangeEndIndex + 1)
    .map((entry) => entry.id)

  return {
    ...paneState,
    cursorEntryId: targetEntryId,
    selectionAnchorEntryId: paneState.selectionAnchorEntryId ?? paneState.cursorEntryId ?? targetEntryId,
    selectedIds,
  }
}

function setCursorToBoundaryWithSelection(
  paneState: CommanderPaneRuntimeState,
  boundary: 'start' | 'end',
) {
  if (paneState.entries.length === 0) {
    return paneState
  }

  const targetEntryId = boundary === 'start'
    ? (paneState.entries[0]?.id ?? null)
    : (paneState.entries[paneState.entries.length - 1]?.id ?? null)

  if (!targetEntryId) {
    return paneState
  }

  return setSelectionRangeAtCursor(paneState, targetEntryId)
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
    selectionAnchorEntryId: entryId,
  }
}

function refreshWidgetPanes(
  widgetState: CommanderWidgetRuntimeState,
  overrides?: {
    pendingOperation?: CommanderPendingOperation | null
    leftPane?: Partial<CommanderPaneRuntimeState>
    rightPane?: Partial<CommanderPaneRuntimeState>
  },
) {
  const hasPendingOperationOverride = Boolean(
    overrides && Object.prototype.hasOwnProperty.call(overrides, 'pendingOperation'),
  )
  const nextWidgetState = {
    ...widgetState,
    pendingOperation: hasPendingOperationOverride
      ? (overrides?.pendingOperation ?? null)
      : widgetState.pendingOperation,
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

function getCurrentPendingConflictName(pendingOperation: CommanderPendingOperation) {
  if (pendingOperation.kind !== 'copy' && pendingOperation.kind !== 'move') {
    return null
  }

  return pendingOperation.conflictEntryNames?.[0] ?? null
}

function applyPendingTransferOperation(
  widgetId: string,
  pendingOperation: CommanderPendingOperation,
  entryIds: string[],
  overwrite: boolean,
) {
  if ((pendingOperation.kind !== 'copy' && pendingOperation.kind !== 'move') || !pendingOperation.targetPath || entryIds.length === 0) {
    return
  }

  if (pendingOperation.kind === 'copy') {
    copyCommanderEntries({
      widgetId,
      path: pendingOperation.sourcePath,
      targetPath: pendingOperation.targetPath,
      entryIds,
      overwrite,
    })
    return
  }

  moveCommanderEntries({
    widgetId,
    path: pendingOperation.sourcePath,
    targetPath: pendingOperation.targetPath,
    entryIds,
    overwrite,
  })
}

function removePendingTransferEntry(
  pendingOperation: CommanderPendingOperation,
  entryName: string,
) {
  const entryIndex = pendingOperation.entryNames.findIndex((candidateName) => candidateName === entryName)

  if (entryIndex === -1) {
    return pendingOperation
  }

  const nextEntryIds = pendingOperation.entryIds.filter((_entryId, index) => index !== entryIndex)
  const nextEntryNames = pendingOperation.entryNames.filter((_candidateName, index) => index !== entryIndex)

  return {
    ...pendingOperation,
    entryIds: nextEntryIds,
    entryNames: nextEntryNames,
    conflictEntryNames: (pendingOperation.conflictEntryNames ?? []).filter((candidateName) => candidateName !== entryName),
  }
}

function finalizePendingTransferOperation(
  widgetState: CommanderWidgetRuntimeState,
  widgetId: string,
  pendingOperation: CommanderPendingOperation,
) {
  applyPendingTransferOperation(widgetId, pendingOperation, pendingOperation.entryIds, false)

  return refreshWidgetPanes(widgetState, {
    pendingOperation: null,
  })
}

function createPendingOperation(
  widgetState: CommanderWidgetRuntimeState,
  kind: CommanderPendingOperation['kind'],
) {
  const sourcePane = getPaneState(widgetState, widgetState.activePane)
  const entryIds = getOperationEntryIds(sourcePane)

  if (kind !== 'mkdir' && entryIds.length === 0) {
    return null
  }

  if (kind === 'mkdir') {
    return {
      kind,
      sourcePaneId: widgetState.activePane,
      sourcePath: sourcePane.path,
      entryIds: [],
      entryNames: [],
      mkdirName: 'New folder',
    } satisfies CommanderPendingOperation
  }

  if (kind === 'rename') {
    const renameEntries = sourcePane.entries.filter((entry) => entryIds.includes(entry.id))

    if (renameEntries.length === 0) {
      return null
    }

    if (renameEntries.length === 1) {
      const currentEntry = renameEntries[0]

      return {
        kind,
        sourcePaneId: widgetState.activePane,
        sourcePath: sourcePane.path,
        entryIds: [currentEntry.id],
        entryNames: [currentEntry.name],
        inputValue: currentEntry.name,
        renameMode: 'single',
        renamePreview: [{
          entryId: currentEntry.id,
          currentName: currentEntry.name,
          nextName: currentEntry.name,
          conflict: false,
        }],
      } satisfies CommanderPendingOperation
    }

    const renamePreview = previewCommanderRenameEntries({
      widgetId: widgetState.widgetId,
      path: sourcePane.path,
      entryIds: renameEntries.map((entry) => entry.id),
      template: '[N]-[C:2]',
    })

    return {
      kind,
      sourcePaneId: widgetState.activePane,
      sourcePath: sourcePane.path,
      entryIds: renameEntries.map((entry) => entry.id),
      entryNames: renameEntries.map((entry) => entry.name),
      inputValue: '[N]-[C:2]',
      renameMode: 'batch',
      renamePreview: renamePreview.preview,
      conflictEntryNames: renamePreview.conflictEntryNames,
      duplicateTargetNames: renamePreview.duplicateTargetNames,
    } satisfies CommanderPendingOperation
  }

  if (kind === 'delete') {
    const entryNames = sourcePane.entries
      .filter((entry) => entryIds.includes(entry.id))
      .map((entry) => entry.name)

    return {
      kind,
      sourcePaneId: widgetState.activePane,
      sourcePath: sourcePane.path,
      entryIds,
      entryNames,
    } satisfies CommanderPendingOperation
  }

  const targetPaneId = widgetState.activePane === 'left' ? 'right' : 'left'
  const targetPane = getPaneState(widgetState, targetPaneId)
  const entryNames = sourcePane.entries
    .filter((entry) => entryIds.includes(entry.id))
    .map((entry) => entry.name)
  const conflictEntryNames = getCommanderConflictingEntryNames({
    widgetId: widgetState.widgetId,
    path: sourcePane.path,
    targetPath: targetPane.path,
    entryIds,
  })

  if (kind === 'move' && sourcePane.path === targetPane.path) {
    return null
  }

  return {
    kind,
    sourcePaneId: widgetState.activePane,
    sourcePath: sourcePane.path,
    targetPaneId,
    targetPath: targetPane.path,
    entryIds,
    entryNames,
    conflictEntryNames,
  } satisfies CommanderPendingOperation
}

export const mountCommanderWidget = createEvent<CommanderMountWidgetPayload>()
export const setCommanderActivePane = createEvent<CommanderWidgetPanePayload>()
export const toggleCommanderShowHidden = createEvent<CommanderWidgetPayload>()
export const setCommanderViewMode = createEvent<CommanderSetViewModePayload>()
export const setCommanderSortMode = createEvent<CommanderSetSortModePayload>()
export const setCommanderPaneCursor = createEvent<CommanderSetPaneCursorPayload>()
export const moveCommanderPaneCursor = createEvent<CommanderMoveCursorPayload>()
export const moveCommanderActivePaneCursor = createEvent<CommanderWidgetPayload & { delta: number; extendSelection?: boolean }>()
export const toggleCommanderPaneSelection = createEvent<CommanderToggleEntrySelectionPayload>()
export const toggleCommanderActivePaneSelection = createEvent<CommanderWidgetPayload & { advance?: boolean }>()
export const openCommanderPaneEntry = createEvent<CommanderOpenEntryPayload>()
export const openCommanderActivePaneEntry = createEvent<CommanderWidgetPayload>()
export const goCommanderPaneParent = createEvent<CommanderWidgetPanePayload>()
export const goCommanderActivePaneParent = createEvent<CommanderWidgetPayload>()
export const goCommanderPaneHistoryBack = createEvent<CommanderWidgetPanePayload>()
export const goCommanderPaneHistoryForward = createEvent<CommanderWidgetPanePayload>()
export const goCommanderActivePaneHistoryBack = createEvent<CommanderWidgetPayload>()
export const goCommanderActivePaneHistoryForward = createEvent<CommanderWidgetPayload>()
export const switchCommanderActivePane = createEvent<CommanderWidgetPayload>()
export const setCommanderPaneBoundaryCursor = createEvent<CommanderSetPaneBoundaryCursorPayload>()
export const requestCommanderActivePaneCopy = createEvent<CommanderWidgetPayload>()
export const requestCommanderActivePaneMove = createEvent<CommanderWidgetPayload>()
export const requestCommanderActivePaneDelete = createEvent<CommanderWidgetPayload>()
export const requestCommanderActivePaneMkdir = createEvent<CommanderWidgetPayload>()
export const requestCommanderActivePaneRename = createEvent<CommanderWidgetPayload>()
export const setCommanderPendingOperationInput = createEvent<CommanderSetPendingOperationInputPayload>()
export const confirmCommanderPendingOperation = createEvent<CommanderWidgetPayload>()
export const cancelCommanderPendingOperation = createEvent<CommanderWidgetPayload>()
export const resolveCommanderPendingConflict = createEvent<CommanderResolvePendingConflictPayload>()

export const $commanderWidgets = createStore<Record<string, CommanderWidgetRuntimeState>>({})
  .on(mountCommanderWidget, (widgets, payload) => {
    if (widgets[payload.widgetId]) {
      return widgets
    }

    hydrateCommanderClient(payload.widgetId, payload.persistedWidget?.client)

    return {
      ...widgets,
      [payload.widgetId]: createCommanderWidgetRuntimeState(
        payload.widgetId,
        payload.persistedWidget?.runtime,
      ),
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

          if (payload.rangeSelect) {
            return setSelectionRangeAtCursor(paneState, payload.entryId)
          }

          return {
            ...paneState,
            cursorEntryId: payload.entryId,
            selectionAnchorEntryId: payload.entryId,
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
        (paneState) => payload.extendSelection
          ? movePaneCursorWithSelection(paneState, payload.delta)
          : movePaneCursor(paneState, payload.delta),
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
        payload.extendSelection
          ? movePaneCursorWithSelection(paneState, payload.delta)
          : movePaneCursor(paneState, payload.delta)
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
  .on(goCommanderPaneHistoryBack, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneHistory(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        'back',
      ),
    }
  })
  .on(goCommanderPaneHistoryForward, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneHistory(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        'forward',
      ),
    }
  })
  .on(goCommanderActivePaneHistoryBack, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneHistory(widgetState, widgetState.activePane, 'back'),
    }
  })
  .on(goCommanderActivePaneHistoryForward, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneHistory(widgetState, widgetState.activePane, 'forward'),
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
        (paneState) => payload.extendSelection
          ? setCursorToBoundaryWithSelection(paneState, payload.boundary)
          : setCursorToBoundary(paneState, payload.boundary),
      ),
    }
  })
  .on(requestCommanderActivePaneCopy, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }
    const pendingOperation = createPendingOperation(widgetState, 'copy')

    return {
      ...widgets,
      [payload.widgetId]: pendingOperation
        ? {
          ...widgetState,
          pendingOperation,
        }
        : widgetState,
    }
  })
  .on(requestCommanderActivePaneMove, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }
    const pendingOperation = createPendingOperation(widgetState, 'move')

    return {
      ...widgets,
      [payload.widgetId]: pendingOperation
        ? {
          ...widgetState,
          pendingOperation,
        }
        : widgetState,
    }
  })
  .on(requestCommanderActivePaneDelete, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }
    const pendingOperation = createPendingOperation(widgetState, 'delete')

    return {
      ...widgets,
      [payload.widgetId]: pendingOperation
        ? {
          ...widgetState,
          pendingOperation,
        }
        : widgetState,
    }
  })
  .on(requestCommanderActivePaneMkdir, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }
    const pendingOperation = createPendingOperation(widgetState, 'mkdir')

    return {
      ...widgets,
      [payload.widgetId]: pendingOperation
        ? {
          ...widgetState,
          pendingOperation,
        }
        : widgetState,
    }
  })
  .on(requestCommanderActivePaneRename, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }
    const pendingOperation = createPendingOperation(widgetState, 'rename')

    return {
      ...widgets,
      [payload.widgetId]: pendingOperation
        ? {
          ...widgetState,
          pendingOperation,
        }
        : widgetState,
    }
  })
  .on(setCommanderPendingOperationInput, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState?.pendingOperation) {
      return widgets
    }

    if (widgetState.pendingOperation.kind !== 'rename') {
      return {
        ...widgets,
        [payload.widgetId]: {
          ...widgetState,
          pendingOperation: {
            ...widgetState.pendingOperation,
            inputValue: payload.inputValue,
            conflictEntryNames: undefined,
          },
        },
      }
    }

    const renamePreview = previewCommanderRenameEntries({
      widgetId: payload.widgetId,
      path: widgetState.pendingOperation.sourcePath,
      entryIds: widgetState.pendingOperation.entryIds,
      template: payload.inputValue,
    })

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        pendingOperation: {
          ...widgetState.pendingOperation,
          inputValue: payload.inputValue,
          conflictEntryNames: renamePreview.conflictEntryNames,
          duplicateTargetNames: renamePreview.duplicateTargetNames,
          renamePreview: renamePreview.preview,
        },
      },
    }
  })
  .on(confirmCommanderPendingOperation, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState || !widgetState.pendingOperation) {
      return widgets
    }

    const pendingOperation = widgetState.pendingOperation

    if (pendingOperation.kind === 'copy' && pendingOperation.targetPath) {
      if (pendingOperation.conflictEntryNames?.length) {
        return widgets
      }

      copyCommanderEntries({
        widgetId: payload.widgetId,
        path: pendingOperation.sourcePath,
        targetPath: pendingOperation.targetPath,
        entryIds: pendingOperation.entryIds,
        overwrite: false,
      })

      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: null,
        }),
      }
    }

    if (pendingOperation.kind === 'move' && pendingOperation.targetPath) {
      if (pendingOperation.conflictEntryNames?.length) {
        return widgets
      }

      moveCommanderEntries({
        widgetId: payload.widgetId,
        path: pendingOperation.sourcePath,
        targetPath: pendingOperation.targetPath,
        entryIds: pendingOperation.entryIds,
        overwrite: false,
      })

      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: null,
        }),
      }
    }

    if (pendingOperation.kind === 'delete') {
      deleteCommanderEntries({
        widgetId: payload.widgetId,
        path: pendingOperation.sourcePath,
        entryIds: pendingOperation.entryIds,
      })

      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: null,
        }),
      }
    }

    if (pendingOperation.kind === 'mkdir') {
      const mkdirResult = mkdirCommanderDirectory(payload.widgetId, pendingOperation.sourcePath)

      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: null,
          [pendingOperation.sourcePaneId === 'left' ? 'leftPane' : 'rightPane']: {
            cursorEntryId: mkdirResult.entryId,
            selectedIds: [],
          },
        }),
      }
    }

    if (pendingOperation.kind === 'rename') {
      const nextName = pendingOperation.inputValue?.trim() ?? ''

      if (!nextName) {
        return widgets
      }

      if (pendingOperation.renameMode === 'batch') {
        const renamePreview = previewCommanderRenameEntries({
          widgetId: payload.widgetId,
          path: pendingOperation.sourcePath,
          entryIds: pendingOperation.entryIds,
          template: nextName,
        })

        if (renamePreview.duplicateTargetNames.length > 0) {
          return {
            ...widgets,
            [payload.widgetId]: {
              ...widgetState,
              pendingOperation: {
                ...pendingOperation,
                duplicateTargetNames: renamePreview.duplicateTargetNames,
                conflictEntryNames: renamePreview.conflictEntryNames,
                renamePreview: renamePreview.preview,
              },
            },
          }
        }

        if (
          !pendingOperation.conflictEntryNames?.length
          && renamePreview.conflictEntryNames.length > 0
        ) {
          return {
            ...widgets,
            [payload.widgetId]: {
              ...widgetState,
              pendingOperation: {
                ...pendingOperation,
                conflictEntryNames: renamePreview.conflictEntryNames,
                duplicateTargetNames: renamePreview.duplicateTargetNames,
                renamePreview: renamePreview.preview,
              },
            },
          }
        }

        const renameResult = renameCommanderEntries({
          widgetId: payload.widgetId,
          path: pendingOperation.sourcePath,
          entryIds: pendingOperation.entryIds,
          template: nextName,
          overwrite: Boolean(pendingOperation.conflictEntryNames?.length),
        })

        if (!renameResult) {
          return widgets
        }

        return {
          ...widgets,
          [payload.widgetId]: refreshWidgetPanes(widgetState, {
            pendingOperation: null,
            [pendingOperation.sourcePaneId === 'left' ? 'leftPane' : 'rightPane']: {
              cursorEntryId: renameResult.entryIds[0] ?? null,
              selectedIds: [],
              selectionAnchorEntryId: renameResult.entryIds[0] ?? null,
            },
          }),
        }
      }

      const entryId = pendingOperation.entryIds[0]

      if (!entryId) {
        return widgets
      }

      if (
        !pendingOperation.conflictEntryNames?.length
        && getCommanderEntryNameConflict({
          widgetId: payload.widgetId,
          path: pendingOperation.sourcePath,
          name: nextName,
          ignoreEntryId: entryId,
        })
      ) {
        return {
          ...widgets,
          [payload.widgetId]: {
            ...widgetState,
            pendingOperation: {
              ...pendingOperation,
              conflictEntryNames: [nextName],
            },
          },
        }
      }

      const renameResult = renameCommanderEntry({
        widgetId: payload.widgetId,
        path: pendingOperation.sourcePath,
        entryId,
        nextName,
        overwrite: Boolean(pendingOperation.conflictEntryNames?.length),
      })

      if (!renameResult) {
        return widgets
      }

      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: null,
          [pendingOperation.sourcePaneId === 'left' ? 'leftPane' : 'rightPane']: {
            cursorEntryId: renameResult.entryId,
            selectedIds: [],
            selectionAnchorEntryId: renameResult.entryId,
          },
        }),
      }
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        pendingOperation: null,
      },
    }
  })
  .on(resolveCommanderPendingConflict, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState?.pendingOperation) {
      return widgets
    }

    const pendingOperation = widgetState.pendingOperation

    if ((pendingOperation.kind !== 'copy' && pendingOperation.kind !== 'move') || !pendingOperation.targetPath) {
      return widgets
    }

    const currentConflictName = getCurrentPendingConflictName(pendingOperation)

    if (!currentConflictName && payload.resolution !== 'overwrite-all' && payload.resolution !== 'skip-all') {
      return widgets
    }

    if (payload.resolution === 'overwrite-all') {
      applyPendingTransferOperation(payload.widgetId, pendingOperation, pendingOperation.entryIds, true)

      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: null,
        }),
      }
    }

    if (payload.resolution === 'skip-all') {
      const conflictEntryNameSet = new Set(pendingOperation.conflictEntryNames ?? [])
      const nonConflictingEntryIds = pendingOperation.entryIds.filter((_entryId, index) => (
        !conflictEntryNameSet.has(pendingOperation.entryNames[index] ?? '')
      ))

      applyPendingTransferOperation(payload.widgetId, pendingOperation, nonConflictingEntryIds, false)

      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: null,
        }),
      }
    }

    if (!currentConflictName) {
      return widgets
    }

    const currentConflictIndex = pendingOperation.entryNames.findIndex((entryName) => entryName === currentConflictName)
    const currentConflictEntryId = currentConflictIndex === -1
      ? null
      : (pendingOperation.entryIds[currentConflictIndex] ?? null)

    if (payload.resolution === 'overwrite-current' && currentConflictEntryId) {
      applyPendingTransferOperation(payload.widgetId, pendingOperation, [currentConflictEntryId], true)
    }

    const nextPendingOperation = removePendingTransferEntry(pendingOperation, currentConflictName)

    if (nextPendingOperation.conflictEntryNames?.length) {
      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: nextPendingOperation,
        }),
      }
    }

    return {
      ...widgets,
      [payload.widgetId]: finalizePendingTransferOperation(widgetState, payload.widgetId, nextPendingOperation),
    }
  })
  .on(cancelCommanderPendingOperation, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState || !widgetState.pendingOperation) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        pendingOperation: null,
      },
    }
  })

let persistCommanderWidgetsTimeout: ReturnType<typeof setTimeout> | null = null
let hasInitializedCommanderPersistence = false

$commanderWidgets.watch((widgets) => {
  if (typeof window === 'undefined') {
    return
  }

  if (!hasInitializedCommanderPersistence) {
    hasInitializedCommanderPersistence = true
    return
  }

  if (persistCommanderWidgetsTimeout) {
    clearTimeout(persistCommanderWidgetsTimeout)
  }

  persistCommanderWidgetsTimeout = window.setTimeout(() => {
    writePersistedCommanderWidgets(
      Object.fromEntries(
        Object.entries(widgets).map(([widgetId, widgetState]) => [
          widgetId,
          {
            runtime: serializeCommanderWidgetRuntimeState(widgetState),
            client: getCommanderClientSnapshot(widgetId),
          } satisfies CommanderWidgetPersistedSnapshot,
        ]),
      ),
    )
  }, COMMANDER_PERSIST_DEBOUNCE_MS)
})
