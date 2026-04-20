import { ChevronLeft, ChevronRight, Columns2, Columns3, Eye, EyeOff, Folder, FileCode2, FileText, Link2, SquareTerminal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useCommanderKeyboard } from '../features/commander/model/keyboard'
import { useCommanderActions, useCommanderWidget } from '../features/commander/model/hooks'
import type { CommanderFileRow, CommanderPaneViewState, CommanderWidgetViewState } from '../features/commander/model/types'
import { RunaDomScopeProvider, useRunaDomAutoTagging, useRunaDomScope } from '../shared/ui/dom-id'
import { Badge, Box, Input, ScrollArea, Separator, Surface, Text } from '../shared/ui/primitives'
import { IconButton } from '../shared/ui/components'

import {
  commanderFooterTextStyle,
  commanderHintActionStyle,
  commanderHeaderClusterStyle,
  commanderHeaderStyle,
  commanderIconControlStyle,
  commanderIconControlDisabledStyle,
  commanderHintBarStyle,
  commanderHintCellStyle,
  commanderHintKeyStyle,
  commanderHintLabelStyle,
  commanderListHeaderStyle,
  commanderMainStyle,
  commanderModeButtonActiveStyle,
  commanderModeButtonRowStyle,
  commanderPaneActiveStyle,
  commanderPaneFooterStyle,
  commanderPaneHeaderActiveStyle,
  commanderPaneHeaderStyle,
  commanderPaneMetaStyle,
  commanderPendingActionStyle,
  commanderPendingBarWithInputStyle,
  commanderPendingBarWithConflictStyle,
  commanderPendingBarStyle,
  commanderPendingInputStyle,
  commanderPendingMessageStyle,
  commanderPendingPreviewArrowStyle,
  commanderPendingPreviewConflictRowStyle,
  commanderPendingPreviewListStyle,
  commanderPendingPreviewRowStyle,
  commanderPendingPreviewTargetTextStyle,
  commanderPendingPreviewTextStyle,
  commanderPendingRenameHelpStyle,
  commanderPendingSupplementStyle,
  commanderPaneStyle,
  commanderPaneTitleStyle,
  commanderPathTextStyle,
  commanderRootStyle,
  commanderRowFocusedStyle,
  commanderRowHiddenStyle,
  commanderRowMetaTextStyle,
  commanderRowNameCellStyle,
  commanderRowNameTextStyle,
  commanderRowSymlinkArrowStyle,
  commanderRowSymlinkTargetStyle,
  commanderRowSelectedStyle,
  commanderRowStyle,
  commanderRowsStyle,
  commanderScrollAreaStyle,
  commanderToggleActiveStyle,
  commanderTypeBadgeStyle,
  commanderPendingWarningStyle,
} from './commander-widget.styles'

const plainClusterStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

const paneStateBadgeStyle = {
  minHeight: '18px',
  padding: '0 var(--space-xs)',
  borderColor: 'var(--runa-commander-highlight-badge-border)',
  background: 'var(--runa-commander-highlight-badge-bg)',
  color: 'var(--runa-commander-highlight-text)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '14px',
  textTransform: 'uppercase' as const,
}

const inactivePaneStateBadgeStyle = {
  ...paneStateBadgeStyle,
  borderColor: 'var(--runa-commander-surface-border)',
  background: 'rgba(145, 168, 161, 0.08)',
  color: 'var(--runa-commander-text-muted)',
}

const commanderViewModeIconMap = {
  commander: Columns2,
  split: Columns3,
  terminal: SquareTerminal,
} as const

function formatPendingOperationMessage(state: CommanderWidgetViewState) {
  const pendingOperation = state.pendingOperation

  if (!pendingOperation) {
    return null
  }

  const selectionLabel = pendingOperation.entryNames.length === 1
    ? pendingOperation.entryNames[0]
    : `${pendingOperation.entryNames.length} items`
  const conflictLabel = pendingOperation.conflictEntryNames?.length === 1
    ? pendingOperation.conflictEntryNames[0]
    : pendingOperation.conflictEntryNames?.length
      ? `${pendingOperation.conflictEntryNames.length} items`
      : null

  switch (pendingOperation.kind) {
    case 'copy':
      if (pendingOperation.conflictEntryNames?.length) {
        const currentConflictName = pendingOperation.conflictEntryNames[0]
        return `Conflict: ${currentConflictName} already exists in ${pendingOperation.targetPath}`
      }

      return `Copy ${selectionLabel} to ${pendingOperation.targetPath}`
    case 'move':
      if (pendingOperation.conflictEntryNames?.length) {
        const currentConflictName = pendingOperation.conflictEntryNames[0]
        return `Conflict: ${currentConflictName} already exists in ${pendingOperation.targetPath}`
      }

      return `Move ${selectionLabel} to ${pendingOperation.targetPath}`
    case 'delete':
      return `Delete ${selectionLabel} from ${pendingOperation.sourcePath}`
    case 'mkdir':
      return `Create ${pendingOperation.mkdirName} in ${pendingOperation.sourcePath}`
    case 'rename':
      if (pendingOperation.duplicateTargetNames?.length) {
        return `Template creates duplicate names in ${pendingOperation.sourcePath}`
      }

      if (pendingOperation.conflictEntryNames?.length) {
        return `Overwrite ${pendingOperation.inputValue} in ${pendingOperation.sourcePath}`
      }

      if (pendingOperation.renameMode === 'batch') {
        return `Rename ${selectionLabel} in ${pendingOperation.sourcePath}`
      }

      return `Rename ${pendingOperation.entryNames[0]} in ${pendingOperation.sourcePath}`
    default:
      return null
  }
}

function isPendingOperationBlocking(state: CommanderWidgetViewState) {
  return Boolean(state.pendingOperation?.duplicateTargetNames?.length)
}

function isPendingOperationConflictResolution(state: CommanderWidgetViewState) {
  return Boolean(
    state.pendingOperation
    && (state.pendingOperation.kind === 'copy' || state.pendingOperation.kind === 'move')
    && state.pendingOperation.conflictEntryNames?.length,
  )
}

function getRowIcon(row: CommanderFileRow) {
  if (row.kind === 'folder') {
    return <Folder color="var(--runa-commander-folder-icon-color)" size={14} strokeWidth={1.8} />
  }

  if (row.kind === 'symlink') {
    return <Link2 color="var(--runa-commander-folder-icon-color)" size={14} strokeWidth={1.8} />
  }

  if (row.ext === 'tsx' || row.ext === 'ts' || row.ext === 'sh') {
    return <FileCode2 color="var(--runa-commander-file-icon-color)" size={14} strokeWidth={1.8} />
  }

  return <FileText color="var(--runa-commander-file-icon-color)" size={14} strokeWidth={1.8} />
}

function getRowTypeLabel(row: CommanderFileRow) {
  if (row.kind === 'folder') {
    return 'DIR'
  }

  if (row.kind === 'symlink') {
    return 'LINK'
  }

  if (row.executable) {
    return 'EXE'
  }

  return row.ext ? row.ext.toUpperCase() : 'FILE'
}

function CommanderPane({
  isActive,
  pane,
  onActivate,
  onFocusRoot,
  onOpenEntry,
  onSetCursor,
  onToggleSelection,
}: {
  isActive: boolean
  onActivate: () => void
  onFocusRoot: () => void
  onOpenEntry: (entryId: string) => void
  onSetCursor: (entryId: string, options?: { rangeSelect?: boolean }) => void
  onToggleSelection: (entryId: string) => void
  pane: CommanderPaneViewState
}) {
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const focusedRowId = useMemo(
    () => pane.rows.find((row) => row.focused)?.id ?? null,
    [pane.rows],
  )

  useEffect(() => {
    if (!focusedRowId) {
      return
    }

    rowRefs.current[focusedRowId]?.scrollIntoView({
      block: 'nearest',
    })
  }, [focusedRowId])

  return (
    <Surface
      onPointerDown={() => {
        onActivate()
        onFocusRoot()
      }}
      runaComponent={`commander-pane-${pane.id}`}
      style={{ ...commanderPaneStyle, ...(isActive ? commanderPaneActiveStyle : null) }}
    >
      <Box
        runaComponent={`commander-pane-${pane.id}-header`}
        style={{
          ...commanderPaneHeaderStyle,
          ...(isActive ? commanderPaneHeaderActiveStyle : null),
        }}
      >
        <Box runaComponent={`commander-pane-${pane.id}-title`} style={commanderPaneTitleStyle}>
          <Badge runaComponent={`commander-pane-${pane.id}-state`} style={isActive ? paneStateBadgeStyle : inactivePaneStateBadgeStyle}>
            {isActive ? 'ACTIVE' : 'PANE'}
          </Badge>
          <Text runaComponent={`commander-pane-${pane.id}-path`} style={commanderPathTextStyle}>{pane.path}</Text>
        </Box>
        <Text runaComponent={`commander-pane-${pane.id}-items`} style={commanderPaneMetaStyle}>{pane.counters.items} items</Text>
      </Box>
      <Separator runaComponent={`commander-pane-${pane.id}-header-separator`} />
      <Box runaComponent={`commander-pane-${pane.id}-list-header`} style={commanderListHeaderStyle}>
        <Text runaComponent={`commander-pane-${pane.id}-column-type`} style={commanderPaneMetaStyle}>T</Text>
        <Text runaComponent={`commander-pane-${pane.id}-column-name`} style={commanderPaneMetaStyle}>Name</Text>
        <Text runaComponent={`commander-pane-${pane.id}-column-git`} style={commanderPaneMetaStyle}>Git</Text>
        <Text runaComponent={`commander-pane-${pane.id}-column-size`} style={commanderPaneMetaStyle}>Size</Text>
        <Text runaComponent={`commander-pane-${pane.id}-column-modified`} style={commanderPaneMetaStyle}>Modified</Text>
      </Box>
      <Separator runaComponent={`commander-pane-${pane.id}-list-separator`} />
      <ScrollArea runaComponent={`commander-pane-${pane.id}-scroll-area`} style={commanderScrollAreaStyle}>
        <Box runaComponent={`commander-pane-${pane.id}-rows`} style={commanderRowsStyle}>
          {pane.rows.map((row) => (
            <Box
              key={row.id}
              onClick={(event) => {
                onActivate()
                onSetCursor(row.id, {
                  rangeSelect: event.shiftKey,
                })
                onFocusRoot()

                if (event.metaKey || event.ctrlKey) {
                  onToggleSelection(row.id)
                }
              }}
              onDoubleClick={() => {
                onActivate()
                onOpenEntry(row.id)
                onFocusRoot()
              }}
              ref={(node: HTMLDivElement | null) => {
                rowRefs.current[row.id] = node
              }}
              runaComponent={`commander-pane-${pane.id}-row-${row.id}`}
              style={{
                ...commanderRowStyle,
                ...(row.selected ? commanderRowSelectedStyle : null),
                ...(row.focused ? commanderRowFocusedStyle : null),
                ...(row.hidden ? commanderRowHiddenStyle : null),
              }}
            >
              <Box runaComponent={`commander-pane-${pane.id}-row-${row.id}-icon`} style={{ ...plainClusterStyle, justifyContent: 'center' }}>{getRowIcon(row)}</Box>
              <Box runaComponent={`commander-pane-${pane.id}-row-${row.id}-name-cell`} style={commanderRowNameCellStyle}>
                <Text runaComponent={`commander-pane-${pane.id}-row-${row.id}-name`} style={commanderRowNameTextStyle}>{row.name}</Text>
                <Badge runaComponent={`commander-pane-${pane.id}-row-${row.id}-type`} style={commanderTypeBadgeStyle}>{getRowTypeLabel(row)}</Badge>
                {row.kind === 'symlink' && row.symlinkTarget ? (
                  <>
                    <Text runaComponent={`commander-pane-${pane.id}-row-${row.id}-symlink-arrow`} style={commanderRowSymlinkArrowStyle}>-&gt;</Text>
                    <Text runaComponent={`commander-pane-${pane.id}-row-${row.id}-symlink-target`} style={commanderRowSymlinkTargetStyle}>{row.symlinkTarget}</Text>
                  </>
                ) : null}
              </Box>
              <Text runaComponent={`commander-pane-${pane.id}-row-${row.id}-git`} style={commanderRowMetaTextStyle}>{row.gitStatus ?? ''}</Text>
              <Text runaComponent={`commander-pane-${pane.id}-row-${row.id}-size`} style={commanderRowMetaTextStyle}>{row.kind === 'symlink' ? '' : row.size}</Text>
              <Text runaComponent={`commander-pane-${pane.id}-row-${row.id}-modified`} style={commanderRowMetaTextStyle}>{row.modified}</Text>
            </Box>
          ))}
        </Box>
      </ScrollArea>
      <Separator runaComponent={`commander-pane-${pane.id}-footer-separator`} />
      <Box runaComponent={`commander-pane-${pane.id}-footer`} style={commanderPaneFooterStyle}>
        <Text runaComponent={`commander-pane-${pane.id}-selected-count`} style={commanderFooterTextStyle}>
          {pane.counters.selectedItems} selected
        </Text>
        <Text runaComponent={`commander-pane-${pane.id}-selected-size`} style={commanderFooterTextStyle}>{pane.counters.selectedSize}</Text>
      </Box>
    </Surface>
  )
}

export function CommanderWidget() {
  const { widget: widgetId } = useRunaDomScope()
  const { actions, state } = useCommanderWidget(widgetId)
  const commanderActions = useCommanderActions(widgetId)
  const activePane = state.activePane === 'left' ? state.leftPane : state.rightPane
  const onCommanderKeyDownCapture = useCommanderKeyboard(
    widgetId,
    state.activePane,
    activePane.rows,
    state.pendingOperation,
  )
  const autoTagCommanderRoot = useRunaDomAutoTagging('commander-root')
  const commanderRootRef = useRef<HTMLDivElement | null>(null)
  const pendingRenameInputRef = useRef<HTMLInputElement | null>(null)
  const hadPendingOperationRef = useRef(false)
  const pendingOperationMessage = useMemo(() => formatPendingOperationMessage(state), [state])
  const disableHistoryControls = Boolean(state.pendingOperation)
  const pendingOperationNeedsInput = state.pendingOperation?.kind === 'rename'
  const pendingOperationIsBlocking = isPendingOperationBlocking(state)
  const pendingOperationNeedsConflictResolution = isPendingOperationConflictResolution(state)
  const pendingRenamePreview = state.pendingOperation?.kind === 'rename'
    ? (state.pendingOperation.renamePreview ?? [])
    : []

  const attachCommanderRootRef = useCallback((node: HTMLDivElement | null) => {
    commanderRootRef.current = node
    autoTagCommanderRoot(node)
  }, [autoTagCommanderRoot])

  const focusCommanderRoot = useCallback(() => {
    commanderRootRef.current?.focus({
      preventScroll: true,
    })
  }, [])

  useEffect(() => {
    if (!pendingOperationNeedsInput) {
      return
    }

    const inputNode = pendingRenameInputRef.current

    if (!inputNode) {
      return
    }

    inputNode.focus()
    inputNode.select()
  }, [pendingOperationNeedsInput, state.pendingOperation?.inputValue])

  useEffect(() => {
    if (hadPendingOperationRef.current && !state.pendingOperation) {
      focusCommanderRoot()
    }

    hadPendingOperationRef.current = Boolean(state.pendingOperation)
  }, [focusCommanderRoot, state.pendingOperation])

  const handleHintAction = useCallback((hintKey: string) => {
    switch (hintKey) {
      case 'F2':
        commanderActions.renameSelection()
        break
      case 'F3':
        commanderActions.openActiveEntry()
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
      default:
        break
    }

    focusCommanderRoot()
  }, [commanderActions, focusCommanderRoot])

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
      <Surface runaComponent="commander-header" style={commanderHeaderStyle}>
        <Box runaComponent="commander-header-mode-cluster" style={commanderHeaderClusterStyle}>
          <IconButton
            aria-label={`Go back in ${state.activePane} pane`}
            disabled={disableHistoryControls || !activePane.canGoBack}
            onClick={() => {
              commanderActions.goBack()
              focusCommanderRoot()
            }}
            runaComponent="commander-history-back"
            size="sm"
            style={{
              ...commanderIconControlStyle,
              ...((disableHistoryControls || !activePane.canGoBack) ? commanderIconControlDisabledStyle : null),
            }}
          >
            <ChevronLeft size={14} strokeWidth={1.8} />
          </IconButton>
          <IconButton
            aria-label={`Go forward in ${state.activePane} pane`}
            disabled={disableHistoryControls || !activePane.canGoForward}
            onClick={() => {
              commanderActions.goForward()
              focusCommanderRoot()
            }}
            runaComponent="commander-history-forward"
            size="sm"
            style={{
              ...commanderIconControlStyle,
              ...((disableHistoryControls || !activePane.canGoForward) ? commanderIconControlDisabledStyle : null),
            }}
          >
            <ChevronRight size={14} strokeWidth={1.8} />
          </IconButton>
          <Box role="tablist" runaComponent="commander-view-mode-list" style={commanderModeButtonRowStyle}>
            {(['commander', 'split', 'terminal'] as const).map((mode) => (
              <IconButton
                aria-label={`Set commander view mode to ${mode}`}
                aria-pressed={state.viewMode === mode}
                key={mode}
                onClick={() => actions.setViewMode(mode)}
                runaComponent={`commander-view-mode-${mode}`}
                size="sm"
                style={{
                  ...commanderIconControlStyle,
                  ...(state.viewMode === mode ? commanderModeButtonActiveStyle : null),
                }}
              >
                {(() => {
                  const ModeIcon = commanderViewModeIconMap[mode]
                  return <ModeIcon size={14} strokeWidth={1.8} />
                })()}
              </IconButton>
            ))}
          </Box>
        </Box>
        <Box runaComponent="commander-header-toggle-cluster" style={commanderHeaderClusterStyle}>
          <IconButton
            aria-label={state.showHidden ? 'Hide hidden files' : 'Show hidden files'}
            aria-pressed={state.showHidden}
            onClick={() => actions.toggleShowHidden()}
            runaComponent="commander-toggle-show-hidden"
            size="sm"
            style={{
              ...commanderIconControlStyle,
              ...(state.showHidden ? commanderToggleActiveStyle : null),
            }}
          >
            {state.showHidden ? <Eye size={14} strokeWidth={1.8} /> : <EyeOff size={14} strokeWidth={1.8} />}
          </IconButton>
        </Box>
      </Surface>
      <Box runaComponent="commander-main" style={commanderMainStyle}>
        <CommanderPane
          isActive={state.activePane === 'left'}
          onActivate={() => actions.setActivePane('left')}
          onFocusRoot={focusCommanderRoot}
          onOpenEntry={(entryId) => actions.openPaneEntry('left', entryId)}
          onSetCursor={(entryId, options) => actions.setPaneCursor('left', entryId, options)}
          onToggleSelection={(entryId) => actions.togglePaneSelection('left', entryId)}
          pane={state.leftPane}
        />
        <CommanderPane
          isActive={state.activePane === 'right'}
          onActivate={() => actions.setActivePane('right')}
          onFocusRoot={focusCommanderRoot}
          onOpenEntry={(entryId) => actions.openPaneEntry('right', entryId)}
          onSetCursor={(entryId, options) => actions.setPaneCursor('right', entryId, options)}
          onToggleSelection={(entryId) => actions.togglePaneSelection('right', entryId)}
          pane={state.rightPane}
        />
      </Box>
      {state.pendingOperation && pendingOperationMessage ? (
        <Surface
          runaComponent="commander-pending-bar"
          style={{
            ...commanderPendingBarStyle,
            ...(pendingOperationNeedsInput ? commanderPendingBarWithInputStyle : null),
            ...(pendingOperationNeedsConflictResolution ? commanderPendingBarWithConflictStyle : null),
          }}
        >
          <Box runaComponent="commander-pending-message" style={commanderPendingMessageStyle}>
            <Text runaComponent="commander-pending-message-text" style={{ color: 'inherit' }}>{pendingOperationMessage}</Text>
          </Box>
          {pendingOperationNeedsInput ? (
            <Input
              aria-label="Commander pending operation input"
              onChange={(event) => commanderActions.setPendingOperationInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.stopPropagation()
                  if (pendingOperationIsBlocking) {
                    return
                  }
                  commanderActions.confirmPendingOperation()
                  return
                }

                if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  commanderActions.cancelPendingOperation()
                  focusCommanderRoot()
                }
              }}
              ref={pendingRenameInputRef}
              runaComponent="commander-pending-input"
              style={commanderPendingInputStyle}
              value={state.pendingOperation.inputValue ?? ''}
            />
          ) : null}
          {pendingOperationNeedsConflictResolution ? (
            <>
              <Box
                onClick={() => {
                  commanderActions.overwritePendingConflict()
                  focusCommanderRoot()
                }}
                role="button"
                runaComponent="commander-pending-overwrite"
                style={{
                  ...commanderHintCellStyle,
                  ...commanderPendingActionStyle,
                }}
                tabIndex={-1}
              >
                <Text runaComponent="commander-pending-overwrite-key" style={commanderHintKeyStyle}>ENTER</Text>
                <Text runaComponent="commander-pending-overwrite-label" style={commanderHintLabelStyle}>Overwrite</Text>
              </Box>
              <Box
                onClick={() => {
                  commanderActions.skipPendingConflict()
                  focusCommanderRoot()
                }}
                role="button"
                runaComponent="commander-pending-skip"
                style={{
                  ...commanderHintCellStyle,
                  ...commanderPendingActionStyle,
                }}
                tabIndex={-1}
              >
                <Text runaComponent="commander-pending-skip-key" style={commanderHintKeyStyle}>SPACE</Text>
                <Text runaComponent="commander-pending-skip-label" style={commanderHintLabelStyle}>Skip</Text>
              </Box>
              <Box
                onClick={() => {
                  commanderActions.overwriteAllPendingConflicts()
                  focusCommanderRoot()
                }}
                role="button"
                runaComponent="commander-pending-overwrite-all"
                style={{
                  ...commanderHintCellStyle,
                  ...commanderPendingActionStyle,
                }}
                tabIndex={-1}
              >
                <Text runaComponent="commander-pending-overwrite-all-key" style={commanderHintKeyStyle}>SHIFT+ENTER</Text>
                <Text runaComponent="commander-pending-overwrite-all-label" style={commanderHintLabelStyle}>Overwrite all</Text>
              </Box>
              <Box
                onClick={() => {
                  commanderActions.skipAllPendingConflicts()
                  focusCommanderRoot()
                }}
                role="button"
                runaComponent="commander-pending-skip-all"
                style={{
                  ...commanderHintCellStyle,
                  ...commanderPendingActionStyle,
                }}
                tabIndex={-1}
              >
                <Text runaComponent="commander-pending-skip-all-key" style={commanderHintKeyStyle}>SHIFT+SPACE</Text>
                <Text runaComponent="commander-pending-skip-all-label" style={commanderHintLabelStyle}>Skip all</Text>
              </Box>
            </>
          ) : (
            <Box
              onClick={() => {
                if (pendingOperationIsBlocking) {
                  return
                }
                commanderActions.confirmPendingOperation()
                if (!pendingOperationNeedsInput) {
                  focusCommanderRoot()
                }
              }}
              role="button"
              runaComponent="commander-pending-confirm"
              style={{
                ...commanderHintCellStyle,
                ...commanderPendingActionStyle,
              }}
              tabIndex={-1}
            >
              <Text runaComponent="commander-pending-confirm-key" style={commanderHintKeyStyle}>ENTER</Text>
              <Text runaComponent="commander-pending-confirm-label" style={commanderHintLabelStyle}>{pendingOperationIsBlocking ? 'Fix template' : 'Confirm'}</Text>
            </Box>
          )}
          <Box
            onClick={() => {
              commanderActions.cancelPendingOperation()
              focusCommanderRoot()
            }}
            role="button"
            runaComponent="commander-pending-cancel"
            style={{
              ...commanderHintCellStyle,
              ...commanderPendingActionStyle,
            }}
            tabIndex={-1}
          >
            <Text runaComponent="commander-pending-cancel-key" style={commanderHintKeyStyle}>ESC</Text>
            <Text runaComponent="commander-pending-cancel-label" style={commanderHintLabelStyle}>Cancel</Text>
          </Box>
          {pendingOperationNeedsInput ? (
            <Box runaComponent="commander-pending-rename-supplement" style={commanderPendingSupplementStyle}>
              <Box runaComponent="commander-pending-rename-help" style={commanderPendingRenameHelpStyle}>
                <Text runaComponent="commander-pending-rename-help-name" style={{ color: 'inherit' }}>[N] name</Text>
                <Text runaComponent="commander-pending-rename-help-ext" style={{ color: 'inherit' }}>[E] ext</Text>
                <Text runaComponent="commander-pending-rename-help-full" style={{ color: 'inherit' }}>[F] full</Text>
                <Text runaComponent="commander-pending-rename-help-counter" style={{ color: 'inherit' }}>[C] counter</Text>
                <Text runaComponent="commander-pending-rename-help-counter-width" style={{ color: 'inherit' }}>[C:2] padded counter</Text>
              </Box>
              {state.pendingOperation?.duplicateTargetNames?.length ? (
                <Box runaComponent="commander-pending-rename-duplicate-warning" style={commanderPendingWarningStyle}>
                  <Text runaComponent="commander-pending-rename-duplicate-warning-text" style={{ color: 'inherit' }}>
                    Duplicate targets: {state.pendingOperation.duplicateTargetNames.join(', ')}
                  </Text>
                </Box>
              ) : null}
              {pendingRenamePreview.length > 0 ? (
                <Box runaComponent="commander-pending-rename-preview-list" style={commanderPendingPreviewListStyle}>
                  {pendingRenamePreview.slice(0, 4).map((previewItem, index) => (
                    <Box
                      key={previewItem.entryId}
                      runaComponent={`commander-pending-rename-preview-${index + 1}`}
                      style={{
                        ...commanderPendingPreviewRowStyle,
                        ...(previewItem.conflict ? commanderPendingPreviewConflictRowStyle : null),
                      }}
                    >
                      <Text runaComponent={`commander-pending-rename-preview-${index + 1}-current`} style={commanderPendingPreviewTextStyle}>
                        {previewItem.currentName}
                      </Text>
                      <Text runaComponent={`commander-pending-rename-preview-${index + 1}-arrow`} style={commanderPendingPreviewArrowStyle}>
                        →
                      </Text>
                      <Text runaComponent={`commander-pending-rename-preview-${index + 1}-next`} style={commanderPendingPreviewTargetTextStyle}>
                        {previewItem.nextName || 'Invalid name'}
                      </Text>
                    </Box>
                  ))}
                  {pendingRenamePreview.length > 4 ? (
                    <Box runaComponent="commander-pending-rename-preview-more" style={commanderPendingRenameHelpStyle}>
                      <Text runaComponent="commander-pending-rename-preview-more-text" style={{ color: 'inherit' }}>
                        +{pendingRenamePreview.length - 4} more
                      </Text>
                    </Box>
                  ) : null}
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Surface>
      ) : (
        <Surface runaComponent="commander-hint-bar" style={commanderHintBarStyle}>
          {state.footerHints.map((hint) => (
            <Box
              key={hint.key}
              onClick={() => handleHintAction(hint.key)}
              role="button"
              runaComponent={`commander-hint-${hint.key.toLowerCase()}`}
              style={{
                ...commanderHintCellStyle,
                ...commanderHintActionStyle,
              }}
              tabIndex={-1}
            >
              <Text runaComponent={`commander-hint-${hint.key.toLowerCase()}-key`} style={commanderHintKeyStyle}>{hint.key}</Text>
              <Text runaComponent={`commander-hint-${hint.key.toLowerCase()}-label`} style={commanderHintLabelStyle}>{hint.label}</Text>
            </Box>
          ))}
        </Surface>
      )}
    </Box>
    </RunaDomScopeProvider>
  )
}
