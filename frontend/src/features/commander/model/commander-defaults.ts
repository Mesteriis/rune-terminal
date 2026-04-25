import type {
  CommanderFooterHint,
  CommanderPaneId,
  CommanderSortDirection,
  CommanderSortMode,
  CommanderViewMode,
} from '@/features/commander/model/types'

export const defaultCommanderViewMode: CommanderViewMode = 'commander'
export const defaultCommanderActivePane: CommanderPaneId = 'left'
export const defaultCommanderShowHidden = true
export const defaultCommanderSortMode: CommanderSortMode = 'name'
export const defaultCommanderSortDirection: CommanderSortDirection = 'asc'
export const defaultCommanderDirsFirst = true

export const defaultCommanderFooterHints: CommanderFooterHint[] = [
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
]
