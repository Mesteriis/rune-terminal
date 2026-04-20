import { ChevronLeft, ChevronRight, Columns2, Columns3, Eye, EyeOff, FileCode2, FileText, Folder, FolderTree, Link2, SquareTerminal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type RefObject } from 'react'

import { listCommanderDirectoryPaths } from '../features/commander/model/fake-client'
import { useCommanderKeyboard } from '../features/commander/model/keyboard'
import { useCommanderActions, useCommanderWidget } from '../features/commander/model/hooks'
import type {
  CommanderFileRow,
  CommanderPaneRuntimeState,
  CommanderPaneViewState,
  CommanderRenamePreviewItem,
  CommanderRenamePreviewStatus,
  CommanderSortDirection,
  CommanderSortMode,
  CommanderWidgetViewState,
} from '../features/commander/model/types'
import { RunaDomScopeProvider, useRunaDomAutoTagging, useRunaDomIdentity, useRunaDomScope } from '../shared/ui/dom-id'
import { Badge, Box, Button, Input, ScrollArea, Separator, Surface, Text, TextArea } from '../shared/ui/primitives'
import { IconButton } from '../shared/ui/components'

import {
  commanderFileDialogActionsStyle,
  commanderFileDialogClosePromptStyle,
  commanderFileDialogFooterStyle,
  commanderFileDialogHeaderStyle,
  commanderFileDialogHintStyle,
  commanderFileDialogMetaStyle,
  commanderFileDialogOverlayStyle,
  commanderFileDialogPathStyle,
  commanderFileDialogStyle,
  commanderFileDialogTextAreaStyle,
  commanderFileDialogTitleClusterStyle,
  commanderFileDialogTitleRowStyle,
  commanderFileDialogTitleStyle,
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
  commanderListHeaderButtonActiveStyle,
  commanderListHeaderButtonCenterAlignedStyle,
  commanderListHeaderButtonEndAlignedStyle,
  commanderListHeaderButtonStyle,
  commanderListHeaderLabelStyle,
  commanderListHeaderSortIndicatorStyle,
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
  commanderPendingPreviewConflictRowStyle,
  commanderPendingPreviewHeaderStyle,
  commanderPendingPreviewIndexStyle,
  commanderPendingPreviewListStyle,
  commanderPendingPreviewRowStyle,
  commanderPendingPreviewScrollStyle,
  commanderPendingPreviewTargetTextStyle,
  commanderPendingPreviewTextStyle,
  commanderPendingRenameHelpStyle,
  commanderPendingRenamePresetRowStyle,
  commanderPendingRenamePresetStyle,
  commanderPendingRenameSummaryStyle,
  commanderPendingSupplementStyle,
  commanderPaneStyle,
  commanderPaneTitleStyle,
  commanderPathFieldStyle,
  commanderPathInputStyle,
  commanderPathSuggestionActiveStyle,
  commanderPathSuggestionItemStyle,
  commanderPathSuggestionMetaStyle,
  commanderPathSuggestionTextStyle,
  commanderPathSuggestionsScrollStyle,
  commanderPathSuggestionsStyle,
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

const commanderRenameTemplatePresets = [
  '[N]-[C:2]',
  '[C:2]-[N]',
  '[N:l]-[C:2]',
  '[N:u]-[C:2]',
  '[C:10:3]',
] as const

type CommanderPathSuggestion = {
  path: string
  meta: 'CURRENT' | 'HISTORY' | 'PATH'
}

function getCommanderPathSuggestionMeta(
  suggestionPath: string,
  paneState: CommanderPaneRuntimeState,
): CommanderPathSuggestion['meta'] {
  if (suggestionPath === paneState.path) {
    return 'CURRENT'
  }

  if (paneState.historyBack.includes(suggestionPath) || paneState.historyForward.includes(suggestionPath)) {
    return 'HISTORY'
  }

  return 'PATH'
}

function getCommanderPathSuggestions(
  inputValue: string,
  paneState: CommanderPaneRuntimeState,
  directoryPaths: string[],
): CommanderPathSuggestion[] {
  const normalizedInput = inputValue.trim().toLowerCase()
  const historyCandidates = [
    paneState.path,
    ...[...paneState.historyBack].reverse(),
    ...paneState.historyForward,
    '~',
  ]
  const uniqueCandidates: string[] = []
  const seenPaths = new Set<string>()

  for (const candidatePath of [...historyCandidates, ...directoryPaths]) {
    if (!candidatePath || seenPaths.has(candidatePath)) {
      continue
    }

    seenPaths.add(candidatePath)
    uniqueCandidates.push(candidatePath)
  }

  if (!normalizedInput) {
    return uniqueCandidates.slice(0, 8).map((candidatePath) => ({
      path: candidatePath,
      meta: getCommanderPathSuggestionMeta(candidatePath, paneState),
    }))
  }

  const exactMatches: string[] = []
  const prefixMatches: string[] = []
  const segmentPrefixMatches: string[] = []
  const containsMatches: string[] = []

  for (const candidatePath of uniqueCandidates) {
    const normalizedPath = candidatePath.toLowerCase()
    const lastSegment = candidatePath.split('/').pop()?.toLowerCase() ?? normalizedPath

    if (normalizedPath === normalizedInput) {
      exactMatches.push(candidatePath)
      continue
    }

    if (normalizedPath.startsWith(normalizedInput)) {
      prefixMatches.push(candidatePath)
      continue
    }

    if (lastSegment.startsWith(normalizedInput)) {
      segmentPrefixMatches.push(candidatePath)
      continue
    }

    if (normalizedPath.includes(normalizedInput)) {
      containsMatches.push(candidatePath)
    }
  }

  return [...exactMatches, ...prefixMatches, ...segmentPrefixMatches, ...containsMatches]
    .slice(0, 8)
    .map((candidatePath) => ({
      path: candidatePath,
      meta: getCommanderPathSuggestionMeta(candidatePath, paneState),
    }))
}

function joinCommanderPath(path: string, name: string) {
  if (path === '~') {
    return `~/${name}`
  }

  return `${path}/${name}`
}

function CommanderPlainButton({
  id,
  runaComponent,
  style,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  id?: string
  runaComponent: string
}) {
  const scope = useRunaDomScope()
  const identity = useRunaDomIdentity(runaComponent ?? `${scope.component}-button`, id)

  return (
    <button
      {...props}
      data-runa-component={identity.scope.component}
      data-runa-layout={identity.scope.layout}
      data-runa-node={identity.node}
      data-runa-widget={identity.scope.widget}
      id={identity.id}
      style={style}
      type={type}
    />
  )
}

function CommanderPlainBox({
  id,
  runaComponent,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  id?: string
  runaComponent: string
}) {
  const scope = useRunaDomScope()
  const identity = useRunaDomIdentity(runaComponent ?? `${scope.component}-box`, id)

  return (
    <div
      {...props}
      data-runa-component={identity.scope.component}
      data-runa-layout={identity.scope.layout}
      data-runa-node={identity.node}
      data-runa-widget={identity.scope.widget}
      id={identity.id}
      style={style}
    />
  )
}

function CommanderHeaderCell({
  onActivate,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  onActivate?: () => void
}) {
  return (
    <CommanderPlainBox
      {...props}
      onClick={(event) => {
        props.onClick?.(event)
        if (!event.defaultPrevented) {
          onActivate?.()
        }
      }}
      onKeyDown={(event) => {
        props.onKeyDown?.(event)

        if (event.defaultPrevented) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onActivate?.()
        }
      }}
      role="button"
      tabIndex={0}
    />
  )
}

function renderCommanderSortLabel(
  label: string,
  isActive: boolean,
  sortDirection: CommanderSortDirection,
) {
  return (
    <Box runaComponent={`commander-sort-label-${label.toLowerCase()}`} style={commanderListHeaderLabelStyle}>
      <Text runaComponent={`commander-sort-label-${label.toLowerCase()}-text`} style={{ color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}>
        {label}
      </Text>
      {isActive ? (
        <Text runaComponent={`commander-sort-label-${label.toLowerCase()}-indicator`} style={commanderListHeaderSortIndicatorStyle}>
          {sortDirection === 'desc' ? '▼' : '▲'}
        </Text>
      ) : null}
    </Box>
  )
}

function getCommanderCursorMetrics(content: string, position: number) {
  const safePosition = Math.max(0, Math.min(position, content.length))
  const beforeCursor = content.slice(0, safePosition)
  const lastLineBreakIndex = beforeCursor.lastIndexOf('\n')

  return {
    line: beforeCursor.split('\n').length,
    column: safePosition - lastLineBreakIndex,
    chars: content.length,
  }
}

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
    case 'select':
      return `Select ${pendingOperation.matchCount ?? 0} entries matching ${pendingOperation.inputValue || '*'} in ${pendingOperation.sourcePath}`
    case 'unselect':
      return `Unselect ${pendingOperation.matchCount ?? 0} entries matching ${pendingOperation.inputValue || '*'} in ${pendingOperation.sourcePath}`
    case 'filter':
      return `Filter ${pendingOperation.matchCount ?? 0} entries matching ${pendingOperation.inputValue || '*'} in ${pendingOperation.sourcePath}`
    case 'search':
      return `Search ${pendingOperation.matchCount ?? 0} entries matching ${pendingOperation.inputValue || ''} in ${pendingOperation.sourcePath}`
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

function getRenamePreviewStatusLabel(status: CommanderRenamePreviewStatus) {
  switch (status) {
    case 'duplicate':
      return 'DUP'
    case 'conflict':
      return 'EXISTS'
    case 'invalid':
      return 'INVALID'
    default:
      return 'OK'
  }
}

function getRenamePreviewStatusStyle(status: CommanderRenamePreviewStatus) {
  switch (status) {
    case 'duplicate':
      return {
        borderColor: 'rgba(212, 180, 104, 0.42)',
        background: 'rgba(86, 67, 26, 0.22)',
        color: 'rgb(228, 211, 164)',
      }
    case 'conflict':
      return {
        borderColor: 'rgba(196, 154, 102, 0.38)',
        background: 'rgba(82, 58, 24, 0.18)',
        color: 'rgb(222, 196, 150)',
      }
    case 'invalid':
      return {
        borderColor: 'rgba(190, 116, 102, 0.38)',
        background: 'rgba(82, 33, 28, 0.18)',
        color: 'rgb(226, 178, 169)',
      }
    default:
      return {
        borderColor: 'rgba(96, 161, 139, 0.28)',
        background: 'rgba(21, 54, 46, 0.16)',
        color: 'var(--runa-commander-highlight-text)',
      }
  }
}

function getRenamePreviewSummary(preview: CommanderRenamePreviewItem[]) {
  return preview.reduce((summary, item) => {
    summary.total += 1
    summary[item.status] += 1
    return summary
  }, {
    total: 0,
    ok: 0,
    duplicate: 0,
    conflict: 0,
    invalid: 0,
  })
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
  isEditingPath,
  pane,
  pathEditValue,
  pathInputRef,
  pathSuggestions,
  pathSuggestionIndex,
  onActivate,
  onApplyPathSuggestion,
  onCancelPathEdit,
  onChangePathEdit,
  onConfirmPathEdit,
  onFocusRoot,
  onMovePathSuggestion,
  onOpenEntry,
  onSetSortMode,
  onStartPathEdit,
  onSetCursor,
  onToggleSelection,
  sortDirection,
  sortMode,
}: {
  isActive: boolean
  isEditingPath: boolean
  onApplyPathSuggestion: (suggestion: string) => void
  onActivate: () => void
  onCancelPathEdit: (options?: { focusRoot?: boolean }) => void
  onChangePathEdit: (value: string) => void
  onConfirmPathEdit: () => void
  onFocusRoot: () => void
  onMovePathSuggestion: (delta: 1 | -1) => void
  onOpenEntry: (entryId: string) => void
  onSetSortMode: (sortMode: CommanderSortMode) => void
  onStartPathEdit: () => void
  onSetCursor: (entryId: string, options?: { rangeSelect?: boolean }) => void
  onToggleSelection: (entryId: string) => void
  pane: CommanderPaneViewState
  pathEditValue: string
  pathInputRef: RefObject<HTMLInputElement | null>
  pathSuggestionIndex: number
  pathSuggestions: CommanderPathSuggestion[]
  sortDirection: CommanderSortDirection
  sortMode: CommanderSortMode
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
      <CommanderPlainBox
        runaComponent={`commander-pane-${pane.id}-header`}
        style={{
          ...commanderPaneHeaderStyle,
          ...(isActive ? commanderPaneHeaderActiveStyle : null),
        }}
      >
        <CommanderPlainBox runaComponent={`commander-pane-${pane.id}-title`} style={commanderPaneTitleStyle}>
          <Badge runaComponent={`commander-pane-${pane.id}-state`} style={isActive ? paneStateBadgeStyle : inactivePaneStateBadgeStyle}>
            {isActive ? 'ACTIVE' : 'PANE'}
          </Badge>
          <CommanderPlainBox runaComponent={`commander-pane-${pane.id}-path-field`} style={commanderPathFieldStyle}>
            {isEditingPath ? (
              <>
                <Input
                  aria-label={`Commander ${pane.id} pane path`}
                  onBlur={() => onCancelPathEdit({ focusRoot: false })}
                  onChange={(event) => onChangePathEdit(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' && pathSuggestions.length > 0) {
                      event.preventDefault()
                      event.stopPropagation()
                      onMovePathSuggestion(1)
                      return
                    }

                    if (event.key === 'ArrowUp' && pathSuggestions.length > 0) {
                      event.preventDefault()
                      event.stopPropagation()
                      onMovePathSuggestion(-1)
                      return
                    }

                    if (event.key === 'Tab' && pathSuggestions.length > 0) {
                      event.preventDefault()
                      event.stopPropagation()
                      onApplyPathSuggestion(pathSuggestions[pathSuggestionIndex]?.path ?? pathEditValue)
                      return
                    }

                    if (event.key === 'Enter') {
                      event.preventDefault()
                      event.stopPropagation()
                      onConfirmPathEdit()
                      return
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault()
                      event.stopPropagation()
                      onCancelPathEdit()
                    }
                  }}
                  ref={pathInputRef}
                  runaComponent={`commander-pane-${pane.id}-path-input`}
                  style={commanderPathInputStyle}
                  value={pathEditValue}
                />
                {pathSuggestions.length > 0 ? (
                  <Surface runaComponent={`commander-pane-${pane.id}-path-suggestions`} style={commanderPathSuggestionsStyle}>
                    <ScrollArea
                      runaComponent={`commander-pane-${pane.id}-path-suggestions-scroll`}
                      style={commanderPathSuggestionsScrollStyle}
                    >
                      <CommanderPlainBox runaComponent={`commander-pane-${pane.id}-path-suggestions-list`} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        {pathSuggestions.map((suggestion, index) => {
                          const isSuggestionActive = index === pathSuggestionIndex

                          return (
                            <CommanderPlainButton
                              key={suggestion.path}
                              onClick={() => onApplyPathSuggestion(suggestion.path)}
                              onPointerDown={(event) => {
                                event.preventDefault()
                              }}
                              runaComponent={`commander-pane-${pane.id}-path-suggestion-${index + 1}`}
                              style={{
                                ...commanderPathSuggestionItemStyle,
                                ...(isSuggestionActive ? commanderPathSuggestionActiveStyle : null),
                              }}
                              title={suggestion.path}
                            >
                              <Text runaComponent={`commander-pane-${pane.id}-path-suggestion-${index + 1}-text`} style={commanderPathSuggestionTextStyle}>
                                {suggestion.path}
                              </Text>
                              <Text runaComponent={`commander-pane-${pane.id}-path-suggestion-${index + 1}-meta`} style={commanderPathSuggestionMetaStyle}>
                                {suggestion.meta}
                              </Text>
                            </CommanderPlainButton>
                          )
                        })}
                      </CommanderPlainBox>
                    </ScrollArea>
                  </Surface>
                ) : null}
              </>
            ) : (
              <Text
                onClick={(event) => {
                  if (!isActive) {
                    return
                  }

                  event.stopPropagation()
                  onStartPathEdit()
                }}
                runaComponent={`commander-pane-${pane.id}-path`}
                style={commanderPathTextStyle}
                title={pane.path}
              >
                {pane.path}
              </Text>
            )}
          </CommanderPlainBox>
        </CommanderPlainBox>
        <CommanderPlainBox runaComponent={`commander-pane-${pane.id}-meta`} style={plainClusterStyle}>
          {pane.filterQuery ? (
            <Badge
              runaComponent={`commander-pane-${pane.id}-filter`}
              style={commanderTypeBadgeStyle}
              title={pane.filterQuery}
            >
              FILTER {pane.filterQuery}
            </Badge>
          ) : null}
          <Text runaComponent={`commander-pane-${pane.id}-items`} style={commanderPaneMetaStyle}>{pane.counters.items} items</Text>
        </CommanderPlainBox>
      </CommanderPlainBox>
      <Separator runaComponent={`commander-pane-${pane.id}-header-separator`} />
      <CommanderPlainBox runaComponent={`commander-pane-${pane.id}-list-header`} style={commanderListHeaderStyle}>
        <CommanderHeaderCell
          onActivate={() => onSetSortMode('ext')}
          runaComponent={`commander-pane-${pane.id}-column-type`}
          style={{
            ...commanderListHeaderButtonStyle,
            ...commanderListHeaderButtonCenterAlignedStyle,
            ...(sortMode === 'ext' ? commanderListHeaderButtonActiveStyle : null),
          }}
          title="Sort by type"
        >
          <Text runaComponent={`commander-pane-${pane.id}-column-type-label`} style={{ color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}>
            {sortMode === 'ext' ? (sortDirection === 'desc' ? 'T▼' : 'T▲') : 'T'}
          </Text>
        </CommanderHeaderCell>
        <CommanderHeaderCell
          onActivate={() => onSetSortMode('name')}
          runaComponent={`commander-pane-${pane.id}-column-name`}
          style={{
            ...commanderListHeaderButtonStyle,
            ...(sortMode === 'name' ? commanderListHeaderButtonActiveStyle : null),
          }}
          title="Sort by name"
        >
          {renderCommanderSortLabel('Name', sortMode === 'name', sortDirection)}
        </CommanderHeaderCell>
        <Text runaComponent={`commander-pane-${pane.id}-column-git`} style={commanderPaneMetaStyle}>Git</Text>
        <CommanderHeaderCell
          onActivate={() => onSetSortMode('size')}
          runaComponent={`commander-pane-${pane.id}-column-size`}
          style={{
            ...commanderListHeaderButtonStyle,
            ...commanderListHeaderButtonEndAlignedStyle,
            ...(sortMode === 'size' ? commanderListHeaderButtonActiveStyle : null),
          }}
          title="Sort by size"
        >
          {renderCommanderSortLabel('Size', sortMode === 'size', sortDirection)}
        </CommanderHeaderCell>
        <CommanderHeaderCell
          onActivate={() => onSetSortMode('modified')}
          runaComponent={`commander-pane-${pane.id}-column-modified`}
          style={{
            ...commanderListHeaderButtonStyle,
            ...commanderListHeaderButtonEndAlignedStyle,
            ...(sortMode === 'modified' ? commanderListHeaderButtonActiveStyle : null),
          }}
          title="Sort by modified"
        >
          {renderCommanderSortLabel('Modified', sortMode === 'modified', sortDirection)}
        </CommanderHeaderCell>
      </CommanderPlainBox>
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

function CommanderFileDialog({
  dirty,
  content,
  entryName,
  entryPath,
  mode,
  onChange,
  onClose,
  onSave,
}: {
  dirty: boolean
  content: string
  entryName: string
  entryPath: string
  mode: 'view' | 'edit'
  onChange: (value: string) => void
  onClose: () => void
  onSave: () => void
}) {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const dialogIdentityRef = useRef<string | null>(null)
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false)
  const [cursorMetrics, setCursorMetrics] = useState(() => getCommanderCursorMetrics(content, 0))

  const syncCursorMetrics = useCallback(() => {
    const nextPosition = textAreaRef.current?.selectionStart ?? 0
    setCursorMetrics(getCommanderCursorMetrics(content, nextPosition))
  }, [content])

  const requestClose = useCallback(() => {
    if (mode === 'edit' && dirty) {
      setShowDiscardPrompt(true)
      return
    }

    setShowDiscardPrompt(false)
    onClose()
  }, [dirty, mode, onClose])

  useEffect(() => {
    const nextIdentity = `${entryPath}:${mode}`

    if (dialogIdentityRef.current === nextIdentity) {
      return
    }

    dialogIdentityRef.current = nextIdentity
    setShowDiscardPrompt(false)

    if (!textAreaRef.current) {
      return
    }

    textAreaRef.current.focus()

    if (mode === 'edit') {
      const cursorPosition = textAreaRef.current.value.length
      textAreaRef.current.setSelectionRange(cursorPosition, cursorPosition)
    }
    syncCursorMetrics()
  }, [entryPath, mode, syncCursorMetrics])

  useEffect(() => {
    syncCursorMetrics()
  }, [content, syncCursorMetrics])

  return (
    <Box
      onMouseDown={requestClose}
      runaComponent="commander-file-dialog-overlay"
      style={commanderFileDialogOverlayStyle}
    >
      <Surface
        onMouseDown={(event) => event.stopPropagation()}
        runaComponent="commander-file-dialog"
        style={commanderFileDialogStyle}
      >
        <Box runaComponent="commander-file-dialog-header" style={commanderFileDialogHeaderStyle}>
          <Box runaComponent="commander-file-dialog-title-cluster" style={commanderFileDialogTitleClusterStyle}>
            <Box runaComponent="commander-file-dialog-title-row" style={commanderFileDialogTitleRowStyle}>
              <Badge runaComponent="commander-file-dialog-mode" style={paneStateBadgeStyle}>
                {mode === 'edit' ? 'EDIT' : 'VIEW'}
              </Badge>
              <Text runaComponent="commander-file-dialog-title" style={commanderFileDialogTitleStyle}>
                {entryName}
              </Text>
              {mode === 'edit' && dirty ? (
                <Badge runaComponent="commander-file-dialog-dirty" style={commanderTypeBadgeStyle}>
                  DIRTY
                </Badge>
              ) : null}
            </Box>
            <Text runaComponent="commander-file-dialog-path" style={commanderFileDialogPathStyle}>
              {entryPath}
            </Text>
          </Box>
          <Box runaComponent="commander-file-dialog-actions" style={commanderFileDialogActionsStyle}>
            {mode === 'edit' ? (
              <Button
                onClick={() => {
                  setShowDiscardPrompt(false)
                  onSave()
                }}
                runaComponent="commander-file-dialog-save"
              >
                Save
              </Button>
            ) : null}
            <Button
              onClick={requestClose}
              runaComponent="commander-file-dialog-close"
            >
              Close
            </Button>
          </Box>
        </Box>
        <TextArea
          aria-label={mode === 'edit' ? `Edit ${entryName}` : `View ${entryName}`}
          onChange={(event) => onChange(event.target.value)}
          onClick={syncCursorMetrics}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              requestClose()
              return
            }

            if (mode === 'edit' && (event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
              event.preventDefault()
              event.stopPropagation()
              setShowDiscardPrompt(false)
              onSave()
            }
          }}
          onKeyUp={syncCursorMetrics}
          onSelect={syncCursorMetrics}
          readOnly={mode === 'view'}
          ref={textAreaRef}
          runaComponent="commander-file-dialog-textarea"
          spellCheck={false}
          style={commanderFileDialogTextAreaStyle}
          value={content}
        />
        <Box runaComponent="commander-file-dialog-footer" style={commanderFileDialogFooterStyle}>
          <Box runaComponent="commander-file-dialog-meta" style={commanderFileDialogMetaStyle}>
            <Text runaComponent="commander-file-dialog-hint-mode" style={commanderFileDialogHintStyle}>
              {mode === 'edit' ? 'Ctrl+S save' : 'Read only preview'}
            </Text>
            <Text runaComponent="commander-file-dialog-cursor" style={commanderFileDialogHintStyle}>
              Ln {cursorMetrics.line}, Col {cursorMetrics.column}
            </Text>
            <Text runaComponent="commander-file-dialog-size" style={commanderFileDialogHintStyle}>
              {cursorMetrics.chars} chars
            </Text>
          </Box>
          {showDiscardPrompt ? (
            <Box runaComponent="commander-file-dialog-close-prompt" style={commanderFileDialogClosePromptStyle}>
              <Text runaComponent="commander-file-dialog-close-warning" style={commanderFileDialogHintStyle}>
                Discard unsaved changes?
              </Text>
              <Button
                onClick={() => setShowDiscardPrompt(false)}
                runaComponent="commander-file-dialog-keep-editing"
              >
                Keep editing
              </Button>
              {mode === 'edit' ? (
                <Button
                  onClick={() => {
                    setShowDiscardPrompt(false)
                    onSave()
                  }}
                  runaComponent="commander-file-dialog-save-and-close"
                >
                  Save
                </Button>
              ) : null}
              <Button
                onClick={() => {
                  setShowDiscardPrompt(false)
                  onClose()
                }}
                runaComponent="commander-file-dialog-discard"
              >
                Discard
              </Button>
            </Box>
          ) : (
            <Text runaComponent="commander-file-dialog-hint-close" style={commanderFileDialogHintStyle}>
              Esc close
            </Text>
          )}
        </Box>
      </Surface>
    </Box>
  )
}

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
  const pendingOperationMessage = useMemo(() => formatPendingOperationMessage(state), [state])
  const disableHistoryControls = Boolean(state.pendingOperation)
  const pendingOperationNeedsInput = (
    state.pendingOperation?.kind === 'rename'
    || state.pendingOperation?.kind === 'select'
    || state.pendingOperation?.kind === 'unselect'
    || state.pendingOperation?.kind === 'filter'
    || state.pendingOperation?.kind === 'search'
  )
  const pendingOperationIsBlocking = isPendingOperationBlocking(state)
  const pendingOperationNeedsConflictResolution = isPendingOperationConflictResolution(state)
  const pendingRenamePreview = state.pendingOperation?.kind === 'rename'
    ? (state.pendingOperation.renamePreview ?? [])
    : []
  const pendingMaskPreview = (
    state.pendingOperation?.kind === 'select'
    || state.pendingOperation?.kind === 'unselect'
    || state.pendingOperation?.kind === 'filter'
    || state.pendingOperation?.kind === 'search'
  )
    ? (state.pendingOperation.matchPreview ?? [])
    : []
  const pendingSearchMatchPosition = state.pendingOperation?.kind === 'search'
    && (state.pendingOperation.matchCount ?? 0) > 0
    && typeof state.pendingOperation.matchIndex === 'number'
    ? `${state.pendingOperation.matchIndex + 1}/${state.pendingOperation.matchCount}`
    : null
  const pendingInputIdentity = pendingOperationNeedsInput && state.pendingOperation
    ? [
      state.pendingOperation.kind,
      state.pendingOperation.sourcePaneId,
      state.pendingOperation.sourcePath,
      state.pendingOperation.renameMode ?? '',
      state.pendingOperation.entryIds.join(','),
    ].join(':')
    : null
  const pendingRenamePreviewSummary = useMemo(
    () => getRenamePreviewSummary(pendingRenamePreview),
    [pendingRenamePreview],
  )
  const activeFileDialogPath = state.fileDialog
    ? joinCommanderPath(state.fileDialog.path, state.fileDialog.entryName)
    : ''
  const isFileDialogDirty = Boolean(
    state.fileDialog
    && state.fileDialog.mode === 'edit'
    && state.fileDialog.draftValue !== state.fileDialog.content,
  )

  const attachCommanderRootRef = useCallback((node: HTMLDivElement | null) => {
    commanderRootRef.current = node
    autoTagCommanderRoot(node)
  }, [autoTagCommanderRoot])

  const focusCommanderRoot = useCallback(() => {
    commanderRootRef.current?.focus({
      preventScroll: true,
    })
  }, [])

  const startPathEdit = useCallback((paneId: CommanderPaneViewState['id']) => {
    if (state.pendingOperation || state.fileDialog) {
      return
    }

    const pane = paneId === 'left' ? state.leftPane : state.rightPane
    actions.setActivePane(paneId)
    setEditingPathPaneId(paneId)
    setEditingPathValue(pane.path)
    setPathSuggestionIndex(0)
  }, [actions, state.fileDialog, state.leftPane, state.pendingOperation, state.rightPane])

  const cancelPathEdit = useCallback((options?: { focusRoot?: boolean }) => {
    setEditingPathPaneId(null)
    setEditingPathValue('')
    setPathSuggestionIndex(0)

    if (options?.focusRoot ?? true) {
      focusCommanderRoot()
    }
  }, [focusCommanderRoot])

  const editingPathPaneRuntimeState = editingPathPaneId === 'left'
    ? runtimeState.leftPane
    : editingPathPaneId === 'right'
      ? runtimeState.rightPane
      : null
  const editingPathSuggestions = useMemo(
    () => (
      editingPathPaneRuntimeState
        ? getCommanderPathSuggestions(
          editingPathValue,
          editingPathPaneRuntimeState,
          listCommanderDirectoryPaths(widgetId),
        )
        : []
    ),
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

  const movePathSuggestion = useCallback((delta: 1 | -1) => {
    setPathSuggestionIndex((currentIndex) => {
      if (editingPathSuggestions.length === 0) {
        return 0
      }

      return (currentIndex + delta + editingPathSuggestions.length) % editingPathSuggestions.length
    })
  }, [editingPathSuggestions.length])

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
  }, [commanderActions, editingPathPaneId, editingPathSuggestions, editingPathValue, focusCommanderRoot, pathSuggestionIndex])

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

  const handleHintAction = useCallback((hintKey: string) => {
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
  }, [commanderActions, focusCommanderRoot, startPathEdit, state.activePane])

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
            aria-label={state.dirsFirst ? 'Disable folders first sorting' : 'Enable folders first sorting'}
            aria-pressed={state.dirsFirst}
            onClick={() => {
              commanderActions.toggleDirsFirst()
              focusCommanderRoot()
            }}
            runaComponent="commander-toggle-dirs-first"
            size="sm"
            style={{
              ...commanderIconControlStyle,
              ...(state.dirsFirst ? commanderToggleActiveStyle : null),
            }}
          >
            <FolderTree size={14} strokeWidth={1.8} />
          </IconButton>
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
          isEditingPath={editingPathPaneId === 'left'}
          onApplyPathSuggestion={applyPathSuggestion}
          onActivate={() => actions.setActivePane('left')}
          onCancelPathEdit={cancelPathEdit}
          onChangePathEdit={handlePathEditValueChange}
          onConfirmPathEdit={confirmPathEdit}
          onFocusRoot={focusCommanderRoot}
          onMovePathSuggestion={movePathSuggestion}
          onOpenEntry={(entryId) => actions.openPaneEntry('left', entryId)}
          onSetSortMode={commanderActions.setSortMode}
          onStartPathEdit={() => startPathEdit('left')}
          onSetCursor={(entryId, options) => actions.setPaneCursor('left', entryId, options)}
          onToggleSelection={(entryId) => actions.togglePaneSelection('left', entryId)}
          pane={state.leftPane}
          pathEditValue={editingPathValue}
          pathInputRef={pathEditInputRef}
          pathSuggestionIndex={pathSuggestionIndex}
          pathSuggestions={editingPathPaneId === 'left' ? editingPathSuggestions : []}
          sortDirection={state.sortDirection}
          sortMode={state.sortMode}
        />
        <CommanderPane
          isActive={state.activePane === 'right'}
          isEditingPath={editingPathPaneId === 'right'}
          onApplyPathSuggestion={applyPathSuggestion}
          onActivate={() => actions.setActivePane('right')}
          onCancelPathEdit={cancelPathEdit}
          onChangePathEdit={handlePathEditValueChange}
          onConfirmPathEdit={confirmPathEdit}
          onFocusRoot={focusCommanderRoot}
          onMovePathSuggestion={movePathSuggestion}
          onOpenEntry={(entryId) => actions.openPaneEntry('right', entryId)}
          onSetSortMode={commanderActions.setSortMode}
          onStartPathEdit={() => startPathEdit('right')}
          onSetCursor={(entryId, options) => actions.setPaneCursor('right', entryId, options)}
          onToggleSelection={(entryId) => actions.togglePaneSelection('right', entryId)}
          pane={state.rightPane}
          pathEditValue={editingPathValue}
          pathInputRef={pathEditInputRef}
          pathSuggestionIndex={pathSuggestionIndex}
          pathSuggestions={editingPathPaneId === 'right' ? editingPathSuggestions : []}
          sortDirection={state.sortDirection}
          sortMode={state.sortMode}
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
              aria-label={
                state.pendingOperation?.kind === 'rename'
                  ? 'Commander pending operation input'
                  : state.pendingOperation?.kind === 'filter'
                    ? 'Commander filter input'
                  : state.pendingOperation?.kind === 'search'
                    ? 'Commander search input'
                  : 'Commander mask selection input'
              }
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
              {state.pendingOperation?.kind === 'rename' ? (
                <>
                  <Box runaComponent="commander-pending-rename-help" style={commanderPendingRenameHelpStyle}>
                    <Text runaComponent="commander-pending-rename-help-name" style={{ color: 'inherit' }}>[N] name</Text>
                    <Text runaComponent="commander-pending-rename-help-name-lower" style={{ color: 'inherit' }}>[N:l] lower</Text>
                    <Text runaComponent="commander-pending-rename-help-name-upper" style={{ color: 'inherit' }}>[N:u] upper</Text>
                    <Text runaComponent="commander-pending-rename-help-ext" style={{ color: 'inherit' }}>[E] ext</Text>
                    <Text runaComponent="commander-pending-rename-help-ext-lower" style={{ color: 'inherit' }}>[E:l] lower ext</Text>
                    <Text runaComponent="commander-pending-rename-help-full" style={{ color: 'inherit' }}>[F] full</Text>
                    <Text runaComponent="commander-pending-rename-help-full-upper" style={{ color: 'inherit' }}>[F:u] upper full</Text>
                    <Text runaComponent="commander-pending-rename-help-counter" style={{ color: 'inherit' }}>[C] counter</Text>
                    <Text runaComponent="commander-pending-rename-help-counter-width" style={{ color: 'inherit' }}>[C:2] padded counter</Text>
                    <Text runaComponent="commander-pending-rename-help-counter-start" style={{ color: 'inherit' }}>[C:10:3] start 10 width 3</Text>
                    <Text runaComponent="commander-pending-rename-help-counter-step" style={{ color: 'inherit' }}>[C:10:3:2] step 2</Text>
                  </Box>
                  {state.pendingOperation.renameMode === 'batch' ? (
                    <Box runaComponent="commander-pending-rename-preset-row" style={commanderPendingRenamePresetRowStyle}>
                      {commanderRenameTemplatePresets.map((template) => (
                        <Badge
                          key={template}
                          onClick={() => commanderActions.setPendingOperationInput(template)}
                          runaComponent={`commander-pending-rename-preset-${template.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                          style={commanderPendingRenamePresetStyle}
                        >
                          {template}
                        </Badge>
                      ))}
                    </Box>
                  ) : null}
                  {pendingRenamePreview.length > 0 ? (
                    <Box runaComponent="commander-pending-rename-summary" style={commanderPendingRenameSummaryStyle}>
                      <Badge runaComponent="commander-pending-rename-summary-total" style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle('ok') }}>
                        {pendingRenamePreviewSummary.total} total
                      </Badge>
                      <Badge runaComponent="commander-pending-rename-summary-ok" style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle('ok') }}>
                        {pendingRenamePreviewSummary.ok} ok
                      </Badge>
                      {pendingRenamePreviewSummary.conflict ? (
                        <Badge runaComponent="commander-pending-rename-summary-conflict" style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle('conflict') }}>
                          {pendingRenamePreviewSummary.conflict} exists
                        </Badge>
                      ) : null}
                      {pendingRenamePreviewSummary.duplicate ? (
                        <Badge runaComponent="commander-pending-rename-summary-duplicate" style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle('duplicate') }}>
                          {pendingRenamePreviewSummary.duplicate} duplicate
                        </Badge>
                      ) : null}
                      {pendingRenamePreviewSummary.invalid ? (
                        <Badge runaComponent="commander-pending-rename-summary-invalid" style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle('invalid') }}>
                          {pendingRenamePreviewSummary.invalid} invalid
                        </Badge>
                      ) : null}
                    </Box>
                  ) : null}
                  {state.pendingOperation.duplicateTargetNames?.length ? (
                    <Box runaComponent="commander-pending-rename-duplicate-warning" style={commanderPendingWarningStyle}>
                      <Text runaComponent="commander-pending-rename-duplicate-warning-text" style={{ color: 'inherit' }}>
                        Duplicate targets: {state.pendingOperation.duplicateTargetNames.join(', ')}
                      </Text>
                    </Box>
                  ) : null}
                  {pendingRenamePreview.length > 0 ? (
                    <Box runaComponent="commander-pending-rename-preview-table" style={commanderPendingPreviewListStyle}>
                      <Box runaComponent="commander-pending-rename-preview-header" style={commanderPendingPreviewHeaderStyle}>
                        <Text runaComponent="commander-pending-rename-preview-header-index" style={commanderPendingPreviewIndexStyle}>#</Text>
                        <Text runaComponent="commander-pending-rename-preview-header-current" style={commanderPendingPreviewTextStyle}>Current</Text>
                        <Text runaComponent="commander-pending-rename-preview-header-next" style={commanderPendingPreviewTextStyle}>Next</Text>
                        <Text runaComponent="commander-pending-rename-preview-header-status" style={commanderPendingPreviewTextStyle}>Status</Text>
                      </Box>
                      <ScrollArea runaComponent="commander-pending-rename-preview-scroll" style={commanderPendingPreviewScrollStyle}>
                        <Box runaComponent="commander-pending-rename-preview-list" style={commanderPendingPreviewListStyle}>
                          {pendingRenamePreview.map((previewItem, index) => (
                            <Box
                              key={previewItem.entryId}
                              runaComponent={`commander-pending-rename-preview-${index + 1}`}
                              style={{
                                ...commanderPendingPreviewRowStyle,
                                ...(previewItem.conflict ? commanderPendingPreviewConflictRowStyle : null),
                              }}
                            >
                              <Text runaComponent={`commander-pending-rename-preview-${index + 1}-index`} style={commanderPendingPreviewIndexStyle}>
                                {index + 1}
                              </Text>
                              <Text runaComponent={`commander-pending-rename-preview-${index + 1}-current`} style={commanderPendingPreviewTextStyle}>
                                {previewItem.currentName}
                              </Text>
                              <Text runaComponent={`commander-pending-rename-preview-${index + 1}-next`} style={commanderPendingPreviewTargetTextStyle}>
                                {previewItem.nextName || 'Invalid name'}
                              </Text>
                              <Badge
                                runaComponent={`commander-pending-rename-preview-${index + 1}-status`}
                                style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle(previewItem.status) }}
                              >
                                {getRenamePreviewStatusLabel(previewItem.status)}
                              </Badge>
                            </Box>
                          ))}
                        </Box>
                      </ScrollArea>
                    </Box>
                  ) : null}
                </>
              ) : null}
              {(state.pendingOperation?.kind === 'select' || state.pendingOperation?.kind === 'unselect' || state.pendingOperation?.kind === 'filter' || state.pendingOperation?.kind === 'search') ? (
                <>
                  <Box runaComponent="commander-pending-mask-help" style={commanderPendingRenameHelpStyle}>
                    {state.pendingOperation?.kind === 'search' ? (
                      <>
                        <Text runaComponent="commander-pending-search-help-substring" style={{ color: 'inherit' }}>substring match</Text>
                        <Text runaComponent="commander-pending-search-help-visible" style={{ color: 'inherit' }}>visible rows only</Text>
                        <Text runaComponent="commander-pending-search-help-arrows" style={{ color: 'inherit' }}>up/down step hits</Text>
                        <Text runaComponent="commander-pending-search-help-enter" style={{ color: 'inherit' }}>enter confirms current</Text>
                      </>
                    ) : (
                      <>
                        <Text runaComponent="commander-pending-mask-help-wildcard" style={{ color: 'inherit' }}>* any</Text>
                        <Text runaComponent="commander-pending-mask-help-single" style={{ color: 'inherit' }}>? single</Text>
                        <Text runaComponent="commander-pending-mask-help-split" style={{ color: 'inherit' }}>; split masks</Text>
                      </>
                    )}
                    {state.pendingOperation?.kind === 'filter' ? (
                      <Text runaComponent="commander-pending-mask-help-empty" style={{ color: 'inherit' }}>empty clears filter</Text>
                    ) : null}
                  </Box>
                  <Box runaComponent="commander-pending-mask-summary" style={commanderPendingRenameSummaryStyle}>
                    <Badge runaComponent="commander-pending-mask-summary-count" style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle('ok') }}>
                      {state.pendingOperation?.matchCount ?? 0} matches
                    </Badge>
                    {state.pendingOperation?.kind === 'search' && pendingSearchMatchPosition ? (
                      <Badge runaComponent="commander-pending-search-summary-position" style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle('ok') }}>
                        {pendingSearchMatchPosition}
                      </Badge>
                    ) : null}
                    {pendingMaskPreview.map((entryName, index) => (
                      <Text key={`${entryName}-${index}`} runaComponent={`commander-pending-mask-preview-${index + 1}`} style={commanderPendingPreviewTextStyle}>
                        {entryName}
                      </Text>
                    ))}
                    {(state.pendingOperation?.matchCount ?? 0) > pendingMaskPreview.length ? (
                      <Text runaComponent="commander-pending-mask-preview-more" style={commanderPendingPreviewTextStyle}>
                        +{(state.pendingOperation?.matchCount ?? 0) - pendingMaskPreview.length} more
                      </Text>
                    ) : null}
                  </Box>
                </>
              ) : null}
            </Box>
          ) : null}
        </Surface>
      ) : (
        <Surface runaComponent="commander-hint-bar" style={commanderHintBarStyle}>
          {state.footerHints.map((hint) => (
            (() => {
              const hintComponentKey = hint.key.toLowerCase().replace(/[^a-z0-9]+/g, '-')

              return (
            <Box
              key={hint.key}
              onClick={() => handleHintAction(hint.key)}
              role="button"
              runaComponent={`commander-hint-${hintComponentKey}`}
              style={{
                ...commanderHintCellStyle,
                ...commanderHintActionStyle,
              }}
              tabIndex={-1}
            >
              <Text runaComponent={`commander-hint-${hintComponentKey}-key`} style={commanderHintKeyStyle}>{hint.key}</Text>
              <Text runaComponent={`commander-hint-${hintComponentKey}-label`} style={commanderHintLabelStyle}>{hint.label}</Text>
            </Box>
              )
            })()
          ))}
        </Surface>
      )}
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
