import {
  copyCommanderEntries,
  deleteCommanderEntries,
  mkdirCommanderDirectory,
  moveCommanderEntries,
  readCommanderFile,
  renameCommanderEntries,
  renameCommanderEntry,
} from '@/features/commander/model/fake-client'
import {
  getCommanderConflictingEntryNames,
  getCommanderEntryNameConflict,
  previewCommanderRenameEntries,
  suggestCommanderCloneName,
} from '@/features/commander/model/operation-preview'
import type {
  CommanderFileDialogState,
  CommanderPendingOperation,
  CommanderPendingOperationKind,
  CommanderPaneId,
  CommanderPaneRuntimeState,
  CommanderTransferPendingOperation,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'
import {
  getPaneState,
  rebuildPaneState,
  refreshWidgetPanes,
  updatePaneState,
} from '@/features/commander/model/store-navigation'
import {
  applySelectionMaskToPane,
  getCommanderFilterMatches,
  getCommanderMaskMatches,
  getCommanderResolvedSearchMatchIndex,
  getCommanderSearchMatches,
} from '@/features/commander/model/store-selection'

type CommanderPendingOperationInputDeps = {
  getCommanderEntryNameConflict: typeof getCommanderEntryNameConflict
  getCommanderMaskMatches: typeof getCommanderMaskMatches
  getCommanderFilterMatches: typeof getCommanderFilterMatches
  getCommanderSearchMatches: typeof getCommanderSearchMatches
  getCommanderResolvedSearchMatchIndex: typeof getCommanderResolvedSearchMatchIndex
  previewCommanderRenameEntries: typeof previewCommanderRenameEntries
}

const defaultCommanderPendingOperationInputDeps: CommanderPendingOperationInputDeps = {
  getCommanderEntryNameConflict,
  getCommanderMaskMatches,
  getCommanderFilterMatches,
  getCommanderSearchMatches,
  getCommanderResolvedSearchMatchIndex,
  previewCommanderRenameEntries,
}

type CommanderPendingOperationConfirmDeps = {
  copyCommanderEntries: typeof copyCommanderEntries
  moveCommanderEntries: typeof moveCommanderEntries
  deleteCommanderEntries: typeof deleteCommanderEntries
  mkdirCommanderDirectory: typeof mkdirCommanderDirectory
  previewCommanderRenameEntries: typeof previewCommanderRenameEntries
  renameCommanderEntries: typeof renameCommanderEntries
  getCommanderEntryNameConflict: typeof getCommanderEntryNameConflict
  renameCommanderEntry: typeof renameCommanderEntry
  refreshWidgetPanes: typeof refreshWidgetPanes
  updatePaneState: typeof updatePaneState
  rebuildPaneState: typeof rebuildPaneState
  getPaneState: typeof getPaneState
  applySelectionMaskToPane: typeof applySelectionMaskToPane
  getCommanderSearchMatches: typeof getCommanderSearchMatches
  getCommanderResolvedSearchMatchIndex: typeof getCommanderResolvedSearchMatchIndex
}

const defaultCommanderPendingOperationConfirmDeps: CommanderPendingOperationConfirmDeps = {
  copyCommanderEntries,
  moveCommanderEntries,
  deleteCommanderEntries,
  mkdirCommanderDirectory,
  previewCommanderRenameEntries,
  renameCommanderEntries,
  getCommanderEntryNameConflict,
  renameCommanderEntry,
  refreshWidgetPanes,
  updatePaneState,
  rebuildPaneState,
  getPaneState,
  applySelectionMaskToPane,
  getCommanderSearchMatches,
  getCommanderResolvedSearchMatchIndex,
}

type CommanderPendingOperationRequestDeps = {
  createPendingOperation: typeof createPendingOperation
}

const defaultCommanderPendingOperationRequestDeps: CommanderPendingOperationRequestDeps = {
  createPendingOperation,
}

type CommanderPendingSearchStepDeps = {
  getPaneState: typeof getPaneState
  getCommanderSearchMatches: typeof getCommanderSearchMatches
  getCommanderResolvedSearchMatchIndex: typeof getCommanderResolvedSearchMatchIndex
  updatePaneState: typeof updatePaneState
}

const defaultCommanderPendingSearchStepDeps: CommanderPendingSearchStepDeps = {
  getPaneState,
  getCommanderSearchMatches,
  getCommanderResolvedSearchMatchIndex,
  updatePaneState,
}

type CommanderPendingConflictResolution = 'overwrite-current' | 'skip-current' | 'overwrite-all' | 'skip-all'

type CommanderPendingConflictResolutionDeps = {
  getCurrentPendingConflictName: typeof getCurrentPendingConflictName
  applyPendingTransferOperation: typeof applyPendingTransferOperation
  removePendingTransferEntry: typeof removePendingTransferEntry
  refreshWidgetPanes: typeof refreshWidgetPanes
  finalizePendingTransferOperation: typeof finalizePendingTransferOperation
}

const defaultCommanderPendingConflictResolutionDeps: CommanderPendingConflictResolutionDeps = {
  getCurrentPendingConflictName,
  applyPendingTransferOperation,
  removePendingTransferEntry,
  refreshWidgetPanes,
  finalizePendingTransferOperation,
}

/** Returns the active selection when present, otherwise falls back to the pane cursor entry. */
export function getOperationEntryIds(paneState: CommanderPaneRuntimeState) {
  if (paneState.selectedIds.length > 0) {
    return paneState.selectedIds
  }

  return paneState.cursorEntryId ? [paneState.cursorEntryId] : []
}

/** Returns the next conflicting transfer entry name that still needs user resolution. */
export function getCurrentPendingConflictName(pendingOperation: CommanderTransferPendingOperation) {
  return pendingOperation.conflictEntryNames[0] ?? null
}

/** Applies one copy or move request for the provided transfer entries. */
export function applyPendingTransferOperation(
  widgetId: string,
  pendingOperation: CommanderTransferPendingOperation,
  entryIds: string[],
  overwrite: boolean,
) {
  if (entryIds.length === 0) {
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

/** Removes one resolved transfer entry from the pending conflict queue. */
export function removePendingTransferEntry(
  pendingOperation: CommanderTransferPendingOperation,
  entryName: string,
): CommanderTransferPendingOperation {
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
    conflictEntryNames: pendingOperation.conflictEntryNames.filter(
      (candidateName) => candidateName !== entryName,
    ),
  }
}

/** Applies the remaining non-conflicting transfer entries and clears the pending state. */
export function finalizePendingTransferOperation(
  widgetState: CommanderWidgetRuntimeState,
  widgetId: string,
  pendingOperation: CommanderTransferPendingOperation,
) {
  applyPendingTransferOperation(widgetId, pendingOperation, pendingOperation.entryIds, false)

  return refreshWidgetPanes(widgetState, {
    pendingOperation: null,
  })
}

/** Recomputes input-driven pending-operation state such as rename previews and search matches. */
export function updateCommanderPendingOperationInput(
  widgetState: CommanderWidgetRuntimeState,
  widgetId: string,
  inputValue: string,
  deps: CommanderPendingOperationInputDeps = defaultCommanderPendingOperationInputDeps,
) {
  const pendingOperation = widgetState.pendingOperation

  if (!pendingOperation) {
    return null
  }

  switch (pendingOperation.kind) {
    case 'copy': {
      if (pendingOperation.transferMode !== 'clone') {
        return null
      }

      const sourcePane = getPaneState(widgetState, pendingOperation.sourcePaneId)
      const nextName = inputValue.trim()
      const hasConflict =
        nextName.length > 0 &&
        nextName !== pendingOperation.entryNames[0] &&
        deps.getCommanderEntryNameConflict(sourcePane, nextName, pendingOperation.entryIds[0])

      return {
        ...widgetState,
        pendingOperation: {
          ...pendingOperation,
          inputValue,
          conflictEntryNames: hasConflict ? [nextName] : [],
        },
      }
    }
    case 'mkdir':
      return {
        ...widgetState,
        pendingOperation: {
          ...pendingOperation,
          inputValue,
        },
      }
    case 'select':
    case 'unselect': {
      const matches = deps.getCommanderMaskMatches(
        getPaneState(widgetState, pendingOperation.sourcePaneId),
        inputValue,
      )

      return {
        ...widgetState,
        pendingOperation: {
          ...pendingOperation,
          inputValue,
          matchCount: matches.entryIds.length,
          matchPreview: matches.entryNames.slice(0, 6),
        },
      }
    }
    case 'filter': {
      const matches = deps.getCommanderFilterMatches(widgetState, pendingOperation.sourcePaneId, inputValue)

      return {
        ...widgetState,
        pendingOperation: {
          ...pendingOperation,
          inputValue,
          matchCount: matches.entryIds.length,
          matchPreview: matches.entryNames.slice(0, 6),
        },
      }
    }
    case 'search': {
      const sourcePane = getPaneState(widgetState, pendingOperation.sourcePaneId)
      const matches = deps.getCommanderSearchMatches(sourcePane, inputValue)

      return {
        ...widgetState,
        pendingOperation: {
          ...pendingOperation,
          inputValue,
          matchCount: matches.entryIds.length,
          matchPreview: matches.entryNames.slice(0, 6),
          matchIndex: deps.getCommanderResolvedSearchMatchIndex(
            matches.entryIds,
            sourcePane.cursorEntryId,
            0,
          ),
        },
      }
    }
    case 'rename': {
      const renamePreview = deps.previewCommanderRenameEntries(
        getPaneState(widgetState, pendingOperation.sourcePaneId),
        pendingOperation.entryIds,
        inputValue,
      )

      return {
        ...widgetState,
        pendingOperation: {
          ...pendingOperation,
          inputValue,
          conflictEntryNames: renamePreview.conflictEntryNames,
          duplicateTargetNames: renamePreview.duplicateTargetNames,
          renamePreview: renamePreview.preview,
        },
      }
    }
    default:
      return null
  }
}

/** Opens a pending operation when the active pane has enough context to support it. */
export function requestCommanderWidgetPendingOperation(
  widgetState: CommanderWidgetRuntimeState,
  kind: CommanderPendingOperationKind,
  deps: CommanderPendingOperationRequestDeps = defaultCommanderPendingOperationRequestDeps,
) {
  const pendingOperation = deps.createPendingOperation(widgetState, kind)

  if (!pendingOperation) {
    return null
  }

  return {
    ...widgetState,
    pendingOperation,
  }
}

/** Advances the quick-search cursor to the next or previous visible match. */
export function stepCommanderWidgetPendingSearchMatch(
  widgetState: CommanderWidgetRuntimeState,
  delta: 1 | -1,
  deps: CommanderPendingSearchStepDeps = defaultCommanderPendingSearchStepDeps,
) {
  const pendingOperation = widgetState.pendingOperation

  if (!pendingOperation || pendingOperation.kind !== 'search') {
    return null
  }

  const sourcePane = deps.getPaneState(widgetState, pendingOperation.sourcePaneId)
  const matches = deps.getCommanderSearchMatches(sourcePane, pendingOperation.inputValue)

  if (matches.entryIds.length === 0) {
    return null
  }

  const currentIndex = deps.getCommanderResolvedSearchMatchIndex(
    matches.entryIds,
    sourcePane.cursorEntryId,
    pendingOperation.matchIndex,
  )
  const nextIndex = (currentIndex + delta + matches.entryIds.length) % matches.entryIds.length
  const nextCursorEntryId = matches.entryIds[nextIndex] ?? null

  if (!nextCursorEntryId) {
    return null
  }

  const nextWidgetState = deps.updatePaneState(widgetState, pendingOperation.sourcePaneId, (paneState) => ({
    ...paneState,
    cursorEntryId: nextCursorEntryId,
    selectionAnchorEntryId: nextCursorEntryId,
  }))

  return {
    ...nextWidgetState,
    pendingOperation: {
      ...nextWidgetState.pendingOperation!,
      matchCount: matches.entryIds.length,
      matchPreview: matches.entryNames.slice(0, 6),
      matchIndex: nextIndex,
    },
  }
}

/** Confirms the current pending operation and applies the corresponding fake-client mutation. */
export function confirmCommanderWidgetPendingOperation(
  widgetState: CommanderWidgetRuntimeState,
  widgetId: string,
  deps: CommanderPendingOperationConfirmDeps = defaultCommanderPendingOperationConfirmDeps,
) {
  const pendingOperation = widgetState.pendingOperation

  if (!pendingOperation) {
    return null
  }

  if (pendingOperation.kind === 'copy') {
    if (pendingOperation.conflictEntryNames.length > 0) {
      return null
    }

    deps.copyCommanderEntries({
      widgetId,
      path: pendingOperation.sourcePath,
      targetPath: pendingOperation.targetPath,
      entryIds: pendingOperation.entryIds,
      overwrite: false,
    })

    return deps.refreshWidgetPanes(widgetState, {
      pendingOperation: null,
    })
  }

  if (pendingOperation.kind === 'move') {
    if (pendingOperation.conflictEntryNames.length > 0) {
      return null
    }

    deps.moveCommanderEntries({
      widgetId,
      path: pendingOperation.sourcePath,
      targetPath: pendingOperation.targetPath,
      entryIds: pendingOperation.entryIds,
      overwrite: false,
    })

    return deps.refreshWidgetPanes(widgetState, {
      pendingOperation: null,
    })
  }

  if (pendingOperation.kind === 'delete') {
    deps.deleteCommanderEntries({
      widgetId,
      path: pendingOperation.sourcePath,
      entryIds: pendingOperation.entryIds,
    })

    return deps.refreshWidgetPanes(widgetState, {
      pendingOperation: null,
    })
  }

  if (pendingOperation.kind === 'mkdir') {
    const mkdirResult = deps.mkdirCommanderDirectory(widgetId, pendingOperation.sourcePath)

    return deps.refreshWidgetPanes(widgetState, {
      pendingOperation: null,
      [pendingOperation.sourcePaneId === 'left' ? 'leftPane' : 'rightPane']: {
        cursorEntryId: mkdirResult.entryId,
        selectedIds: [],
      },
    })
  }

  if (pendingOperation.kind === 'rename') {
    const nextName = pendingOperation.inputValue.trim()

    if (!nextName) {
      return null
    }

    if (pendingOperation.renameMode === 'batch') {
      const renamePreview = deps.previewCommanderRenameEntries(
        deps.getPaneState(widgetState, pendingOperation.sourcePaneId),
        pendingOperation.entryIds,
        nextName,
      )

      if (renamePreview.duplicateTargetNames.length > 0) {
        return {
          ...widgetState,
          pendingOperation: {
            ...pendingOperation,
            duplicateTargetNames: renamePreview.duplicateTargetNames,
            conflictEntryNames: renamePreview.conflictEntryNames,
            renamePreview: renamePreview.preview,
          },
        }
      }

      if (pendingOperation.conflictEntryNames.length === 0 && renamePreview.conflictEntryNames.length > 0) {
        return {
          ...widgetState,
          pendingOperation: {
            ...pendingOperation,
            conflictEntryNames: renamePreview.conflictEntryNames,
            duplicateTargetNames: renamePreview.duplicateTargetNames,
            renamePreview: renamePreview.preview,
          },
        }
      }

      const renameResult = deps.renameCommanderEntries({
        widgetId,
        path: pendingOperation.sourcePath,
        entryIds: pendingOperation.entryIds,
        template: nextName,
        overwrite: pendingOperation.conflictEntryNames.length > 0,
      })

      if (!renameResult) {
        return null
      }

      return deps.refreshWidgetPanes(widgetState, {
        pendingOperation: null,
        [pendingOperation.sourcePaneId === 'left' ? 'leftPane' : 'rightPane']: {
          cursorEntryId: renameResult.entryIds[0] ?? null,
          selectedIds: [],
          selectionAnchorEntryId: renameResult.entryIds[0] ?? null,
        },
      })
    }

    const entryId = pendingOperation.entryIds[0]

    if (!entryId) {
      return null
    }

    if (
      pendingOperation.conflictEntryNames.length === 0 &&
      deps.getCommanderEntryNameConflict(
        deps.getPaneState(widgetState, pendingOperation.sourcePaneId),
        nextName,
        entryId,
      )
    ) {
      return {
        ...widgetState,
        pendingOperation: {
          ...pendingOperation,
          conflictEntryNames: [nextName],
        },
      }
    }

    const renameResult = deps.renameCommanderEntry({
      widgetId,
      path: pendingOperation.sourcePath,
      entryId,
      nextName,
      overwrite: pendingOperation.conflictEntryNames.length > 0,
    })

    if (!renameResult) {
      return null
    }

    return deps.refreshWidgetPanes(widgetState, {
      pendingOperation: null,
      [pendingOperation.sourcePaneId === 'left' ? 'leftPane' : 'rightPane']: {
        cursorEntryId: renameResult.entryId,
        selectedIds: [],
        selectionAnchorEntryId: renameResult.entryId,
      },
    })
  }

  if (pendingOperation.kind === 'select' || pendingOperation.kind === 'unselect') {
    const mask = pendingOperation.inputValue.trim()
    const selectionMode: 'select' | 'unselect' = pendingOperation.kind

    return deps.updatePaneState(
      {
        ...widgetState,
        pendingOperation: null,
      },
      pendingOperation.sourcePaneId,
      (paneState) => deps.applySelectionMaskToPane(paneState, mask, selectionMode),
    )
  }

  if (pendingOperation.kind === 'filter') {
    const filterQuery = pendingOperation.inputValue.trim()

    return deps.updatePaneState(
      {
        ...widgetState,
        pendingOperation: null,
      },
      pendingOperation.sourcePaneId,
      (paneState) =>
        deps.rebuildPaneState(widgetState, {
          ...paneState,
          filterQuery,
        }),
    )
  }

  if (pendingOperation.kind === 'search') {
    const sourcePane = deps.getPaneState(widgetState, pendingOperation.sourcePaneId)
    const matches = deps.getCommanderSearchMatches(sourcePane, pendingOperation.inputValue)
    const resolvedMatchIndex = deps.getCommanderResolvedSearchMatchIndex(
      matches.entryIds,
      sourcePane.cursorEntryId,
      pendingOperation.matchIndex ?? 0,
    )
    const nextCursorEntryId =
      resolvedMatchIndex === -1 ? null : (matches.entryIds[resolvedMatchIndex] ?? null)

    return deps.updatePaneState(
      {
        ...widgetState,
        pendingOperation: null,
      },
      pendingOperation.sourcePaneId,
      (paneState) =>
        nextCursorEntryId
          ? {
              ...paneState,
              cursorEntryId: nextCursorEntryId,
              selectionAnchorEntryId: nextCursorEntryId,
            }
          : paneState,
    )
  }

  return {
    ...widgetState,
    pendingOperation: null,
  }
}

/** Resolves the current transfer conflict branch with overwrite or skip semantics. */
export function resolveCommanderWidgetPendingConflict(
  widgetState: CommanderWidgetRuntimeState,
  widgetId: string,
  resolution: CommanderPendingConflictResolution,
  deps: CommanderPendingConflictResolutionDeps = defaultCommanderPendingConflictResolutionDeps,
) {
  const pendingOperation = widgetState.pendingOperation

  if (!pendingOperation || (pendingOperation.kind !== 'copy' && pendingOperation.kind !== 'move')) {
    return null
  }

  const currentConflictName = deps.getCurrentPendingConflictName(pendingOperation)

  if (!currentConflictName && resolution !== 'overwrite-all' && resolution !== 'skip-all') {
    return null
  }

  if (resolution === 'overwrite-all') {
    deps.applyPendingTransferOperation(widgetId, pendingOperation, pendingOperation.entryIds, true)

    return deps.refreshWidgetPanes(widgetState, {
      pendingOperation: null,
    })
  }

  if (resolution === 'skip-all') {
    const conflictEntryNameSet = new Set(pendingOperation.conflictEntryNames)
    const nonConflictingEntryIds = pendingOperation.entryIds.filter(
      (_entryId, index) => !conflictEntryNameSet.has(pendingOperation.entryNames[index] ?? ''),
    )

    deps.applyPendingTransferOperation(widgetId, pendingOperation, nonConflictingEntryIds, false)

    return deps.refreshWidgetPanes(widgetState, {
      pendingOperation: null,
    })
  }

  if (!currentConflictName) {
    return null
  }

  const currentConflictIndex = pendingOperation.entryNames.findIndex(
    (entryName) => entryName === currentConflictName,
  )
  const currentConflictEntryId =
    currentConflictIndex === -1 ? null : (pendingOperation.entryIds[currentConflictIndex] ?? null)

  if (resolution === 'overwrite-current' && currentConflictEntryId) {
    deps.applyPendingTransferOperation(widgetId, pendingOperation, [currentConflictEntryId], true)
  }

  const nextPendingOperation = deps.removePendingTransferEntry(pendingOperation, currentConflictName)

  if (nextPendingOperation.conflictEntryNames.length > 0) {
    return deps.refreshWidgetPanes(widgetState, {
      pendingOperation: nextPendingOperation,
    })
  }

  return deps.finalizePendingTransferOperation(widgetState, widgetId, nextPendingOperation)
}

/** Builds the pending-operation payload for the current active pane and requested command kind. */
export function createPendingOperation(
  widgetState: CommanderWidgetRuntimeState,
  kind: CommanderPendingOperationKind,
) {
  const sourcePane = getPaneState(widgetState, widgetState.activePane)
  const entryIds = getOperationEntryIds(sourcePane)

  if (
    kind !== 'mkdir' &&
    kind !== 'select' &&
    kind !== 'unselect' &&
    kind !== 'filter' &&
    kind !== 'search' &&
    entryIds.length === 0
  ) {
    return null
  }

  if (kind === 'mkdir') {
    return {
      kind,
      sourcePaneId: widgetState.activePane,
      sourcePath: sourcePane.path,
      entryIds: [],
      entryNames: [],
      inputValue: 'New folder',
    } satisfies CommanderPendingOperation
  }

  if (kind === 'select' || kind === 'unselect') {
    const matches = getCommanderMaskMatches(sourcePane, '*')

    return {
      kind,
      sourcePaneId: widgetState.activePane,
      sourcePath: sourcePane.path,
      entryIds: [],
      entryNames: [],
      inputValue: '*',
      matchCount: matches.entryIds.length,
      matchPreview: matches.entryNames.slice(0, 6),
    } satisfies CommanderPendingOperation
  }

  if (kind === 'filter') {
    const filterQuery = sourcePane.filterQuery
    const matches = getCommanderFilterMatches(widgetState, widgetState.activePane, filterQuery)

    return {
      kind,
      sourcePaneId: widgetState.activePane,
      sourcePath: sourcePane.path,
      entryIds: [],
      entryNames: [],
      inputValue: filterQuery,
      matchCount: matches.entryIds.length,
      matchPreview: matches.entryNames.slice(0, 6),
    } satisfies CommanderPendingOperation
  }

  if (kind === 'search') {
    const matches = getCommanderSearchMatches(sourcePane, '')

    return {
      kind,
      sourcePaneId: widgetState.activePane,
      sourcePath: sourcePane.path,
      entryIds: [],
      entryNames: [],
      inputValue: '',
      matchCount: matches.entryIds.length,
      matchPreview: matches.entryNames.slice(0, 6),
      matchIndex: getCommanderResolvedSearchMatchIndex(matches.entryIds, sourcePane.cursorEntryId),
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
        conflictEntryNames: [],
        duplicateTargetNames: [],
        renameMode: 'single',
        renamePreview: [
          {
            entryId: currentEntry.id,
            currentName: currentEntry.name,
            nextName: currentEntry.name,
            status: 'ok',
            conflict: false,
          },
        ],
      } satisfies CommanderPendingOperation
    }

    const renamePreview = previewCommanderRenameEntries(
      sourcePane,
      renameEntries.map((entry) => entry.id),
      '[N]-[C:2]',
    )

    return {
      kind,
      sourcePaneId: widgetState.activePane,
      sourcePath: sourcePane.path,
      entryIds: renameEntries.map((entry) => entry.id),
      entryNames: renameEntries.map((entry) => entry.name),
      inputValue: '[N]-[C:2]',
      conflictEntryNames: renamePreview.conflictEntryNames,
      duplicateTargetNames: renamePreview.duplicateTargetNames,
      renameMode: 'batch',
      renamePreview: renamePreview.preview,
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

  if (kind === 'copy' && sourcePane.path === targetPane.path) {
    if (entryIds.length !== 1) {
      return null
    }

    const cloneName = suggestCommanderCloneName(sourcePane, entryIds[0])

    if (!cloneName) {
      return null
    }

    return {
      kind,
      sourcePaneId: widgetState.activePane,
      sourcePath: sourcePane.path,
      targetPaneId: widgetState.activePane,
      targetPath: sourcePane.path,
      entryIds,
      entryNames,
      inputValue: cloneName,
      conflictEntryNames: [],
      transferMode: 'clone',
    } satisfies CommanderPendingOperation
  }

  if (sourcePane.path === targetPane.path) {
    return null
  }

  const conflictEntryNames = getCommanderConflictingEntryNames(widgetState, widgetState.activePane, entryIds)

  return {
    kind,
    sourcePaneId: widgetState.activePane,
    sourcePath: sourcePane.path,
    targetPaneId,
    targetPath: targetPane.path,
    entryIds,
    entryNames,
    conflictEntryNames,
    transferMode: 'pane',
  } satisfies CommanderPendingOperation
}

/** Legacy helper that opens the focused file from fake-client-backed content. */
export function createCommanderFileDialog(
  widgetState: CommanderWidgetRuntimeState,
  paneId: CommanderPaneId,
  mode: 'view' | 'edit',
) {
  const paneState = getPaneState(widgetState, paneId)
  const entryId = paneState.cursorEntryId

  if (!entryId) {
    return null
  }

  const fileSnapshot = readCommanderFile(widgetState.widgetId, paneState.path, entryId)

  if (!fileSnapshot) {
    return null
  }

  return {
    paneId,
    path: paneState.path,
    entryId: fileSnapshot.entryId,
    entryName: fileSnapshot.entryName,
    mode,
    content: fileSnapshot.content,
    draftValue: fileSnapshot.content,
  } satisfies CommanderFileDialogState
}
