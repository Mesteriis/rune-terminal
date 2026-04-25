export type CommanderPaneId = 'left' | 'right'
export type CommanderViewMode = 'commander' | 'split' | 'terminal'
export type CommanderSortMode = 'name' | 'ext' | 'size' | 'modified'
export type CommanderSortDirection = 'asc' | 'desc'
export type CommanderRowKind = 'file' | 'folder' | 'symlink'

export type CommanderFooterHint = {
  key: string
  label: string
}

export type CommanderPendingOperationKind =
  | 'copy'
  | 'move'
  | 'delete'
  | 'mkdir'
  | 'rename'
  | 'select'
  | 'unselect'
  | 'filter'
  | 'search'
export type CommanderRenameMode = 'single' | 'batch'
export type CommanderCloneMode = 'single' | 'batch'
export type CommanderRenamePreviewStatus = 'ok' | 'duplicate' | 'conflict' | 'invalid'
export type CommanderFileDialogMode = 'view' | 'edit' | 'blocked'
export type CommanderFilePreviewKind = 'text' | 'hex'

export type CommanderRenamePreviewItem = {
  entryId: string
  currentName: string
  nextName: string
  status: CommanderRenamePreviewStatus
  conflict: boolean
}

type CommanderPendingOperationBase<Kind extends CommanderPendingOperationKind> = {
  kind: Kind
  sourcePaneId: CommanderPaneId
  sourcePath: string
  entryIds: string[]
  entryNames: string[]
}

type CommanderPendingOperationWithInput<Kind extends CommanderPendingOperationKind> =
  CommanderPendingOperationBase<Kind> & {
    inputValue: string
  }

export type CommanderClonePendingOperation = CommanderPendingOperationWithInput<'copy'> & {
  targetPaneId: CommanderPaneId
  targetPath: string
  cloneMode: CommanderCloneMode
  conflictEntryNames: string[]
  duplicateTargetNames: string[]
  renamePreview: CommanderRenamePreviewItem[]
  transferMode: 'clone'
}

export type CommanderPaneTransferPendingOperation = CommanderPendingOperationBase<'copy' | 'move'> & {
  targetPaneId: CommanderPaneId
  targetPath: string
  conflictEntryNames: string[]
  transferMode: 'pane'
}

export type CommanderTransferPendingOperation =
  | CommanderClonePendingOperation
  | CommanderPaneTransferPendingOperation

export type CommanderDeletePendingOperation = CommanderPendingOperationBase<'delete'>

export type CommanderMkdirPendingOperation = CommanderPendingOperationWithInput<'mkdir'>

export type CommanderRenamePendingOperation = CommanderPendingOperationWithInput<'rename'> & {
  conflictEntryNames: string[]
  duplicateTargetNames: string[]
  renameMode: CommanderRenameMode
  renamePreview: CommanderRenamePreviewItem[]
}

export type CommanderMaskPendingOperation = CommanderPendingOperationWithInput<
  'select' | 'unselect' | 'filter'
> & {
  matchCount: number
  matchPreview: string[]
}

export type CommanderSearchPendingOperation = CommanderPendingOperationWithInput<'search'> & {
  matchCount: number
  matchPreview: string[]
  matchIndex: number
}

export type CommanderPendingInputOperation =
  | CommanderClonePendingOperation
  | CommanderRenamePendingOperation
  | CommanderMaskPendingOperation
  | CommanderSearchPendingOperation

export type CommanderPendingOperation =
  | CommanderTransferPendingOperation
  | CommanderDeletePendingOperation
  | CommanderMkdirPendingOperation
  | CommanderRenamePendingOperation
  | CommanderMaskPendingOperation
  | CommanderSearchPendingOperation

export type CommanderDirectoryEntry = {
  id: string
  name: string
  ext: string
  kind: CommanderRowKind
  sizeLabel: string
  sizeBytes: number | null
  modified: string
  hidden: boolean
  gitStatus?: string
  executable?: boolean
  symlinkTarget?: string
}

export type CommanderPaneRuntimeState = {
  id: CommanderPaneId
  path: string
  filterQuery: string
  directoryEntries: CommanderDirectoryEntry[]
  entries: CommanderDirectoryEntry[]
  cursorEntryId: string | null
  selectionAnchorEntryId: string | null
  selectedIds: string[]
  historyBack: string[]
  historyForward: string[]
  isLoading: boolean
  errorMessage: string | null
}

export type CommanderPanePersistedState = {
  path: string
  filterQuery: string
  directoryEntries?: CommanderDirectoryEntry[]
  entries?: CommanderDirectoryEntry[]
  cursorEntryId: string | null
  selectionAnchorEntryId: string | null
  selectedIds: string[]
  historyBack: string[]
  historyForward: string[]
}

export type CommanderFileDialogState = {
  paneId: CommanderPaneId
  path: string
  entryId: string
  entryName: string
  mode: CommanderFileDialogMode
  content: string
  draftValue: string
  previewKind?: CommanderFilePreviewKind
  previewBytes?: number
  sizeBytes?: number
  truncated?: boolean
  blockedReason?: string
  blockedTitle?: string
  blockedHint?: string
}

export type CommanderWidgetRuntimeState = {
  widgetId: string
  dataSource: 'backend'
  mode: 'commander'
  viewMode: CommanderViewMode
  activePane: CommanderPaneId
  showHidden: boolean
  sortMode: CommanderSortMode
  sortDirection: CommanderSortDirection
  dirsFirst: boolean
  footerHints: CommanderFooterHint[]
  pendingOperation: CommanderPendingOperation | null
  fileDialog: CommanderFileDialogState | null
  leftPane: CommanderPaneRuntimeState
  rightPane: CommanderPaneRuntimeState
}

export type CommanderWidgetPersistedState = {
  activePane: CommanderPaneId
  viewMode: CommanderViewMode
  showHidden: boolean
  sortMode: CommanderSortMode
  sortDirection: CommanderSortDirection
  dirsFirst: boolean
  leftPane: CommanderPanePersistedState
  rightPane: CommanderPanePersistedState
}

export type CommanderWidgetPersistedSnapshot = {
  runtime: CommanderWidgetPersistedState
}

export type CommanderPaneCounters = {
  items: number
  selectedItems: number
  selectedSize: string
}

export type CommanderFileRow = {
  id: string
  name: string
  ext: string
  kind: CommanderRowKind
  size: string
  modified: string
  hidden: boolean
  selected: boolean
  focused: boolean
  gitStatus?: string
  executable?: boolean
  symlinkTarget?: string
}

export type CommanderPaneViewState = {
  id: CommanderPaneId
  path: string
  displayPath: string
  filterQuery: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
  errorMessage: string | null
  counters: CommanderPaneCounters
  rows: CommanderFileRow[]
}

export type CommanderWidgetViewState = {
  mode: 'commander'
  viewMode: CommanderViewMode
  activePane: CommanderPaneId
  showHidden: boolean
  syncCwd: false
  sortMode: CommanderSortMode
  sortDirection: CommanderSortDirection
  dirsFirst: boolean
  footerHints: CommanderFooterHint[]
  pendingOperation: CommanderPendingOperation | null
  fileDialog: CommanderFileDialogState | null
  leftPane: CommanderPaneViewState
  rightPane: CommanderPaneViewState
}

export type CommanderDirectorySnapshot = {
  path: string
  entries: CommanderDirectoryEntry[]
}

export type CommanderNavigationResult =
  | {
      kind: 'directory'
      path: string
    }
  | {
      kind: 'file'
      entry: CommanderDirectoryEntry
    }
  | {
      kind: 'symlink'
      entry: CommanderDirectoryEntry
    }

export type CommanderFileSnapshot = {
  entryId: string
  entryName: string
  path: string
  content: string
  previewAvailable: boolean
  previewKind: CommanderFilePreviewKind
  previewBytes?: number
  sizeBytes?: number
  truncated?: boolean
}
