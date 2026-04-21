import { commanderWidgetMockState } from '@/widgets/commander/commander-widget.mock'
import { filterEntriesByMask } from '@/features/commander/model/store-selection'
import type {
  CommanderDirectoryEntry,
  CommanderPaneId,
  CommanderPanePersistedState,
  CommanderPaneRuntimeState,
  CommanderSortDirection,
  CommanderSortMode,
  CommanderWidgetPersistedState,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'

const backendCommanderFooterHints = [
  { key: 'F2', label: 'Rename' },
  { key: 'F3', label: 'View' },
  { key: 'F4', label: 'Edit' },
  { key: 'F5', label: 'Copy' },
  { key: 'F6', label: 'Move' },
  { key: 'F7', label: 'Mkdir' },
  { key: 'F8', label: 'Delete' },
  { key: 'CTRL+L', label: 'Path' },
  { key: 'CTRL+S', label: 'Search' },
  { key: 'CTRL+F', label: 'Filter' },
  { key: 'CTRL+BS', label: 'Clear filter' },
] as const

function sortCommanderEntries(
  entries: CommanderDirectoryEntry[],
  sortMode: CommanderSortMode,
  sortDirection: CommanderSortDirection,
  dirsFirst: boolean,
) {
  const sortedEntries = [...entries]

  sortedEntries.sort((leftEntry, rightEntry) => {
    if (dirsFirst) {
      if (leftEntry.kind === 'folder' && rightEntry.kind !== 'folder') {
        return -1
      }

      if (leftEntry.kind !== 'folder' && rightEntry.kind === 'folder') {
        return 1
      }
    }

    let compareResult = 0

    if (sortMode === 'ext') {
      compareResult = (leftEntry.ext || leftEntry.name).localeCompare(rightEntry.ext || rightEntry.name)
    }

    if (sortMode === 'modified' && compareResult === 0) {
      compareResult = rightEntry.modified.localeCompare(leftEntry.modified)
    }

    if (sortMode === 'size' && compareResult === 0) {
      const leftSize = leftEntry.sizeBytes ?? -1
      const rightSize = rightEntry.sizeBytes ?? -1
      compareResult = rightSize - leftSize
    }

    if (compareResult === 0) {
      compareResult = leftEntry.name.localeCompare(rightEntry.name)
    }

    return sortDirection === 'desc' ? compareResult * -1 : compareResult
  })

  return sortedEntries
}

function projectCommanderEntries(
  directoryEntries: CommanderDirectoryEntry[],
  options: {
    showHidden: boolean
    sortMode: CommanderSortMode
    sortDirection: CommanderSortDirection
    dirsFirst: boolean
  },
  filterQuery: string,
) {
  const visibleEntries = directoryEntries.filter((entry) => options.showHidden || !entry.hidden)
  const sortedEntries = sortCommanderEntries(
    visibleEntries,
    options.sortMode,
    options.sortDirection,
    options.dirsFirst,
  )

  return filterEntriesByMask(sortedEntries, filterQuery, { emptyMeansAll: true })
}

function buildCommanderPaneState(
  paneId: CommanderPaneId,
  path: string,
  directoryEntries: CommanderDirectoryEntry[],
  filterQuery: string,
  selectedIds: string[],
  cursorEntryId: string | null,
  selectionAnchorEntryId: string | null,
  history: {
    back: string[]
    forward: string[]
  },
  options: {
    showHidden: boolean
    sortMode: CommanderSortMode
    sortDirection: CommanderSortDirection
    dirsFirst: boolean
  },
): CommanderPaneRuntimeState {
  const entries = projectCommanderEntries(directoryEntries, options, filterQuery)
  const visibleIds = new Set(entries.map((entry) => entry.id))
  const nextSelectedIds = selectedIds.filter((entryId) => visibleIds.has(entryId))
  const nextCursorEntryId =
    cursorEntryId && visibleIds.has(cursorEntryId) ? cursorEntryId : (entries[0]?.id ?? null)
  const nextSelectionAnchorEntryId =
    selectionAnchorEntryId && visibleIds.has(selectionAnchorEntryId)
      ? selectionAnchorEntryId
      : nextCursorEntryId

  return {
    id: paneId,
    path,
    filterQuery,
    directoryEntries,
    entries,
    cursorEntryId: nextCursorEntryId,
    selectionAnchorEntryId: nextSelectionAnchorEntryId,
    selectedIds: nextSelectedIds,
    historyBack: history.back,
    historyForward: history.forward,
    isLoading: false,
    errorMessage: null,
  }
}

function createPaneStateFromPersisted(
  paneId: CommanderPaneId,
  paneState: CommanderPanePersistedState,
  options: {
    showHidden: boolean
    sortMode: CommanderSortMode
    sortDirection: CommanderSortDirection
    dirsFirst: boolean
  },
) {
  const directoryEntries = paneState.directoryEntries ?? paneState.entries

  return buildCommanderPaneState(
    paneId,
    paneState.path,
    directoryEntries,
    paneState.filterQuery,
    paneState.selectedIds,
    paneState.cursorEntryId,
    paneState.selectionAnchorEntryId,
    {
      back: paneState.historyBack,
      forward: paneState.historyForward,
    },
    options,
  )
}

function createEmptyPaneState(paneId: CommanderPaneId): CommanderPaneRuntimeState {
  return {
    id: paneId,
    path: '',
    filterQuery: '',
    directoryEntries: [],
    entries: [],
    cursorEntryId: null,
    selectionAnchorEntryId: null,
    selectedIds: [],
    historyBack: [],
    historyForward: [],
    isLoading: true,
    errorMessage: null,
  }
}

export function createCommanderWidgetRuntimeState(
  widgetId: string,
  persistedState?: CommanderWidgetPersistedState | null,
): CommanderWidgetRuntimeState {
  const showHidden = persistedState?.showHidden ?? commanderWidgetMockState.showHidden
  const sortMode = persistedState?.sortMode ?? commanderWidgetMockState.sortMode
  const sortDirection = persistedState?.sortDirection ?? 'asc'
  const dirsFirst = persistedState?.dirsFirst ?? true
  const options = { showHidden, sortMode, sortDirection, dirsFirst }

  return {
    widgetId,
    dataSource: 'backend',
    mode: 'commander',
    viewMode: persistedState?.viewMode ?? commanderWidgetMockState.viewMode,
    activePane: persistedState?.activePane ?? commanderWidgetMockState.activePane,
    showHidden,
    sortMode,
    sortDirection,
    dirsFirst,
    footerHints: [...backendCommanderFooterHints],
    pendingOperation: null,
    fileDialog: null,
    leftPane: persistedState?.leftPane
      ? createPaneStateFromPersisted('left', persistedState.leftPane, options)
      : createEmptyPaneState('left'),
    rightPane: persistedState?.rightPane
      ? createPaneStateFromPersisted('right', persistedState.rightPane, options)
      : createEmptyPaneState('right'),
  }
}

export function rebuildCommanderPaneState(
  widgetState: CommanderWidgetRuntimeState,
  paneState: CommanderPaneRuntimeState,
  overrides?: Partial<CommanderPaneRuntimeState>,
): CommanderPaneRuntimeState {
  const nextPaneState = {
    ...paneState,
    ...overrides,
  }

  return buildCommanderPaneState(
    nextPaneState.id,
    nextPaneState.path,
    nextPaneState.directoryEntries,
    nextPaneState.filterQuery,
    nextPaneState.selectedIds,
    nextPaneState.cursorEntryId,
    nextPaneState.selectionAnchorEntryId,
    {
      back: nextPaneState.historyBack,
      forward: nextPaneState.historyForward,
    },
    {
      showHidden: widgetState.showHidden,
      sortMode: widgetState.sortMode,
      sortDirection: widgetState.sortDirection,
      dirsFirst: widgetState.dirsFirst,
    },
  )
}

export function getCommanderParentPath(path: string) {
  if (!path) {
    return null
  }

  const normalizedPath = path.replace(/\\/g, '/')
  const trimmedPath = normalizedPath.replace(/\/+$/g, '')

  if (!trimmedPath || trimmedPath === '/') {
    return null
  }

  const lastSlashIndex = trimmedPath.lastIndexOf('/')

  if (lastSlashIndex === -1) {
    return null
  }

  if (lastSlashIndex === 0) {
    return '/'
  }

  return trimmedPath.slice(0, lastSlashIndex)
}
