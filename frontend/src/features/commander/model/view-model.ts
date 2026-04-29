import { CommanderAPIError } from '@/features/commander/api/client'
import type {
  CommanderPaneId,
  CommanderPaneRuntimeState,
  CommanderPaneViewState,
  CommanderTransferPendingOperation,
  CommanderWidgetRuntimeState,
  CommanderWidgetViewState,
} from '@/features/commander/model/types'
import { formatRuntimePathForDisplay, getRuntimePathParent, type RuntimeContext } from '@/shared/api/runtime'

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

export function toWidgetViewState(
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

export function toLoadErrorMessage(error: unknown) {
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

export function hasSinglePathSegment(inputValue: string) {
  const trimmedValue = inputValue.trim()

  if (!trimmedValue || trimmedValue === '.' || trimmedValue === '..') {
    return false
  }

  return !/[\\/]/.test(trimmedValue)
}

export function resolveDefaultPanePaths(
  runtimeContext: RuntimeContext,
  runtimeState: CommanderWidgetRuntimeState,
) {
  const leftPath = runtimeState.leftPane.path || runtimeContext.repoRoot
  const rightPath = runtimeState.rightPane.path || runtimeContext.repoRoot

  return { leftPath, rightPath }
}

export function getRuntimePaneState(runtimeState: CommanderWidgetRuntimeState, paneId: CommanderPaneId) {
  return paneId === 'left' ? runtimeState.leftPane : runtimeState.rightPane
}

export function isCloneCopyOperation(
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

export function toEntryIdsFromPaths(directoryPath: string, paths: string[]) {
  return paths
    .filter((path) => (getRuntimePathParent(path) ?? '/') === directoryPath)
    .map((path) => toEntryIdFromPath(path))
}
