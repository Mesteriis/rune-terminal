import type { RefObject } from 'react'

import type {
  CommanderPaneViewState,
  CommanderSortDirection,
  CommanderSortMode,
} from '@/features/commander/model/types'
import type { CommanderPathSuggestion } from '@/widgets/commander/commander-widget.shared'

export type CommanderPanePathEditor = {
  inputRef: RefObject<HTMLInputElement | null>
  isEditing: boolean
  onApplySuggestion: (suggestion: string) => void
  onCancel: (options?: { focusRoot?: boolean }) => void
  onChange: (value: string) => void
  onConfirm: () => void
  onMoveSuggestion: (delta: 1 | -1) => void
  onStart: () => void
  suggestionIndex: number
  suggestions: CommanderPathSuggestion[]
  value: string
}

export type CommanderPaneInteractions = {
  activate: () => void
  focusRoot: () => void
  openEntry: (entryId: string) => void
  setCursor: (entryId: string, options?: { rangeSelect?: boolean }) => void
  setSortMode: (sortMode: CommanderSortMode) => void
  toggleSelection: (entryId: string) => void
}

export type CommanderPaneController = {
  isActive: boolean
  interactions: CommanderPaneInteractions
  pane: CommanderPaneViewState
  pathEditor: CommanderPanePathEditor
  sort: {
    direction: CommanderSortDirection
    mode: CommanderSortMode
  }
}

type CommanderPaneControllerShared = {
  activePaneId: CommanderPaneViewState['id']
  interactions: {
    activatePane: (paneId: CommanderPaneViewState['id']) => void
    focusRoot: () => void
    openPaneEntry: (paneId: CommanderPaneViewState['id'], entryId: string) => void
    setPaneCursor: (
      paneId: CommanderPaneViewState['id'],
      entryId: string,
      options?: { rangeSelect?: boolean },
    ) => void
    setSortMode: (sortMode: CommanderSortMode) => void
    togglePaneSelection: (paneId: CommanderPaneViewState['id'], entryId: string) => void
  }
  pathEditor: {
    editingPaneId: CommanderPaneViewState['id'] | null
    inputRef: RefObject<HTMLInputElement | null>
    onApplySuggestion: (suggestion: string) => void
    onCancel: (options?: { focusRoot?: boolean }) => void
    onChange: (value: string) => void
    onConfirm: () => void
    onMoveSuggestion: (delta: 1 | -1) => void
    onStartPathEdit: (paneId: CommanderPaneViewState['id']) => void
    suggestionIndex: number
    suggestions: CommanderPathSuggestion[]
    value: string
  }
  sort: {
    direction: CommanderSortDirection
    mode: CommanderSortMode
  }
}

export function createCommanderPaneController(
  pane: CommanderPaneViewState,
  shared: CommanderPaneControllerShared,
): CommanderPaneController {
  const paneId = pane.id
  const isEditing = shared.pathEditor.editingPaneId === paneId

  return {
    isActive: shared.activePaneId === paneId,
    interactions: {
      activate: () => shared.interactions.activatePane(paneId),
      focusRoot: shared.interactions.focusRoot,
      openEntry: (entryId) => shared.interactions.openPaneEntry(paneId, entryId),
      setCursor: (entryId, options) => shared.interactions.setPaneCursor(paneId, entryId, options),
      setSortMode: shared.interactions.setSortMode,
      toggleSelection: (entryId) => shared.interactions.togglePaneSelection(paneId, entryId),
    },
    pane,
    pathEditor: {
      inputRef: shared.pathEditor.inputRef,
      isEditing,
      onApplySuggestion: shared.pathEditor.onApplySuggestion,
      onCancel: shared.pathEditor.onCancel,
      onChange: shared.pathEditor.onChange,
      onConfirm: shared.pathEditor.onConfirm,
      onMoveSuggestion: shared.pathEditor.onMoveSuggestion,
      onStart: () => shared.pathEditor.onStartPathEdit(paneId),
      suggestionIndex: shared.pathEditor.suggestionIndex,
      suggestions: isEditing ? shared.pathEditor.suggestions : [],
      value: shared.pathEditor.value,
    },
    sort: shared.sort,
  }
}
