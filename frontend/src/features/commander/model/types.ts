export type CommanderPaneId = 'left' | 'right'
export type CommanderViewMode = 'commander' | 'split' | 'terminal'
export type CommanderSortMode = 'name' | 'ext' | 'modified'
export type CommanderRowKind = 'file' | 'folder' | 'symlink'

export type CommanderFooterHint = {
  key: string
  label: string
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

export type CommanderPaneRuntimeState = {
  id: CommanderPaneId
  path: string
  entries: CommanderDirectoryEntry[]
  cursorEntryId: string | null
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
  leftPane: CommanderPaneRuntimeState
  rightPane: CommanderPaneRuntimeState
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
