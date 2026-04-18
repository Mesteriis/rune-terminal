import commanderWidgetMock from './commander-widget.mock.json'

export type CommanderPaneId = 'left' | 'right'
export type CommanderViewMode = 'commander' | 'split' | 'terminal'
export type CommanderSortMode = 'name' | 'ext' | 'modified'
export type CommanderRowKind = 'file' | 'folder' | 'symlink'

export type CommanderFooterHint = {
  key: string
  label: string
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

export type CommanderPaneState = {
  id: CommanderPaneId
  path: string
  counters: CommanderPaneCounters
  rows: CommanderFileRow[]
}

export type CommanderWidgetMockState = {
  mode: 'commander'
  viewMode: CommanderViewMode
  activePane: CommanderPaneId
  showHidden: boolean
  syncCwd: boolean
  sortMode: CommanderSortMode
  footerHints: CommanderFooterHint[]
  leftPane: CommanderPaneState
  rightPane: CommanderPaneState
}

export const commanderWidgetMockState =
  commanderWidgetMock as CommanderWidgetMockState
