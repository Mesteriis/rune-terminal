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
export type CommanderRenamePreviewStatus = 'ok' | 'duplicate' | 'conflict' | 'invalid'
export type CommanderFileDialogMode = 'view' | 'edit'

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

export type CommanderTransferPendingOperation = CommanderPendingOperationBase<'copy' | 'move'> & {
  targetPaneId: CommanderPaneId
  targetPath: string
  conflictEntryNames: string[]
}

export type CommanderDeletePendingOperation = CommanderPendingOperationBase<'delete'>

export type CommanderMkdirPendingOperation = CommanderPendingOperationBase<'mkdir'> & {
  mkdirName: string
}

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

export type CommanderClientEntrySnapshot = {
  id?: string
  name: string
  ext: string
  kind: CommanderRowKind
  sizeLabel: string
  modified: string
  hidden?: boolean
  gitStatus?: string
  executable?: boolean
  symlinkTarget?: string
  content?: string
}

export type CommanderClientSnapshot = {
  directories: Record<string, CommanderClientEntrySnapshot[]>
}

export type CommanderPaneRuntimeState = {
  id: CommanderPaneId
  path: string
  filterQuery: string
  entries: CommanderDirectoryEntry[]
  cursorEntryId: string | null
  selectionAnchorEntryId: string | null
  selectedIds: string[]
  historyBack: string[]
  historyForward: string[]
}

export type CommanderPanePersistedState = {
  path: string
  filterQuery: string
  entries: CommanderDirectoryEntry[]
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
}

export type CommanderWidgetRuntimeState = {
  widgetId: string
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
  client: CommanderClientSnapshot
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
  filterQuery: string
  canGoBack: boolean
  canGoForward: boolean
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
}
