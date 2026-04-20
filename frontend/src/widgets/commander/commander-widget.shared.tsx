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

export type CommanderPathSuggestion = {
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
  background: 'rgba(145, 168, 161, 0.08)',
  color: 'var(--runa-commander-text-muted)',
}

export const commanderViewModeIconMap = {
  commander: Columns2,
  split: Columns3,
  terminal: SquareTerminal,
} as const

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

export function getCommanderPathSuggestions(
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

export function joinCommanderPath(path: string, name: string) {
  if (path === '~') {
    return `~/${name}`
  }

  return `${path}/${name}`
}

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

export function formatPendingOperationMessage(state: CommanderWidgetViewState) {
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

export function isPendingOperationBlocking(state: CommanderWidgetViewState) {
  return Boolean(state.pendingOperation?.duplicateTargetNames?.length)
}

export function isPendingOperationConflictResolution(state: CommanderWidgetViewState) {
  return Boolean(
    state.pendingOperation
    && (state.pendingOperation.kind === 'copy' || state.pendingOperation.kind === 'move')
    && state.pendingOperation.conflictEntryNames?.length,
  )
}

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

export function getRenamePreviewStatusStyle(status: CommanderRenamePreviewStatus): CSSProperties {
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

export function getRenamePreviewSummary(preview: CommanderRenamePreviewItem[]) {
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

export function getCommanderPendingInputAriaLabel(pendingOperation: CommanderPendingOperation | null) {
  switch (pendingOperation?.kind) {
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
