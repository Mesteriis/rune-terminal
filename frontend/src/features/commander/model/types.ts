export type CommanderPaneId = 'left' | 'right'
export type CommanderViewMode = 'commander' | 'split' | 'terminal'
export type CommanderSortMode = 'name' | 'ext' | 'modified'
export type CommanderRowKind = 'file' | 'folder' | 'symlink'

export type CommanderFooterHint = {
  key: string
  label: string
}

export type CommanderPendingOperationKind = 'copy' | 'move' | 'delete' | 'mkdir' | 'rename'
export type CommanderRenameMode = 'single' | 'batch'
export type CommanderRenamePreviewStatus = 'ok' | 'duplicate' | 'conflict' | 'invalid'

export type CommanderRenamePreviewItem = {
  entryId: string
  currentName: string
  nextName: string
  status: CommanderRenamePreviewStatus
  conflict: boolean
}

export type CommanderPendingOperation = {
  kind: CommanderPendingOperationKind
  sourcePaneId: CommanderPaneId
  sourcePath: string
  targetPaneId?: CommanderPaneId
  targetPath?: string
  entryIds: string[]
  entryNames: string[]
  mkdirName?: string
  inputValue?: string
  conflictEntryNames?: string[]
  duplicateTargetNames?: string[]
  renameMode?: CommanderRenameMode
  renamePreview?: CommanderRenamePreviewItem[]
}

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
}

export type CommanderClientSnapshot = {
  directories: Record<string, CommanderClientEntrySnapshot[]>
}

export type CommanderPaneRuntimeState = {
  id: CommanderPaneId
  path: string
  entries: CommanderDirectoryEntry[]
  cursorEntryId: string | null
  selectionAnchorEntryId: string | null
  selectedIds: string[]
  historyBack: string[]
  historyForward: string[]
}

export type CommanderPanePersistedState = {
  path: string
  entries: CommanderDirectoryEntry[]
  cursorEntryId: string | null
  selectionAnchorEntryId: string | null
  selectedIds: string[]
  historyBack: string[]
  historyForward: string[]
}

export type CommanderWidgetRuntimeState = {
  widgetId: string
  mode: 'commander'
  viewMode: CommanderViewMode
  activePane: CommanderPaneId
  showHidden: boolean
  sortMode: CommanderSortMode
  footerHints: CommanderFooterHint[]
  pendingOperation: CommanderPendingOperation | null
  leftPane: CommanderPaneRuntimeState
  rightPane: CommanderPaneRuntimeState
}

export type CommanderWidgetPersistedState = {
  activePane: CommanderPaneId
  viewMode: CommanderViewMode
  showHidden: boolean
  sortMode: CommanderSortMode
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
  footerHints: CommanderFooterHint[]
  pendingOperation: CommanderPendingOperation | null
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
