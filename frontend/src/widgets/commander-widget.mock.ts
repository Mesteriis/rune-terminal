import commanderWidgetMock from './commander-widget.mock.json'
import type { CommanderFileRow, CommanderPaneCounters, CommanderPaneId, CommanderSortMode, CommanderViewMode } from '../features/commander/model/types'

export type CommanderPaneMockState = {
  id: CommanderPaneId
  path: string
  counters: CommanderPaneCounters
  rows: (CommanderFileRow & {
    focused: boolean
    selected: boolean
  })[]
}

export type CommanderWidgetMockState = {
  mode: 'commander'
  viewMode: CommanderViewMode
  activePane: CommanderPaneId
  showHidden: boolean
  syncCwd: boolean
  sortMode: CommanderSortMode
  footerHints: {
    key: string
    label: string
  }[]
  leftPane: CommanderPaneMockState
  rightPane: CommanderPaneMockState
}

export const commanderWidgetMockState =
  commanderWidgetMock as CommanderWidgetMockState
