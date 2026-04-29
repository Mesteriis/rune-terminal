import { useCallback, useRef, type MutableRefObject } from 'react'

import {
  CommanderAPIError,
  openCommanderFileExternally,
  readCommanderFile,
  readCommanderFilePreview,
  toCommanderEntryPath,
  writeCommanderFile,
} from '@/features/commander/api/client'
import type {
  CommanderFileDialogState,
  CommanderFileSnapshot,
  CommanderPaneId,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'
import { toLoadErrorMessage } from '@/features/commander/model/view-model'

type LoadCommanderPaneDirectory = (
  paneId: CommanderPaneId,
  path: string,
  historyMode?: 'back' | 'forward' | 'push' | 'replace',
  options?: {
    cursorEntryId?: string | null
    filterQuery?: string
    selectedIds?: string[]
    selectionAnchorEntryId?: string | null
  },
) => Promise<void>

type SetCommanderFileDialog = (payload: {
  fileDialog: CommanderFileDialogState | null
  widgetId: string
}) => void

type SetCommanderPaneLoadError = (payload: {
  errorMessage?: string | null
  paneId: CommanderPaneId
  path?: string
  widgetId: string
}) => void

type CommanderFileDialogControllerInput = {
  loadPaneDirectory: LoadCommanderPaneDirectory
  mutationRequestInFlightRef: MutableRefObject<boolean>
  onSetCommanderFileDialog: SetCommanderFileDialog
  onSetCommanderPaneLoadError: SetCommanderPaneLoadError
  runtimeState: CommanderWidgetRuntimeState
  widgetId: string
}

export function useCommanderFileDialogController({
  loadPaneDirectory,
  mutationRequestInFlightRef,
  onSetCommanderFileDialog,
  onSetCommanderPaneLoadError,
  runtimeState,
  widgetId,
}: CommanderFileDialogControllerInput) {
  const fileRequestIdRef = useRef(0)

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
    mutationRequestInFlightRef,
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

  return {
    openFileDialogEntryExternallyAsync,
    openFileDialogFolderExternallyAsync,
    openFileEditor,
    openFilePreview,
    openFilePreviewForEntry,
    saveFileDialogAsync,
  }
}
