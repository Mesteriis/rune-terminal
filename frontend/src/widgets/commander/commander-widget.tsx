import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { listCommanderDirectoryPaths } from '@/features/commander/model/fake-client'
import { useCommanderKeyboard } from '@/features/commander/model/keyboard'
import { useCommanderActions, useCommanderWidget } from '@/features/commander/model/hooks'
import type { CommanderPaneViewState } from '@/features/commander/model/types'
import { RunaDomScopeProvider, useRunaDomAutoTagging, useRunaDomScope } from '@/shared/ui/dom-id'
import { Box } from '@/shared/ui/primitives'

import { CommanderFileDialog } from '@/widgets/commander/commander-file-dialog'
import { CommanderHeaderRow } from '@/widgets/commander/commander-header-row'
import { createCommanderPaneController } from '@/widgets/commander/commander-pane-controller'
import { CommanderPane } from '@/widgets/commander/commander-pane'
import { CommanderPendingBar } from '@/widgets/commander/commander-pending-bar'
import { commanderMainStyle, commanderRootStyle } from '@/widgets/commander/commander-widget.styles'
import { getCommanderPathSuggestions, joinCommanderPath } from '@/widgets/commander/commander-widget.shared'

export function CommanderWidget() {
  const { widget: widgetId } = useRunaDomScope()
  const { actions, runtimeState, state } = useCommanderWidget(widgetId)
  const commanderActions = useCommanderActions(widgetId)
  const activePane = state.activePane === 'left' ? state.leftPane : state.rightPane
  const [editingPathPaneId, setEditingPathPaneId] = useState<CommanderPaneViewState['id'] | null>(null)
  const [editingPathValue, setEditingPathValue] = useState('')
  const [pathSuggestionIndex, setPathSuggestionIndex] = useState(0)
  const onCommanderKeyDownCapture = useCommanderKeyboard(
    widgetId,
    state.activePane,
    activePane.rows,
    state.pendingOperation,
    state.fileDialog,
    {
      onRequestPathEdit: () => {
        if (state.pendingOperation || state.fileDialog) {
          return
        }

        setEditingPathPaneId(state.activePane)
        setEditingPathValue(activePane.path)
        setPathSuggestionIndex(0)
      },
    },
  )
  const autoTagCommanderRoot = useRunaDomAutoTagging('commander-root')
  const commanderRootRef = useRef<HTMLDivElement | null>(null)
  const pendingRenameInputRef = useRef<HTMLInputElement | null>(null)
  const pathEditInputRef = useRef<HTMLInputElement | null>(null)
  const hadPendingOperationRef = useRef(false)
  const lastPendingInputIdentityRef = useRef<string | null>(null)
  const pendingOperationNeedsInput =
    state.pendingOperation?.kind === 'rename' ||
    state.pendingOperation?.kind === 'select' ||
    state.pendingOperation?.kind === 'unselect' ||
    state.pendingOperation?.kind === 'filter' ||
    state.pendingOperation?.kind === 'search'
  const pendingInputIdentity =
    pendingOperationNeedsInput && state.pendingOperation
      ? [
          state.pendingOperation.kind,
          state.pendingOperation.sourcePaneId,
          state.pendingOperation.sourcePath,
          state.pendingOperation.renameMode ?? '',
          state.pendingOperation.entryIds.join(','),
        ].join(':')
      : null
  const activeFileDialogPath = state.fileDialog
    ? joinCommanderPath(state.fileDialog.path, state.fileDialog.entryName)
    : ''
  const isFileDialogDirty = Boolean(
    state.fileDialog &&
    state.fileDialog.mode === 'edit' &&
    state.fileDialog.draftValue !== state.fileDialog.content,
  )

  const attachCommanderRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      commanderRootRef.current = node
      autoTagCommanderRoot(node)
    },
    [autoTagCommanderRoot],
  )

  const focusCommanderRoot = useCallback(() => {
    commanderRootRef.current?.focus({
      preventScroll: true,
    })
  }, [])

  const startPathEdit = useCallback(
    (paneId: CommanderPaneViewState['id']) => {
      if (state.pendingOperation || state.fileDialog) {
        return
      }

      const pane = paneId === 'left' ? state.leftPane : state.rightPane
      actions.setActivePane(paneId)
      setEditingPathPaneId(paneId)
      setEditingPathValue(pane.path)
      setPathSuggestionIndex(0)
    },
    [actions, state.fileDialog, state.leftPane, state.pendingOperation, state.rightPane],
  )

  const cancelPathEdit = useCallback(
    (options?: { focusRoot?: boolean }) => {
      setEditingPathPaneId(null)
      setEditingPathValue('')
      setPathSuggestionIndex(0)

      if (options?.focusRoot ?? true) {
        focusCommanderRoot()
      }
    },
    [focusCommanderRoot],
  )

  const editingPathPaneRuntimeState =
    editingPathPaneId === 'left'
      ? runtimeState.leftPane
      : editingPathPaneId === 'right'
        ? runtimeState.rightPane
        : null
  const editingPathSuggestions = useMemo(
    () =>
      editingPathPaneRuntimeState
        ? getCommanderPathSuggestions(
            editingPathValue,
            editingPathPaneRuntimeState,
            listCommanderDirectoryPaths(widgetId),
          )
        : [],
    [editingPathPaneRuntimeState, editingPathValue, widgetId],
  )

  useEffect(() => {
    if (editingPathSuggestions.length === 0) {
      setPathSuggestionIndex(0)
      return
    }

    setPathSuggestionIndex((currentIndex) => Math.min(currentIndex, editingPathSuggestions.length - 1))
  }, [editingPathSuggestions])

  const applyPathSuggestion = useCallback((suggestionPath: string) => {
    setEditingPathValue(suggestionPath)
    setPathSuggestionIndex(0)
  }, [])

  const handlePathEditValueChange = useCallback((nextValue: string) => {
    setEditingPathValue(nextValue)
    setPathSuggestionIndex(0)
  }, [])

  const movePathSuggestion = useCallback(
    (delta: 1 | -1) => {
      setPathSuggestionIndex((currentIndex) => {
        if (editingPathSuggestions.length === 0) {
          return 0
        }

        return (currentIndex + delta + editingPathSuggestions.length) % editingPathSuggestions.length
      })
    },
    [editingPathSuggestions.length],
  )

  const confirmPathEdit = useCallback(() => {
    if (!editingPathPaneId) {
      return
    }

    const suggestedPath = editingPathSuggestions[pathSuggestionIndex]?.path
    const nextPath = (suggestedPath ?? editingPathValue).trim()

    setEditingPathPaneId(null)
    setEditingPathValue('')
    setPathSuggestionIndex(0)

    if (nextPath) {
      commanderActions.setPanePath(editingPathPaneId, nextPath)
    }

    focusCommanderRoot()
  }, [
    commanderActions,
    editingPathPaneId,
    editingPathSuggestions,
    editingPathValue,
    focusCommanderRoot,
    pathSuggestionIndex,
  ])

  useEffect(() => {
    if (!pendingOperationNeedsInput) {
      lastPendingInputIdentityRef.current = null
      return
    }

    const inputNode = pendingRenameInputRef.current

    if (!inputNode) {
      return
    }

    inputNode.focus()

    if (pendingInputIdentity && pendingInputIdentity !== lastPendingInputIdentityRef.current) {
      inputNode.select()
      lastPendingInputIdentityRef.current = pendingInputIdentity
    }
  }, [pendingInputIdentity, pendingOperationNeedsInput])

  useEffect(() => {
    if (hadPendingOperationRef.current && !state.pendingOperation) {
      focusCommanderRoot()
    }

    hadPendingOperationRef.current = Boolean(state.pendingOperation)
  }, [focusCommanderRoot, state.pendingOperation])

  useEffect(() => {
    if (!editingPathPaneId || state.pendingOperation) {
      return
    }

    pathEditInputRef.current?.focus()
    pathEditInputRef.current?.select()
  }, [editingPathPaneId, state.pendingOperation])

  useEffect(() => {
    if (state.pendingOperation && editingPathPaneId) {
      setEditingPathPaneId(null)
      setEditingPathValue('')
      setPathSuggestionIndex(0)
    }
  }, [editingPathPaneId, state.pendingOperation])

  useEffect(() => {
    if (state.fileDialog && editingPathPaneId) {
      setEditingPathPaneId(null)
      setEditingPathValue('')
      setPathSuggestionIndex(0)
    }
  }, [editingPathPaneId, state.fileDialog])

  const handleHintAction = useCallback(
    (hintKey: string) => {
      switch (hintKey) {
        case 'F2':
          commanderActions.renameSelection()
          break
        case 'F3':
          commanderActions.viewActiveFile()
          break
        case 'F4':
          commanderActions.editActiveFile()
          break
        case 'F5':
          commanderActions.copySelection()
          break
        case 'F6':
          commanderActions.moveSelection()
          break
        case 'F7':
          commanderActions.mkdir()
          break
        case 'F8':
          commanderActions.deleteSelection()
          break
        case 'NUM+':
          commanderActions.selectByMask()
          break
        case 'NUM-':
          commanderActions.unselectByMask()
          break
        case 'NUM*':
          commanderActions.invertSelection()
          break
        case 'CTRL+F':
          commanderActions.filterActivePane()
          break
        case 'CTRL+S':
          commanderActions.searchActivePane()
          break
        case 'CTRL+BS':
          commanderActions.clearActivePaneFilter()
          break
        case 'CTRL+L':
          startPathEdit(state.activePane)
          return
        default:
          break
      }

      focusCommanderRoot()
    },
    [commanderActions, focusCommanderRoot, startPathEdit, state.activePane],
  )

  const commanderPaneControllerShared = useMemo(
    () => ({
      activePaneId: state.activePane,
      interactions: {
        activatePane: actions.setActivePane,
        focusRoot: focusCommanderRoot,
        openPaneEntry: actions.openPaneEntry,
        setPaneCursor: actions.setPaneCursor,
        setSortMode: commanderActions.setSortMode,
        togglePaneSelection: actions.togglePaneSelection,
      },
      pathEditor: {
        editingPaneId: editingPathPaneId,
        inputRef: pathEditInputRef,
        onApplySuggestion: applyPathSuggestion,
        onCancel: cancelPathEdit,
        onChange: handlePathEditValueChange,
        onConfirm: confirmPathEdit,
        onMoveSuggestion: movePathSuggestion,
        onStartPathEdit: startPathEdit,
        suggestionIndex: pathSuggestionIndex,
        suggestions: editingPathSuggestions,
        value: editingPathValue,
      },
      sort: {
        direction: state.sortDirection,
        mode: state.sortMode,
      },
    }),
    [
      actions.openPaneEntry,
      actions.setActivePane,
      actions.setPaneCursor,
      actions.togglePaneSelection,
      applyPathSuggestion,
      cancelPathEdit,
      commanderActions.setSortMode,
      confirmPathEdit,
      editingPathPaneId,
      editingPathSuggestions,
      editingPathValue,
      focusCommanderRoot,
      handlePathEditValueChange,
      movePathSuggestion,
      pathSuggestionIndex,
      startPathEdit,
      state.activePane,
      state.sortDirection,
      state.sortMode,
    ],
  )
  const leftPaneController = useMemo(
    () => createCommanderPaneController(state.leftPane, commanderPaneControllerShared),
    [commanderPaneControllerShared, state.leftPane],
  )
  const rightPaneController = useMemo(
    () => createCommanderPaneController(state.rightPane, commanderPaneControllerShared),
    [commanderPaneControllerShared, state.rightPane],
  )

  return (
    <RunaDomScopeProvider component="commander-widget">
      <Box
        data-runa-commander-root=""
        onKeyDownCapture={onCommanderKeyDownCapture}
        ref={attachCommanderRootRef}
        runaComponent="commander-root"
        style={commanderRootStyle}
        tabIndex={0}
      >
        <CommanderHeaderRow
          actions={actions}
          commanderActions={commanderActions}
          onFocusRoot={focusCommanderRoot}
          state={state}
        />
        <Box runaComponent="commander-main" style={commanderMainStyle}>
          <CommanderPane controller={leftPaneController} />
          <CommanderPane controller={rightPaneController} />
        </Box>
        <CommanderPendingBar
          commanderActions={commanderActions}
          onFocusRoot={focusCommanderRoot}
          onHintAction={handleHintAction}
          pendingInputRef={pendingRenameInputRef}
          state={state}
        />
        {state.fileDialog ? (
          <CommanderFileDialog
            content={state.fileDialog.draftValue}
            dirty={isFileDialogDirty}
            entryName={state.fileDialog.entryName}
            entryPath={activeFileDialogPath}
            mode={state.fileDialog.mode}
            onChange={(value) => commanderActions.setFileDialogDraft(value)}
            onClose={() => {
              commanderActions.closeFileDialog()
              focusCommanderRoot()
            }}
            onSave={() => {
              commanderActions.saveFileDialog()
              focusCommanderRoot()
            }}
          />
        ) : null}
      </Box>
    </RunaDomScopeProvider>
  )
}
