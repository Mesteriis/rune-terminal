import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { CommanderPaneViewState } from '@/features/commander/model/types'
import { createCommanderPaneController } from '@/widgets/commander/commander-pane-controller'

function createPaneState(id: CommanderPaneViewState['id']): CommanderPaneViewState {
  return {
    id,
    path: `~/${id}`,
    filterQuery: '',
    canGoBack: false,
    canGoForward: false,
    counters: {
      items: 3,
      selectedItems: 1,
      selectedSize: '4 KB',
    },
    rows: [
      {
        id: `${id}-entry-1`,
        name: `${id}-alpha.txt`,
        ext: 'txt',
        kind: 'file',
        size: '4 KB',
        modified: '2026-04-20',
        hidden: false,
        selected: false,
        focused: true,
      },
    ],
  }
}

describe('createCommanderPaneController', () => {
  it('derives pane-scoped interactions for the requested pane id', () => {
    const activatePane = vi.fn()
    const focusRoot = vi.fn()
    const openPaneEntry = vi.fn()
    const setPaneCursor = vi.fn()
    const setSortMode = vi.fn()
    const togglePaneSelection = vi.fn()
    const pane = createPaneState('left')

    const controller = createCommanderPaneController(pane, {
      activePaneId: 'left',
      interactions: {
        activatePane,
        focusRoot,
        openPaneEntry,
        setPaneCursor,
        setSortMode,
        togglePaneSelection,
      },
      pathEditor: {
        editingPaneId: null,
        inputRef: createRef<HTMLInputElement>(),
        onApplySuggestion: vi.fn(),
        onCancel: vi.fn(),
        onChange: vi.fn(),
        onConfirm: vi.fn(),
        onMoveSuggestion: vi.fn(),
        onStartPathEdit: vi.fn(),
        suggestionIndex: 0,
        suggestions: [],
        value: pane.path,
      },
      sort: {
        direction: 'asc',
        mode: 'name',
      },
    })

    controller.interactions.activate()
    controller.interactions.focusRoot()
    controller.interactions.openEntry('entry-1')
    controller.interactions.setCursor('entry-2', { rangeSelect: true })
    controller.interactions.setSortMode('size')
    controller.interactions.toggleSelection('entry-3')

    expect(controller.isActive).toBe(true)
    expect(activatePane).toHaveBeenCalledWith('left')
    expect(focusRoot).toHaveBeenCalledOnce()
    expect(openPaneEntry).toHaveBeenCalledWith('left', 'entry-1')
    expect(setPaneCursor).toHaveBeenCalledWith('left', 'entry-2', { rangeSelect: true })
    expect(setSortMode).toHaveBeenCalledWith('size')
    expect(togglePaneSelection).toHaveBeenCalledWith('left', 'entry-3')
  })

  it('keeps path suggestions scoped to the pane currently being edited', () => {
    const onStartPathEdit = vi.fn()
    const leftPane = createPaneState('left')
    const rightPane = createPaneState('right')
    const shared = {
      activePaneId: 'left' as const,
      interactions: {
        activatePane: vi.fn(),
        focusRoot: vi.fn(),
        openPaneEntry: vi.fn(),
        setPaneCursor: vi.fn(),
        setSortMode: vi.fn(),
        togglePaneSelection: vi.fn(),
      },
      pathEditor: {
        editingPaneId: 'right' as const,
        inputRef: createRef<HTMLInputElement>(),
        onApplySuggestion: vi.fn(),
        onCancel: vi.fn(),
        onChange: vi.fn(),
        onConfirm: vi.fn(),
        onMoveSuggestion: vi.fn(),
        onStartPathEdit,
        suggestionIndex: 1,
        suggestions: [
          { path: '~/right/src', meta: 'dir' },
          { path: '~/right/test', meta: 'history' },
        ],
        value: '~/right',
      },
      sort: {
        direction: 'desc' as const,
        mode: 'modified' as const,
      },
    }

    const leftController = createCommanderPaneController(leftPane, shared)
    const rightController = createCommanderPaneController(rightPane, shared)

    expect(leftController.pathEditor.isEditing).toBe(false)
    expect(leftController.pathEditor.suggestions).toEqual([])
    expect(rightController.pathEditor.isEditing).toBe(true)
    expect(rightController.pathEditor.suggestions).toEqual(shared.pathEditor.suggestions)

    rightController.pathEditor.onStart()

    expect(onStartPathEdit).toHaveBeenCalledWith('right')
  })
})
