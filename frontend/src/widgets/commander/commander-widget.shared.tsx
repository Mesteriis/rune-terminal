import { Columns2, Columns3, FileCode2, FileText, Folder, Link2, SquareTerminal } from 'lucide-react'
import type { CSSProperties } from 'react'

import type {
  CommanderFileRow,
  CommanderPaneRuntimeState,
  CommanderPendingOperation,
  CommanderRenamePreviewItem,
  CommanderRenamePreviewStatus,
  CommanderSortDirection,
  CommanderWidgetViewState,
} from '@/features/commander/model/types'
import { Text } from '@/shared/ui/primitives'

import { CommanderPlainBox } from '@/widgets/commander/commander-plain'
import {
  commanderListHeaderLabelStyle,
  commanderListHeaderSortIndicatorStyle,
} from '@/widgets/commander/commander-widget.styles'

export const commanderRenameTemplatePresets = [
  '[N]-[C:2]',
  '[C:2]-[N]',
  '[N:l]-[C:2]',
  '[N:u]-[C:2]',
  '[C:10:3]',
] as const

export const commanderCopyTemplatePresets = ['[N]-copy', '[N]-copy-[C:2]', '[F]-copy'] as const

export type CommanderPathSuggestion = {
  displayPath: string
  path: string
  meta: 'CURRENT' | 'HISTORY' | 'PATH'
}

export const commanderPlainClusterStyle: CSSProperties = {
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

export const commanderPaneStateBadgeStyle: CSSProperties = {
  minHeight: '18px',
  padding: '0 var(--space-xs)',
  borderColor: 'var(--runa-commander-highlight-badge-border)',
  background: 'var(--runa-commander-highlight-badge-bg)',
  color: 'var(--runa-commander-highlight-text)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '14px',
  textTransform: 'uppercase',
}

export const commanderInactivePaneStateBadgeStyle: CSSProperties = {
  ...commanderPaneStateBadgeStyle,
  borderColor: 'var(--runa-commander-surface-border)',
  background: 'var(--runa-commander-inactive-badge-bg)',
  color: 'var(--runa-commander-text-muted)',
}

export const commanderViewModeIconMap = {
  commander: Columns2,
  split: Columns3,
  terminal: SquareTerminal,
} as const

/** Classifies a suggested path so the dropdown can label current/history/path origins. */
export function getCommanderPathSuggestionMeta(
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

/** Builds a ranked path-suggestion list from pane history plus currently known directory paths. */
export function getCommanderPathSuggestions(
  inputValue: string,
  paneState: CommanderPaneRuntimeState,
  directoryPaths: string[],
  formatPath: (path: string) => string,
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
      displayPath: formatPath(candidatePath),
      path: candidatePath,
      meta: getCommanderPathSuggestionMeta(candidatePath, paneState),
    }))
  }

  const exactMatches: string[] = []
  const prefixMatches: string[] = []
  const segmentPrefixMatches: string[] = []
  const containsMatches: string[] = []

  for (const candidatePath of uniqueCandidates) {
    const displayPath = formatPath(candidatePath)
    const normalizedPath = displayPath.toLowerCase()
    const lastSegment = displayPath.split('/').pop()?.toLowerCase() ?? normalizedPath

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
      displayPath: formatPath(candidatePath),
      path: candidatePath,
      meta: getCommanderPathSuggestionMeta(candidatePath, paneState),
    }))
}

/** Joins a parent commander path with a child entry name while preserving `~` roots. */
export function joinCommanderPath(path: string, name: string) {
  if (path === '~') {
    return `~/${name}`
  }

  return `${path}/${name}`
}

/** Renders the shared sortable commander header label with its active direction indicator. */
export function renderCommanderSortLabel(
  label: string,
  isActive: boolean,
  sortDirection: CommanderSortDirection,
) {
  const labelComponent = label.toLowerCase()

  return (
    <CommanderPlainBox
      runaComponent={`commander-sort-label-${labelComponent}`}
      style={commanderListHeaderLabelStyle}
    >
      <Text
        runaComponent={`commander-sort-label-${labelComponent}-text`}
        style={{ color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
      >
        {label}
      </Text>
      {isActive ? (
        <Text
          runaComponent={`commander-sort-label-${labelComponent}-indicator`}
          style={commanderListHeaderSortIndicatorStyle}
        >
          {sortDirection === 'desc' ? '▼' : '▲'}
        </Text>
      ) : null}
    </CommanderPlainBox>
  )
}

/** Computes line, column, and character totals for the file-dialog footer. */
export function getCommanderCursorMetrics(content: string, position: number) {
  const safePosition = Math.max(0, Math.min(position, content.length))
  const beforeCursor = content.slice(0, safePosition)
  const lastLineBreakIndex = beforeCursor.lastIndexOf('\n')

  return {
    line: beforeCursor.split('\n').length,
    column: safePosition - lastLineBreakIndex,
    chars: content.length,
  }
}

/** Formats the current pending-operation state into the single-line operator message. */
export function formatPendingOperationMessage(state: CommanderWidgetViewState) {
  const pendingOperation = state.pendingOperation

  if (!pendingOperation) {
    return null
  }

  const selectionLabel =
    pendingOperation.entryNames.length === 1
      ? pendingOperation.entryNames[0]
      : `${pendingOperation.entryNames.length} items`

  switch (pendingOperation.kind) {
    case 'copy':
      if (pendingOperation.transferMode === 'clone') {
        const targetName = pendingOperation.inputValue.trim()

        if (!targetName) {
          return pendingOperation.cloneMode === 'batch'
            ? `Copy template is required in ${pendingOperation.sourcePath}`
            : `Copy target name is required in ${pendingOperation.sourcePath}`
        }

        if (pendingOperation.cloneMode === 'single' && targetName === pendingOperation.entryNames[0]) {
          return `Copy target name must differ from ${pendingOperation.entryNames[0]}`
        }

        if (pendingOperation.duplicateTargetNames?.length) {
          return `Template creates duplicate names in ${pendingOperation.sourcePath}`
        }

        if (
          pendingOperation.cloneMode === 'batch' &&
          pendingOperation.renamePreview.some((previewItem) => previewItem.status === 'invalid')
        ) {
          return `Template creates invalid names in ${pendingOperation.sourcePath}`
        }

        if (pendingOperation.conflictEntryNames?.length) {
          return pendingOperation.cloneMode === 'batch'
            ? `Template conflicts with existing entries in ${pendingOperation.targetPath}`
            : `Conflict: ${pendingOperation.conflictEntryNames[0]} already exists in ${pendingOperation.targetPath}`
        }

        if (pendingOperation.cloneMode === 'batch') {
          return `Copy ${selectionLabel} in ${pendingOperation.sourcePath} using template`
        }

        return `Copy ${selectionLabel} as ${targetName} in ${pendingOperation.sourcePath}`
      }

      if (pendingOperation.conflictEntryNames?.length) {
        return `Conflict: ${pendingOperation.conflictEntryNames[0]} already exists in ${pendingOperation.targetPath}`
      }

      return `Copy ${selectionLabel} to ${pendingOperation.targetPath}`
    case 'move':
      if (pendingOperation.conflictEntryNames?.length) {
        return `Conflict: ${pendingOperation.conflictEntryNames[0]} already exists in ${pendingOperation.targetPath}`
      }

      return `Move ${selectionLabel} to ${pendingOperation.targetPath}`
    case 'delete':
      return `Delete ${selectionLabel} from ${pendingOperation.sourcePath}`
    case 'mkdir':
      return `Create ${pendingOperation.inputValue || 'directory'} in ${pendingOperation.sourcePath}`
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

/** Returns whether the pending bar should block confirmation until the template is fixed. */
export function isPendingOperationBlocking(state: CommanderWidgetViewState) {
  const pendingOperation = state.pendingOperation

  if (pendingOperation?.kind === 'copy' && pendingOperation.transferMode === 'clone') {
    const targetName = pendingOperation.inputValue.trim()

    if (!targetName) {
      return true
    }

    if (pendingOperation.cloneMode === 'batch') {
      return (
        pendingOperation.duplicateTargetNames.length > 0 ||
        pendingOperation.conflictEntryNames.length > 0 ||
        pendingOperation.renamePreview.some((previewItem) => previewItem.status === 'invalid')
      )
    }

    return targetName === pendingOperation.entryNames[0]
  }

  return Boolean(
    pendingOperation && pendingOperation.kind === 'rename' && pendingOperation.duplicateTargetNames.length,
  )
}

/** Returns whether the pending bar should render overwrite/skip conflict actions. */
export function isPendingOperationConflictResolution(state: CommanderWidgetViewState) {
  return Boolean(
    state.pendingOperation &&
    (state.pendingOperation.kind === 'move' ||
      (state.pendingOperation.kind === 'copy' &&
        (state.pendingOperation.transferMode !== 'clone' ||
          state.pendingOperation.cloneMode === 'single'))) &&
    state.pendingOperation.conflictEntryNames.length,
  )
}

/** Converts rename preview status values into the compact badge labels shown in the preview table. */
export function getRenamePreviewStatusLabel(status: CommanderRenamePreviewStatus) {
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

/** Maps rename preview status values to their semantic badge styling. */
export function getRenamePreviewStatusStyle(status: CommanderRenamePreviewStatus): CSSProperties {
  switch (status) {
    case 'duplicate':
      return {
        borderColor: 'var(--runa-commander-status-duplicate-border)',
        background: 'var(--runa-commander-status-duplicate-bg)',
        color: 'var(--runa-commander-status-duplicate-text)',
      }
    case 'conflict':
      return {
        borderColor: 'var(--runa-commander-status-conflict-border)',
        background: 'var(--runa-commander-status-conflict-bg)',
        color: 'var(--runa-commander-status-conflict-text)',
      }
    case 'invalid':
      return {
        borderColor: 'var(--runa-commander-status-invalid-border)',
        background: 'var(--runa-commander-status-invalid-bg)',
        color: 'var(--runa-commander-status-invalid-text)',
      }
    default:
      return {
        borderColor: 'var(--runa-commander-status-ok-border)',
        background: 'var(--runa-commander-status-ok-bg)',
        color: 'var(--runa-commander-status-ok-text)',
      }
  }
}

/** Summarizes rename preview counts for the pending-bar aggregate badges. */
export function getRenamePreviewSummary(preview: CommanderRenamePreviewItem[]) {
  return preview.reduce(
    (summary, item) => {
      summary.total += 1
      summary[item.status] += 1
      return summary
    },
    {
      total: 0,
      ok: 0,
      duplicate: 0,
      conflict: 0,
      invalid: 0,
    },
  )
}

/** Resolves the icon used for one commander row in the visible pane list. */
export function getRowIcon(row: CommanderFileRow) {
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

/** Resolves the short row-type label rendered in the commander type column. */
export function getRowTypeLabel(row: CommanderFileRow) {
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

/** Returns the accessible label for the current pending-operation input field. */
export function getCommanderPendingInputAriaLabel(pendingOperation: CommanderPendingOperation | null) {
  switch (pendingOperation?.kind) {
    case 'copy':
      return pendingOperation.transferMode === 'clone' && pendingOperation.cloneMode === 'batch'
        ? 'Commander copy template input'
        : 'Commander copy target name input'
    case 'mkdir':
      return 'Commander directory name input'
    case 'rename':
      return 'Commander pending operation input'
    case 'filter':
      return 'Commander filter input'
    case 'search':
      return 'Commander search input'
    default:
      return 'Commander mask selection input'
  }
}
