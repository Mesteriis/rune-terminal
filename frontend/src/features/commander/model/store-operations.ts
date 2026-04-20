import {
  copyCommanderEntries,
  getCommanderConflictingEntryNames,
  moveCommanderEntries,
  readCommanderFile,
  previewCommanderRenameEntries,
} from '@/features/commander/model/fake-client'
import type {
  CommanderFileDialogState,
  CommanderPendingOperation,
  CommanderPaneId,
  CommanderPaneRuntimeState,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'
import { getPaneState, refreshWidgetPanes } from '@/features/commander/model/store-navigation'
import {
  getCommanderFilterMatches,
  getCommanderMaskMatches,
  getCommanderResolvedSearchMatchIndex,
  getCommanderSearchMatches,
} from '@/features/commander/model/store-selection'

type CommanderPendingOperationInputDeps = {
  getCommanderMaskMatches: typeof getCommanderMaskMatches
  getCommanderFilterMatches: typeof getCommanderFilterMatches
  getCommanderSearchMatches: typeof getCommanderSearchMatches
  getCommanderResolvedSearchMatchIndex: typeof getCommanderResolvedSearchMatchIndex
  previewCommanderRenameEntries: typeof previewCommanderRenameEntries
}

const defaultCommanderPendingOperationInputDeps: CommanderPendingOperationInputDeps = {
  getCommanderMaskMatches,
  getCommanderFilterMatches,
  getCommanderSearchMatches,
  getCommanderResolvedSearchMatchIndex,
  previewCommanderRenameEntries,
}

export function getOperationEntryIds(paneState: CommanderPaneRuntimeState) {
  if (paneState.selectedIds.length > 0) {
    return paneState.selectedIds
  }

  return paneState.cursorEntryId ? [paneState.cursorEntryId] : []
}

export function getCurrentPendingConflictName(pendingOperation: CommanderPendingOperation) {
  if (pendingOperation.kind !== 'copy' && pendingOperation.kind !== 'move') {
    return null
  }

  return pendingOperation.conflictEntryNames?.[0] ?? null
}

export function applyPendingTransferOperation(
  widgetId: string,
  pendingOperation: CommanderPendingOperation,
  entryIds: string[],
  overwrite: boolean,
) {
  if (
    (pendingOperation.kind !== 'copy' && pendingOperation.kind !== 'move') ||
    !pendingOperation.targetPath ||
    entryIds.length === 0
  ) {
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

export function removePendingTransferEntry(pendingOperation: CommanderPendingOperation, entryName: string) {
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
    conflictEntryNames: (pendingOperation.conflictEntryNames ?? []).filter(
      (candidateName) => candidateName !== entryName,
    ),
  }
}

export function finalizePendingTransferOperation(
  widgetState: CommanderWidgetRuntimeState,
  widgetId: string,
  pendingOperation: CommanderPendingOperation,
) {
  applyPendingTransferOperation(widgetId, pendingOperation, pendingOperation.entryIds, false)

  return refreshWidgetPanes(widgetState, {
    pendingOperation: null,
  })
}

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

  if (pendingOperation.kind === 'select' || pendingOperation.kind === 'unselect') {
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

  if (pendingOperation.kind === 'filter') {
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

  if (pendingOperation.kind === 'search') {
    const sourcePane = getPaneState(widgetState, pendingOperation.sourcePaneId)
    const matches = deps.getCommanderSearchMatches(sourcePane, inputValue)

    return {
      ...widgetState,
      pendingOperation: {
        ...pendingOperation,
        inputValue,
        matchCount: matches.entryIds.length,
        matchPreview: matches.entryNames.slice(0, 6),
        matchIndex: deps.getCommanderResolvedSearchMatchIndex(matches.entryIds, sourcePane.cursorEntryId, 0),
      },
    }
  }

  if (pendingOperation.kind !== 'rename') {
    return {
      ...widgetState,
      pendingOperation: {
        ...pendingOperation,
        inputValue,
        conflictEntryNames: undefined,
      },
    }
  }

  const renamePreview = deps.previewCommanderRenameEntries({
    widgetId,
    path: pendingOperation.sourcePath,
    entryIds: pendingOperation.entryIds,
    template: inputValue,
  })

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

export function createPendingOperation(
  widgetState: CommanderWidgetRuntimeState,
  kind: CommanderPendingOperation['kind'],
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
      mkdirName: 'New folder',
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
