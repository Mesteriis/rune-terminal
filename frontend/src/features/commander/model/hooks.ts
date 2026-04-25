import { useUnit } from 'effector-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  CommanderAPIError,
  copyCommanderEntries,
  copyCommanderEntriesToPaths,
  deleteCommanderEntries,
  listCommanderDirectory,
  mkdirCommanderDirectory,
  moveCommanderEntries,
  openCommanderFileExternally,
  readCommanderFile,
  readCommanderFilePreview,
  renameCommanderEntries,
  toCommanderEntryPath,
  writeCommanderFile,
} from '@/features/commander/api/client'
import { createCommanderWidgetRuntimeState } from '@/features/commander/model/pane-state'
import { readPersistedCommanderWidget } from '@/features/commander/model/persistence'
import {
  getCurrentPendingConflictName,
  removePendingTransferEntry,
} from '@/features/commander/model/store-operations'
import {
  $commanderWidgets,
  cancelCommanderPendingOperation,
  clearCommanderActivePaneFilter,
  closeCommanderFileDialog,
  confirmCommanderPendingOperation,
  hydrateCommanderPaneDirectory,
  invertCommanderActivePaneSelection,
  mountCommanderWidget,
  moveCommanderActivePaneCursor,
  requestCommanderActivePaneCopy,
  requestCommanderActivePaneDelete,
  requestCommanderActivePaneFilter,
  requestCommanderActivePaneMkdir,
  requestCommanderActivePaneMove,
  requestCommanderActivePaneRename,
  requestCommanderActivePaneSearch,
  requestCommanderActivePaneSelectByMask,
  requestCommanderActivePaneUnselectByMask,
  resolveCommanderPendingConflict,
  setCommanderActivePane,
  setCommanderFileDialog,
  setCommanderFileDialogDraft,
  setCommanderPaneBoundaryCursor,
  setCommanderPaneCursor,
  setCommanderPaneLoadError,
  setCommanderPaneLoading,
  setCommanderPendingOperation,
  setCommanderPendingOperationInput,
  setCommanderPaneFilterQuery,
  setCommanderSortMode,
  setCommanderViewMode,
  stepCommanderPendingSearchMatch,
  switchCommanderActivePane,
  toggleCommanderActivePaneSelection,
  toggleCommanderDirsFirst,
  toggleCommanderPaneSelection,
  toggleCommanderShowHidden,
} from '@/features/commander/model/store'
import type {
  CommanderFileSnapshot,
  CommanderFileDialogState,
  CommanderPendingOperation,
  CommanderPaneId,
  CommanderPaneRuntimeState,
  CommanderPaneViewState,
  CommanderSortMode,
  CommanderTransferPendingOperation,
  CommanderViewMode,
  CommanderWidgetRuntimeState,
  CommanderWidgetViewState,
} from '@/features/commander/model/types'
import {
  formatRuntimePathForDisplay,
  getRuntimePathParent,
  resolveRuntimeContext,
  resolveRuntimePathInput,
  type RuntimeContext,
} from '@/shared/api/runtime'

function formatSelectedSize(totalBytes: number) {
  if (totalBytes <= 0) {
    return '0 B'
  }

  if (totalBytes < 1024) {
    return `${totalBytes} B`
  }

  if (totalBytes < 1024 * 1024) {
    return `${(totalBytes / 1024).toFixed(1)} KB`
  }

  return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
}

function getCommanderSelectedSize(entries: CommanderPaneRuntimeState['entries'], selectedIds: string[]) {
  const totalBytes = entries
    .filter((entry) => selectedIds.includes(entry.id))
    .reduce((currentTotal, entry) => currentTotal + (entry.sizeBytes ?? 0), 0)

  return formatSelectedSize(totalBytes)
}

function toPaneViewState(
  widgetState: CommanderWidgetRuntimeState,
  paneState: CommanderPaneRuntimeState,
  runtimeContext: RuntimeContext | null,
): CommanderPaneViewState {
  return {
    id: paneState.id,
    path: paneState.path,
    displayPath: runtimeContext
      ? formatRuntimePathForDisplay(paneState.path, runtimeContext)
      : paneState.path,
    filterQuery: paneState.filterQuery,
    canGoBack: paneState.historyBack.length > 0,
    canGoForward: paneState.historyForward.length > 0,
    isLoading: paneState.isLoading,
    errorMessage: paneState.errorMessage,
    counters: {
      items: paneState.entries.length,
      selectedItems: paneState.selectedIds.length,
      selectedSize: getCommanderSelectedSize(paneState.entries, paneState.selectedIds),
    },
    rows: paneState.entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      ext: entry.ext,
      kind: entry.kind,
      size: entry.sizeLabel,
      modified: entry.modified,
      hidden: entry.hidden,
      selected: paneState.selectedIds.includes(entry.id),
      focused: widgetState.activePane === paneState.id && paneState.cursorEntryId === entry.id,
      gitStatus: entry.gitStatus,
      executable: entry.executable,
      symlinkTarget: entry.symlinkTarget,
    })),
  }
}

function toWidgetViewState(
  widgetState: CommanderWidgetRuntimeState,
  runtimeContext: RuntimeContext | null,
): CommanderWidgetViewState {
  return {
    mode: 'commander',
    viewMode: widgetState.viewMode,
    activePane: widgetState.activePane,
    showHidden: widgetState.showHidden,
    syncCwd: false,
    sortMode: widgetState.sortMode,
    sortDirection: widgetState.sortDirection,
    dirsFirst: widgetState.dirsFirst,
    footerHints: widgetState.footerHints,
    pendingOperation: widgetState.pendingOperation,
    fileDialog: widgetState.fileDialog,
    leftPane: toPaneViewState(widgetState, widgetState.leftPane, runtimeContext),
    rightPane: toPaneViewState(widgetState, widgetState.rightPane, runtimeContext),
  }
}

function toLoadErrorMessage(error: unknown) {
  if (error instanceof CommanderAPIError) {
    switch (error.code) {
      case 'fs_path_exists':
        return 'Path already exists'
      case 'fs_path_outside_workspace':
        return 'Path is outside the workspace root'
      case 'fs_path_not_found':
        return 'Path not found'
      case 'invalid_fs_path':
        return 'Invalid path'
      case 'invalid_fs_name':
        return 'Invalid entry name'
      case 'invalid_fs_target':
        return 'Invalid target path'
      case 'invalid_fs_directory':
        return 'Target path is not a directory'
      case 'invalid_fs_text':
        return 'File is not UTF-8 text'
      default:
        break
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Unable to load commander data'
}

function hasSinglePathSegment(inputValue: string) {
  const trimmedValue = inputValue.trim()

  if (!trimmedValue || trimmedValue === '.' || trimmedValue === '..') {
    return false
  }

  return !/[\\/]/.test(trimmedValue)
}

function resolveDefaultPanePaths(runtimeContext: RuntimeContext, runtimeState: CommanderWidgetRuntimeState) {
  const leftPath = runtimeState.leftPane.path || runtimeContext.repoRoot
  const rightPath = runtimeState.rightPane.path || runtimeContext.repoRoot

  return { leftPath, rightPath }
}

function getRuntimePaneState(runtimeState: CommanderWidgetRuntimeState, paneId: CommanderPaneId) {
  return paneId === 'left' ? runtimeState.leftPane : runtimeState.rightPane
}

function isCloneCopyOperation(
  pendingOperation: CommanderTransferPendingOperation,
): pendingOperation is CommanderTransferPendingOperation & {
  inputValue: string
  kind: 'copy'
  transferMode: 'clone'
} {
  return pendingOperation.kind === 'copy' && pendingOperation.transferMode === 'clone'
}

function toEntryIdFromPath(path: string) {
  const normalizedPath = path.replace(/\\/g, '/').replace(/\/+$/g, '') || '/'
  const parentPath = getRuntimePathParent(normalizedPath) ?? '/'
  const entryName = normalizedPath.split('/').pop() ?? normalizedPath

  return `${parentPath}::${entryName}`
}

function toEntryIdsFromPaths(directoryPath: string, paths: string[]) {
  return paths
    .filter((path) => (getRuntimePathParent(path) ?? '/') === directoryPath)
    .map((path) => toEntryIdFromPath(path))
}

/** Returns the widget-scoped commander view model plus the smallest action surface needed by the widget shell. */
export function useCommanderWidget(widgetId: string) {
  const [
    commanderWidgets,
    onMountCommanderWidget,
    onSetCommanderActivePane,
    onToggleCommanderShowHidden,
    onSetCommanderViewMode,
    onSetCommanderPaneCursor,
    onToggleCommanderPaneSelection,
    onHydrateCommanderPaneDirectory,
    onSetCommanderPaneLoadError,
    onSetCommanderPaneLoading,
    onSetCommanderFileDialog,
    onMoveCommanderActivePaneCursor,
    onToggleCommanderActivePaneSelection,
    onRequestCommanderActivePaneCopy,
    onRequestCommanderActivePaneDelete,
    onRequestCommanderActivePaneSelectByMask,
    onRequestCommanderActivePaneUnselectByMask,
    onRequestCommanderActivePaneFilter,
    onRequestCommanderActivePaneMkdir,
    onRequestCommanderActivePaneMove,
    onRequestCommanderActivePaneRename,
    onRequestCommanderActivePaneSearch,
    onStepCommanderPendingSearchMatch,
    onToggleCommanderDirsFirst,
    onConfirmCommanderPendingOperation,
    onCancelCommanderPendingOperation,
    onClearCommanderActivePaneFilter,
    onResolveCommanderPendingConflict,
    onSetCommanderFileDialogDraft,
    onCloseCommanderFileDialog,
    onSwitchCommanderActivePane,
    onSetCommanderPaneBoundaryCursor,
    onSetCommanderSortMode,
    onSetCommanderPendingOperation,
    onSetCommanderPendingOperationInput,
    onSetCommanderPaneFilterQuery,
    onInvertCommanderActivePaneSelection,
  ] = useUnit([
    $commanderWidgets,
    mountCommanderWidget,
    setCommanderActivePane,
    toggleCommanderShowHidden,
    setCommanderViewMode,
    setCommanderPaneCursor,
    toggleCommanderPaneSelection,
    hydrateCommanderPaneDirectory,
    setCommanderPaneLoadError,
    setCommanderPaneLoading,
    setCommanderFileDialog,
    moveCommanderActivePaneCursor,
    toggleCommanderActivePaneSelection,
    requestCommanderActivePaneCopy,
    requestCommanderActivePaneDelete,
    requestCommanderActivePaneSelectByMask,
    requestCommanderActivePaneUnselectByMask,
    requestCommanderActivePaneFilter,
    requestCommanderActivePaneMkdir,
    requestCommanderActivePaneMove,
    requestCommanderActivePaneRename,
    requestCommanderActivePaneSearch,
    stepCommanderPendingSearchMatch,
    toggleCommanderDirsFirst,
    confirmCommanderPendingOperation,
    cancelCommanderPendingOperation,
    clearCommanderActivePaneFilter,
    resolveCommanderPendingConflict,
    setCommanderFileDialogDraft,
    closeCommanderFileDialog,
    switchCommanderActivePane,
    setCommanderPaneBoundaryCursor,
    setCommanderSortMode,
    setCommanderPendingOperation,
    setCommanderPendingOperationInput,
    setCommanderPaneFilterQuery,
    invertCommanderActivePaneSelection,
  ])

  const persistedWidget = useMemo(() => readPersistedCommanderWidget(widgetId), [widgetId])
  const bootstrapRuntimeState = useMemo(
    () => createCommanderWidgetRuntimeState(widgetId, persistedWidget?.runtime),
    [persistedWidget, widgetId],
  )
  const runtimeState = commanderWidgets[widgetId] ?? bootstrapRuntimeState
  const [runtimeContext, setRuntimeContext] = useState<RuntimeContext | null>(null)
  const paneRequestIdsRef = useRef<Record<CommanderPaneId, number>>({
    left: 0,
    right: 0,
  })
  const fileRequestIdRef = useRef(0)
  const mutationRequestInFlightRef = useRef(false)
  const hasLoadedInitialBackendStateRef = useRef(false)

  useEffect(() => {
    onMountCommanderWidget({
      widgetId,
      persistedWidget,
    })
  }, [onMountCommanderWidget, persistedWidget, widgetId])

  useEffect(() => {
    let isCancelled = false

    resolveRuntimeContext()
      .then((context) => {
        if (isCancelled) {
          return
        }

        setRuntimeContext(context)
      })
      .catch((error) => {
        if (isCancelled) {
          return
        }

        const errorMessage = toLoadErrorMessage(error)
        onSetCommanderPaneLoadError({ widgetId, paneId: 'left', errorMessage })
        onSetCommanderPaneLoadError({ widgetId, paneId: 'right', errorMessage })
      })

    return () => {
      isCancelled = true
    }
  }, [onSetCommanderPaneLoadError, widgetId])

  const loadPaneDirectory = useCallback(
    async (
      paneId: CommanderPaneId,
      path: string,
      historyMode: 'back' | 'forward' | 'push' | 'replace' = 'replace',
      options?: {
        cursorEntryId?: string | null
        filterQuery?: string
        selectedIds?: string[]
        selectionAnchorEntryId?: string | null
      },
    ) => {
      const context = runtimeContext

      if (!context) {
        return
      }

      paneRequestIdsRef.current[paneId] += 1
      const requestId = paneRequestIdsRef.current[paneId]

      onSetCommanderPaneLoading({ widgetId, paneId, path })

      try {
        const paneState = getRuntimePaneState(runtimeState, paneId)
        const filterQuery = options?.filterQuery ?? paneState.filterQuery
        const snapshot = await listCommanderDirectory(path, {
          query: filterQuery,
        })

        if (paneRequestIdsRef.current[paneId] !== requestId) {
          return
        }

        onHydrateCommanderPaneDirectory({
          widgetId,
          paneId,
          path: snapshot.path,
          filterQuery,
          directoryEntries: snapshot.entries,
          cursorEntryId: options?.cursorEntryId,
          historyMode,
          selectedIds: options?.selectedIds,
          selectionAnchorEntryId: options?.selectionAnchorEntryId,
        })
      } catch (error) {
        if (paneRequestIdsRef.current[paneId] !== requestId) {
          return
        }

        onSetCommanderPaneLoadError({
          widgetId,
          paneId,
          path,
          errorMessage: toLoadErrorMessage(error),
        })
      }
    },
    [
      onHydrateCommanderPaneDirectory,
      onSetCommanderPaneLoadError,
      onSetCommanderPaneLoading,
      runtimeContext,
      runtimeState,
      widgetId,
    ],
  )

  useEffect(() => {
    if (!runtimeContext || hasLoadedInitialBackendStateRef.current) {
      return
    }

    hasLoadedInitialBackendStateRef.current = true
    const { leftPath, rightPath } = resolveDefaultPanePaths(runtimeContext, runtimeState)

    void loadPaneDirectory('left', leftPath, 'replace')
    void loadPaneDirectory('right', rightPath, 'replace')
  }, [loadPaneDirectory, runtimeContext, runtimeState])

  const setPendingOperationState = useCallback(
    (pendingOperation: CommanderPendingOperation | null) => {
      onSetCommanderPendingOperation({ widgetId, pendingOperation })
    },
    [onSetCommanderPendingOperation, widgetId],
  )

  const getEntryPaths = useCallback(
    (paneId: CommanderPaneId, entryIds: string[]) => {
      const paneState = getRuntimePaneState(runtimeState, paneId)

      return entryIds
        .map((entryId) => paneState.directoryEntries.find((entry) => entry.id === entryId) ?? null)
        .filter((entry): entry is CommanderPaneRuntimeState['directoryEntries'][number] => Boolean(entry))
        .map((entry) => toCommanderEntryPath(paneState.path, entry.name))
    },
    [runtimeState],
  )

  const reloadPaneSelection = useCallback(
    async (paneId: CommanderPaneId, path: string, entryPaths: string[]) => {
      const selectedIds = toEntryIdsFromPaths(path, entryPaths)
      const cursorEntryId = selectedIds[0] ?? null

      await loadPaneDirectory(paneId, path, 'replace', {
        cursorEntryId,
        selectedIds,
        selectionAnchorEntryId: cursorEntryId,
      })
    },
    [loadPaneDirectory],
  )

  const performTransferMutation = useCallback(
    async (pendingOperation: CommanderTransferPendingOperation, entryIds: string[], overwrite: boolean) => {
      const sourcePaths = getEntryPaths(pendingOperation.sourcePaneId, entryIds)
      if (sourcePaths.length === 0) {
        return
      }
      if (isCloneCopyOperation(pendingOperation) && !sourcePaths[0]) {
        return
      }

      const result =
        pendingOperation.kind === 'copy'
          ? isCloneCopyOperation(pendingOperation)
            ? await copyCommanderEntriesToPaths(
                pendingOperation.cloneMode === 'batch'
                  ? pendingOperation.renamePreview
                      .map((previewItem) => {
                        const sourceIndex = pendingOperation.entryIds.findIndex(
                          (entryId) => entryId === previewItem.entryId,
                        )
                        const sourcePath = sourceIndex === -1 ? null : (sourcePaths[sourceIndex] ?? null)
                        const nextName = previewItem.nextName.trim()

                        if (!sourcePath || !nextName) {
                          return null
                        }

                        return {
                          source_path: sourcePath,
                          target_path: toCommanderEntryPath(pendingOperation.sourcePath, nextName),
                        }
                      })
                      .filter(
                        (
                          entry,
                        ): entry is {
                          source_path: string
                          target_path: string
                        } => Boolean(entry),
                      )
                  : [
                      {
                        source_path: sourcePaths[0] ?? '',
                        target_path: toCommanderEntryPath(
                          pendingOperation.sourcePath,
                          pendingOperation.inputValue.trim(),
                        ),
                      },
                    ],
                { overwrite },
              )
            : await copyCommanderEntries(sourcePaths, pendingOperation.targetPath, { overwrite })
          : await moveCommanderEntries(sourcePaths, pendingOperation.targetPath, { overwrite })

      const reloads: Array<Promise<void>> = isCloneCopyOperation(pendingOperation)
        ? [reloadPaneSelection(pendingOperation.sourcePaneId, pendingOperation.sourcePath, result.paths)]
        : [reloadPaneSelection(pendingOperation.targetPaneId, pendingOperation.targetPath, result.paths)]

      if (pendingOperation.kind === 'move') {
        reloads.unshift(
          loadPaneDirectory(pendingOperation.sourcePaneId, pendingOperation.sourcePath, 'replace'),
        )
      }

      await Promise.all(reloads)
    },
    [getEntryPaths, loadPaneDirectory, reloadPaneSelection],
  )

  const handleTransferMutationError = useCallback(
    (pendingOperation: CommanderTransferPendingOperation, error: unknown) => {
      onSetCommanderPaneLoadError({
        widgetId,
        paneId: pendingOperation.targetPaneId,
        path: pendingOperation.targetPath,
        errorMessage: toLoadErrorMessage(error),
      })
    },
    [onSetCommanderPaneLoadError, widgetId],
  )

  const openFileDialogForEntry = useCallback(
    async (paneId: CommanderPaneId, entryId: string, mode: 'view' | 'edit') => {
      const paneState = paneId === 'left' ? runtimeState.leftPane : runtimeState.rightPane
      const entry = paneState.entries.find((candidateEntry) => candidateEntry.id === entryId)
      const entryPath = entry ? toCommanderEntryPath(paneState.path, entry.name) : null

      if (!entry || entry.kind !== 'file' || !entryPath) {
        return
      }

      fileRequestIdRef.current += 1
      const requestId = fileRequestIdRef.current

      try {
        const fileSnapshot =
          mode === 'edit' ? await readCommanderFile(entryPath) : await readCommanderFilePreview(entryPath)

        if (fileRequestIdRef.current !== requestId) {
          return
        }

        if (mode === 'view' && !fileSnapshot.previewAvailable) {
          onSetCommanderFileDialog({
            widgetId,
            fileDialog: {
              paneId,
              path: paneState.path,
              entryId,
              entryName: entry.name,
              mode: 'blocked',
              content: '',
              draftValue: '',
              blockedTitle: 'Preview unavailable for this file',
              blockedReason: 'File is binary or not UTF-8 text. Open it with an external tool.',
              blockedHint: 'Binary preview unavailable',
            } satisfies CommanderFileDialogState,
          })
          return
        }

        onSetCommanderFileDialog({
          widgetId,
          fileDialog: {
            paneId,
            path: fileSnapshot.path,
            entryId: fileSnapshot.entryId,
            entryName: fileSnapshot.entryName,
            mode,
            content: fileSnapshot.content,
            draftValue: fileSnapshot.content,
            previewKind: fileSnapshot.previewKind,
            previewBytes: fileSnapshot.previewBytes,
            sizeBytes: fileSnapshot.sizeBytes,
            truncated: fileSnapshot.truncated,
          } satisfies CommanderFileDialogState,
        })
      } catch (error) {
        if (mode === 'edit' && error instanceof CommanderAPIError && error.code === 'invalid_fs_text') {
          let binarySnapshot: CommanderFileSnapshot | null = null

          try {
            binarySnapshot = await readCommanderFilePreview(entryPath)
          } catch {
            binarySnapshot = null
          }

          if (fileRequestIdRef.current !== requestId) {
            return
          }

          onSetCommanderFileDialog({
            widgetId,
            fileDialog: {
              paneId,
              path: paneState.path,
              entryId,
              entryName: entry.name,
              mode: 'blocked',
              content: '',
              draftValue: '',
              blockedReason: 'File is not UTF-8 text. Use F3 for preview or open it with an external tool.',
              previewKind: binarySnapshot?.previewKind,
              previewBytes: binarySnapshot?.previewBytes,
              sizeBytes: binarySnapshot?.sizeBytes,
              truncated: binarySnapshot?.truncated,
            } satisfies CommanderFileDialogState,
          })
          return
        }

        onSetCommanderPaneLoadError({
          widgetId,
          paneId,
          errorMessage: toLoadErrorMessage(error),
        })
      }
    },
    [
      onSetCommanderFileDialog,
      onSetCommanderPaneLoadError,
      runtimeState.leftPane,
      runtimeState.rightPane,
      widgetId,
    ],
  )

  const openFilePreviewForEntry = useCallback(
    async (paneId: CommanderPaneId, entryId: string) => {
      await openFileDialogForEntry(paneId, entryId, 'view')
    },
    [openFileDialogForEntry],
  )

  const openPaneEntry = useCallback(
    (paneId: CommanderPaneId, entryId: string) => {
      const paneState = paneId === 'left' ? runtimeState.leftPane : runtimeState.rightPane
      const entry = paneState.entries.find((candidateEntry) => candidateEntry.id === entryId)

      if (!entry) {
        return
      }

      if (entry.kind === 'folder') {
        void loadPaneDirectory(paneId, toCommanderEntryPath(paneState.path, entry.name), 'push')
        return
      }

      if (entry.kind === 'file') {
        void openFilePreviewForEntry(paneId, entryId)
      }
    },
    [loadPaneDirectory, openFilePreviewForEntry, runtimeState.leftPane, runtimeState.rightPane],
  )

  const setPanePath = useCallback(
    (paneId: CommanderPaneId, pathInput: string) => {
      if (!runtimeContext) {
        return
      }

      const paneState = paneId === 'left' ? runtimeState.leftPane : runtimeState.rightPane
      const nextPath = resolveRuntimePathInput(pathInput, runtimeContext, paneState.path)

      if (!nextPath || nextPath === paneState.path) {
        return
      }

      void loadPaneDirectory(paneId, nextPath, 'push')
    },
    [loadPaneDirectory, runtimeContext, runtimeState.leftPane, runtimeState.rightPane],
  )

  const goPaneParent = useCallback(
    (paneId: CommanderPaneId) => {
      const paneState = paneId === 'left' ? runtimeState.leftPane : runtimeState.rightPane
      const parentPath = getRuntimePathParent(paneState.path)

      if (!parentPath) {
        return
      }

      void loadPaneDirectory(paneId, parentPath, 'push')
    },
    [loadPaneDirectory, runtimeState.leftPane, runtimeState.rightPane],
  )

  const goPaneBack = useCallback(
    (paneId: CommanderPaneId) => {
      const paneState = paneId === 'left' ? runtimeState.leftPane : runtimeState.rightPane
      const targetPath = paneState.historyBack[paneState.historyBack.length - 1]

      if (!targetPath) {
        return
      }

      void loadPaneDirectory(paneId, targetPath, 'back')
    },
    [loadPaneDirectory, runtimeState.leftPane, runtimeState.rightPane],
  )

  const goPaneForward = useCallback(
    (paneId: CommanderPaneId) => {
      const paneState = paneId === 'left' ? runtimeState.leftPane : runtimeState.rightPane
      const targetPath = paneState.historyForward[paneState.historyForward.length - 1]

      if (!targetPath) {
        return
      }

      void loadPaneDirectory(paneId, targetPath, 'forward')
    },
    [loadPaneDirectory, runtimeState.leftPane, runtimeState.rightPane],
  )

  const openFilePreview = useCallback(
    async (paneId: CommanderPaneId) => {
      const paneState = paneId === 'left' ? runtimeState.leftPane : runtimeState.rightPane
      const entryId = paneState.cursorEntryId

      if (!entryId) {
        return
      }

      await openFilePreviewForEntry(paneId, entryId)
    },
    [openFilePreviewForEntry, runtimeState.leftPane, runtimeState.rightPane],
  )

  const openFileEditor = useCallback(
    async (paneId: CommanderPaneId) => {
      const paneState = paneId === 'left' ? runtimeState.leftPane : runtimeState.rightPane
      const entryId = paneState.cursorEntryId

      if (!entryId) {
        return
      }

      await openFileDialogForEntry(paneId, entryId, 'edit')
    },
    [openFileDialogForEntry, runtimeState.leftPane, runtimeState.rightPane],
  )

  const saveFileDialogAsync = useCallback(async () => {
    const fileDialog = runtimeState.fileDialog

    if (!fileDialog || fileDialog.mode !== 'edit' || mutationRequestInFlightRef.current) {
      return
    }

    try {
      mutationRequestInFlightRef.current = true
      const savedSnapshot = await writeCommanderFile(
        toCommanderEntryPath(fileDialog.path, fileDialog.entryName),
        fileDialog.draftValue,
      )

      onSetCommanderFileDialog({
        widgetId,
        fileDialog: {
          ...fileDialog,
          content: savedSnapshot.content,
          draftValue: savedSnapshot.content,
          entryId: savedSnapshot.entryId,
          entryName: savedSnapshot.entryName,
          path: savedSnapshot.path,
        },
      })

      await loadPaneDirectory(fileDialog.paneId, savedSnapshot.path, 'replace', {
        cursorEntryId: savedSnapshot.entryId,
        selectedIds: [savedSnapshot.entryId],
        selectionAnchorEntryId: savedSnapshot.entryId,
      })
    } catch (error) {
      onSetCommanderPaneLoadError({
        widgetId,
        paneId: fileDialog.paneId,
        path: fileDialog.path,
        errorMessage: toLoadErrorMessage(error),
      })
    } finally {
      mutationRequestInFlightRef.current = false
    }
  }, [
    loadPaneDirectory,
    onSetCommanderFileDialog,
    onSetCommanderPaneLoadError,
    runtimeState.fileDialog,
    widgetId,
  ])

  const openFileDialogEntryExternallyAsync = useCallback(async () => {
    const fileDialog = runtimeState.fileDialog

    if (!fileDialog) {
      return
    }

    try {
      await openCommanderFileExternally(toCommanderEntryPath(fileDialog.path, fileDialog.entryName))
    } catch (error) {
      onSetCommanderPaneLoadError({
        widgetId,
        paneId: fileDialog.paneId,
        path: fileDialog.path,
        errorMessage: toLoadErrorMessage(error),
      })
    }
  }, [onSetCommanderPaneLoadError, runtimeState.fileDialog, widgetId])

  const openFileDialogFolderExternallyAsync = useCallback(async () => {
    const fileDialog = runtimeState.fileDialog

    if (!fileDialog) {
      return
    }

    try {
      await openCommanderFileExternally(fileDialog.path)
    } catch (error) {
      onSetCommanderPaneLoadError({
        widgetId,
        paneId: fileDialog.paneId,
        path: fileDialog.path,
        errorMessage: toLoadErrorMessage(error),
      })
    }
  }, [onSetCommanderPaneLoadError, runtimeState.fileDialog, widgetId])

  const resolvePendingTransferConflictAsync = useCallback(
    async (resolution: 'overwrite-current' | 'skip-current' | 'overwrite-all' | 'skip-all') => {
      const pendingOperation = runtimeState.pendingOperation

      if (!pendingOperation || (pendingOperation.kind !== 'copy' && pendingOperation.kind !== 'move')) {
        onResolveCommanderPendingConflict({ widgetId, resolution })
        return
      }

      if (mutationRequestInFlightRef.current) {
        return
      }

      if (isCloneCopyOperation(pendingOperation)) {
        if (resolution === 'skip-current' || resolution === 'skip-all') {
          onCancelCommanderPendingOperation({ widgetId })
          return
        }

        try {
          mutationRequestInFlightRef.current = true
          await performTransferMutation(pendingOperation, pendingOperation.entryIds, true)
          onCancelCommanderPendingOperation({ widgetId })
        } catch (error) {
          handleTransferMutationError(pendingOperation, error)
        } finally {
          mutationRequestInFlightRef.current = false
        }
        return
      }

      if (resolution === 'overwrite-all') {
        try {
          mutationRequestInFlightRef.current = true
          await performTransferMutation(pendingOperation, pendingOperation.entryIds, true)
          onCancelCommanderPendingOperation({ widgetId })
        } catch (error) {
          handleTransferMutationError(pendingOperation, error)
        } finally {
          mutationRequestInFlightRef.current = false
        }
        return
      }

      if (resolution === 'skip-all') {
        const conflictEntryNameSet = new Set(pendingOperation.conflictEntryNames)
        const nonConflictingEntryIds = pendingOperation.entryIds.filter(
          (_entryId, index) => !conflictEntryNameSet.has(pendingOperation.entryNames[index] ?? ''),
        )

        try {
          mutationRequestInFlightRef.current = true
          if (nonConflictingEntryIds.length > 0) {
            await performTransferMutation(pendingOperation, nonConflictingEntryIds, false)
          }
          onCancelCommanderPendingOperation({ widgetId })
        } catch (error) {
          handleTransferMutationError(pendingOperation, error)
        } finally {
          mutationRequestInFlightRef.current = false
        }
        return
      }

      const currentConflictName = getCurrentPendingConflictName(pendingOperation)
      if (!currentConflictName) {
        return
      }

      const nextPendingOperation = removePendingTransferEntry(pendingOperation, currentConflictName)

      if (resolution === 'overwrite-current') {
        const currentConflictIndex = pendingOperation.entryNames.findIndex(
          (entryName) => entryName === currentConflictName,
        )
        const currentConflictEntryId =
          currentConflictIndex === -1 ? null : (pendingOperation.entryIds[currentConflictIndex] ?? null)

        if (!currentConflictEntryId) {
          return
        }

        try {
          mutationRequestInFlightRef.current = true
          await performTransferMutation(pendingOperation, [currentConflictEntryId], true)
        } catch (error) {
          handleTransferMutationError(pendingOperation, error)
          mutationRequestInFlightRef.current = false
          return
        }
      }

      if (nextPendingOperation.entryIds.length === 0) {
        onCancelCommanderPendingOperation({ widgetId })
        mutationRequestInFlightRef.current = false
        return
      }

      if (nextPendingOperation.conflictEntryNames.length > 0) {
        setPendingOperationState(nextPendingOperation)
        mutationRequestInFlightRef.current = false
        return
      }

      setPendingOperationState(nextPendingOperation)

      try {
        await performTransferMutation(nextPendingOperation, nextPendingOperation.entryIds, false)
        onCancelCommanderPendingOperation({ widgetId })
      } catch (error) {
        handleTransferMutationError(nextPendingOperation, error)
      } finally {
        mutationRequestInFlightRef.current = false
      }
    },
    [
      handleTransferMutationError,
      onCancelCommanderPendingOperation,
      onResolveCommanderPendingConflict,
      performTransferMutation,
      runtimeState.pendingOperation,
      setPendingOperationState,
      widgetId,
    ],
  )

  const confirmPendingOperationAsync = useCallback(async () => {
    const pendingOperation = runtimeState.pendingOperation

    if (!pendingOperation) {
      return
    }

    if (
      pendingOperation.kind !== 'copy' &&
      pendingOperation.kind !== 'move' &&
      pendingOperation.kind !== 'delete' &&
      pendingOperation.kind !== 'mkdir' &&
      pendingOperation.kind !== 'rename'
    ) {
      if (pendingOperation.kind === 'filter') {
        const paneState = getRuntimePaneState(runtimeState, pendingOperation.sourcePaneId)
        const filterQuery = pendingOperation.inputValue.trim()

        await loadPaneDirectory(pendingOperation.sourcePaneId, pendingOperation.sourcePath, 'replace', {
          cursorEntryId: paneState.cursorEntryId,
          filterQuery,
          selectedIds: paneState.selectedIds,
          selectionAnchorEntryId: paneState.selectionAnchorEntryId,
        })
        onSetCommanderPaneFilterQuery({
          widgetId,
          paneId: pendingOperation.sourcePaneId,
          filterQuery,
        })
        onSetCommanderPendingOperation({ widgetId, pendingOperation: null })
        return
      }

      onConfirmCommanderPendingOperation({ widgetId })
      return
    }

    if (mutationRequestInFlightRef.current) {
      return
    }

    try {
      mutationRequestInFlightRef.current = true

      if (pendingOperation.kind === 'copy' || pendingOperation.kind === 'move') {
        if (
          isCloneCopyOperation(pendingOperation) &&
          (!pendingOperation.inputValue.trim() ||
            (pendingOperation.cloneMode === 'single' &&
              pendingOperation.inputValue.trim() === pendingOperation.entryNames[0]))
        ) {
          onSetCommanderPaneLoadError({
            widgetId,
            paneId: pendingOperation.sourcePaneId,
            path: pendingOperation.sourcePath,
            errorMessage: 'Copy target name must differ from the source entry',
          })
          return
        }

        if (pendingOperation.conflictEntryNames.length > 0) {
          return
        }

        await performTransferMutation(pendingOperation, pendingOperation.entryIds, false)
        onCancelCommanderPendingOperation({ widgetId })
        return
      }

      if (pendingOperation.kind === 'delete') {
        const paths = getEntryPaths(pendingOperation.sourcePaneId, pendingOperation.entryIds)
        if (paths.length === 0) {
          return
        }

        await deleteCommanderEntries(paths)
        onCancelCommanderPendingOperation({ widgetId })
        await loadPaneDirectory(pendingOperation.sourcePaneId, pendingOperation.sourcePath, 'replace')
        return
      }

      if (pendingOperation.kind === 'mkdir') {
        const nextDirectoryName = pendingOperation.inputValue.trim()
        if (!hasSinglePathSegment(nextDirectoryName)) {
          onSetCommanderPaneLoadError({
            widgetId,
            paneId: pendingOperation.sourcePaneId,
            path: pendingOperation.sourcePath,
            errorMessage: 'Directory name must be a single path segment',
          })
          return
        }

        const createdDirectory = await mkdirCommanderDirectory(
          toCommanderEntryPath(pendingOperation.sourcePath, nextDirectoryName),
        )

        onCancelCommanderPendingOperation({ widgetId })
        await loadPaneDirectory(pendingOperation.sourcePaneId, createdDirectory.parentPath, 'replace', {
          cursorEntryId: createdDirectory.entryId,
          selectedIds: [],
          selectionAnchorEntryId: createdDirectory.entryId,
        })
        return
      }

      if (pendingOperation.kind !== 'rename') {
        return
      }

      const paneState = getRuntimePaneState(runtimeState, pendingOperation.sourcePaneId)
      const renameEntries =
        pendingOperation.renameMode === 'single'
          ? (() => {
              const entry = paneState.directoryEntries.find(
                (candidateEntry) => candidateEntry.id === pendingOperation.entryIds[0],
              )
              const nextName = pendingOperation.inputValue.trim()

              if (!entry || !nextName) {
                return []
              }

              return [
                {
                  path: toCommanderEntryPath(pendingOperation.sourcePath, entry.name),
                  next_name: nextName,
                },
              ]
            })()
          : pendingOperation.renamePreview
              .map((item) => {
                const entry = paneState.directoryEntries.find(
                  (candidateEntry) => candidateEntry.id === item.entryId,
                )
                const nextName = item.nextName.trim()

                if (!entry || !nextName) {
                  return null
                }

                return {
                  path: toCommanderEntryPath(pendingOperation.sourcePath, entry.name),
                  next_name: nextName,
                }
              })
              .filter(
                (
                  entry: { next_name: string; path: string } | null,
                ): entry is { next_name: string; path: string } => Boolean(entry),
              )

      if (renameEntries.length === 0 || pendingOperation.duplicateTargetNames.length > 0) {
        return
      }

      const renameResult = await renameCommanderEntries(renameEntries, {
        overwrite: pendingOperation.conflictEntryNames.length > 0,
      })

      onCancelCommanderPendingOperation({ widgetId })
      await reloadPaneSelection(
        pendingOperation.sourcePaneId,
        pendingOperation.sourcePath,
        renameResult.paths,
      )
    } catch (error) {
      if (pendingOperation.kind === 'copy' || pendingOperation.kind === 'move') {
        handleTransferMutationError(pendingOperation, error)
      } else {
        onSetCommanderPaneLoadError({
          widgetId,
          paneId: pendingOperation.sourcePaneId,
          path: pendingOperation.sourcePath,
          errorMessage: toLoadErrorMessage(error),
        })
      }
    } finally {
      mutationRequestInFlightRef.current = false
    }
  }, [
    getEntryPaths,
    handleTransferMutationError,
    loadPaneDirectory,
    onCancelCommanderPendingOperation,
    onConfirmCommanderPendingOperation,
    onSetCommanderPaneLoadError,
    performTransferMutation,
    reloadPaneSelection,
    runtimeState.pendingOperation,
    runtimeState,
    widgetId,
  ])

  const viewState = useMemo(
    () => toWidgetViewState(runtimeState, runtimeContext),
    [runtimeContext, runtimeState],
  )
  const commanderActions = useMemo(
    () => ({
      cancelPendingOperation: () => onCancelCommanderPendingOperation({ widgetId }),
      confirmPendingOperation: () => {
        void confirmPendingOperationAsync()
      },
      copySelection: () => onRequestCommanderActivePaneCopy({ widgetId }),
      deleteSelection: () => onRequestCommanderActivePaneDelete({ widgetId }),
      goBack: () => goPaneBack(runtimeState.activePane),
      goForward: () => goPaneForward(runtimeState.activePane),
      goPaneBack,
      goPaneForward,
      goPaneParent,
      goParent: () => goPaneParent(runtimeState.activePane),
      mkdir: () => onRequestCommanderActivePaneMkdir({ widgetId }),
      moveSelection: () => onRequestCommanderActivePaneMove({ widgetId }),
      selectByMask: () => onRequestCommanderActivePaneSelectByMask({ widgetId }),
      unselectByMask: () => onRequestCommanderActivePaneUnselectByMask({ widgetId }),
      filterActivePane: () => onRequestCommanderActivePaneFilter({ widgetId }),
      searchActivePane: () => onRequestCommanderActivePaneSearch({ widgetId }),
      stepSearchMatch: (delta: 1 | -1) => onStepCommanderPendingSearchMatch({ widgetId, delta }),
      toggleDirsFirst: () => onToggleCommanderDirsFirst({ widgetId }),
      viewActiveFile: () => openFilePreview(runtimeState.activePane),
      editActiveFile: () => {
        void openFileEditor(runtimeState.activePane)
      },
      setFileDialogDraft: (inputValue: string) => onSetCommanderFileDialogDraft({ widgetId, inputValue }),
      saveFileDialog: () => {
        void saveFileDialogAsync()
      },
      openFileExternally: () => {
        void openFileDialogEntryExternallyAsync()
      },
      openContainingFolderExternally: () => {
        void openFileDialogFolderExternallyAsync()
      },
      closeFileDialog: () => onCloseCommanderFileDialog({ widgetId }),
      clearActivePaneFilter: () => {
        const paneState = getRuntimePaneState(runtimeState, runtimeState.activePane)

        void (async () => {
          await loadPaneDirectory(runtimeState.activePane, paneState.path, 'replace', {
            cursorEntryId: paneState.cursorEntryId,
            filterQuery: '',
            selectedIds: paneState.selectedIds,
            selectionAnchorEntryId: paneState.selectionAnchorEntryId,
          })
          onSetCommanderPaneFilterQuery({
            widgetId,
            paneId: runtimeState.activePane,
            filterQuery: '',
          })
          onClearCommanderActivePaneFilter({ widgetId })
        })()
      },
      invertSelection: () => onInvertCommanderActivePaneSelection({ widgetId }),
      moveCursor: (delta: number, options?: { extendSelection?: boolean }) =>
        onMoveCommanderActivePaneCursor({ widgetId, delta, extendSelection: options?.extendSelection }),
      openActiveEntry: () => {
        const activePane = runtimeState.activePane === 'left' ? runtimeState.leftPane : runtimeState.rightPane
        const entryId = activePane.cursorEntryId

        if (!entryId) {
          return
        }

        openPaneEntry(runtimeState.activePane, entryId)
      },
      renameSelection: () => onRequestCommanderActivePaneRename({ widgetId }),
      overwritePendingConflict: () => {
        void resolvePendingTransferConflictAsync('overwrite-current')
      },
      skipPendingConflict: () => {
        void resolvePendingTransferConflictAsync('skip-current')
      },
      overwriteAllPendingConflicts: () => {
        void resolvePendingTransferConflictAsync('overwrite-all')
      },
      skipAllPendingConflicts: () => {
        void resolvePendingTransferConflictAsync('skip-all')
      },
      setCursor: (paneId: CommanderPaneId, entryId: string, options?: { rangeSelect?: boolean }) =>
        onSetCommanderPaneCursor({ widgetId, paneId, entryId, rangeSelect: options?.rangeSelect }),
      setSortMode: (sortMode: CommanderSortMode) => onSetCommanderSortMode({ widgetId, sortMode }),
      setBoundaryCursor: (
        paneId: CommanderPaneId,
        boundary: 'start' | 'end',
        options?: { extendSelection?: boolean },
      ) =>
        onSetCommanderPaneBoundaryCursor({
          widgetId,
          paneId,
          boundary,
          extendSelection: options?.extendSelection,
        }),
      setPanePath,
      setPendingOperationInput: (inputValue: string) =>
        onSetCommanderPendingOperationInput({ widgetId, inputValue }),
      switchActivePane: () => onSwitchCommanderActivePane({ widgetId }),
      toggleSelectionAtCursor: (advance?: boolean) =>
        onToggleCommanderActivePaneSelection({ widgetId, advance }),
    }),
    [
      goPaneBack,
      goPaneForward,
      goPaneParent,
      onCancelCommanderPendingOperation,
      onClearCommanderActivePaneFilter,
      onCloseCommanderFileDialog,
      onInvertCommanderActivePaneSelection,
      onMoveCommanderActivePaneCursor,
      onRequestCommanderActivePaneCopy,
      onRequestCommanderActivePaneDelete,
      onRequestCommanderActivePaneFilter,
      onRequestCommanderActivePaneMkdir,
      onRequestCommanderActivePaneMove,
      onRequestCommanderActivePaneRename,
      onRequestCommanderActivePaneSearch,
      onRequestCommanderActivePaneSelectByMask,
      onRequestCommanderActivePaneUnselectByMask,
      onSetCommanderFileDialogDraft,
      onSetCommanderPaneBoundaryCursor,
      onSetCommanderPaneCursor,
      onSetCommanderPendingOperationInput,
      onSetCommanderPaneFilterQuery,
      onSetCommanderSortMode,
      onStepCommanderPendingSearchMatch,
      onSwitchCommanderActivePane,
      onToggleCommanderActivePaneSelection,
      onToggleCommanderDirsFirst,
      confirmPendingOperationAsync,
      openFileEditor,
      openFilePreview,
      openFileDialogEntryExternallyAsync,
      openFileDialogFolderExternallyAsync,
      openPaneEntry,
      resolvePendingTransferConflictAsync,
      runtimeState.activePane,
      saveFileDialogAsync,
      runtimeState.leftPane,
      runtimeState.rightPane,
      setPanePath,
      widgetId,
    ],
  )

  return {
    commanderActions,
    state: viewState,
    runtimeContext,
    runtimeState,
    actions: {
      goPaneBack,
      goPaneForward,
      goPaneParent,
      openFilePreview,
      openPaneEntry,
      setActivePane: (paneId: CommanderPaneId) => onSetCommanderActivePane({ widgetId, paneId }),
      setPaneCursor: (paneId: CommanderPaneId, entryId: string, options?: { rangeSelect?: boolean }) =>
        onSetCommanderPaneCursor({ widgetId, paneId, entryId, rangeSelect: options?.rangeSelect }),
      setPanePath,
      setViewMode: (viewMode: CommanderViewMode) => onSetCommanderViewMode({ widgetId, viewMode }),
      togglePaneSelection: (paneId: CommanderPaneId, entryId: string) =>
        onToggleCommanderPaneSelection({ widgetId, paneId, entryId }),
      toggleShowHidden: () => onToggleCommanderShowHidden({ widgetId }),
    },
  }
}

/** Narrows the full commander hook state down to one pane-facing controller surface. */
export function useCommanderPane(widgetId: string, paneId: CommanderPaneId) {
  const commander = useCommanderWidget(widgetId)
  const paneState = paneId === 'left' ? commander.state.leftPane : commander.state.rightPane

  return {
    pane: paneState,
    isActive: commander.state.activePane === paneId,
    setActive: () => commander.actions.setActivePane(paneId),
    setCursor: (entryId: string, options?: { rangeSelect?: boolean }) =>
      commander.actions.setPaneCursor(paneId, entryId, options),
    openEntry: (entryId: string) => commander.actions.openPaneEntry(paneId, entryId),
    toggleSelection: (entryId: string) => commander.actions.togglePaneSelection(paneId, entryId),
  }
}
