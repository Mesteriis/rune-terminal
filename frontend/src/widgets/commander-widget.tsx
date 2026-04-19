import { Folder, FileCode2, FileText, Link2 } from 'lucide-react'

import { Badge, Box, Button, ScrollArea, Separator, Surface, Text } from '../shared/ui/primitives'

import {
  commanderFooterTextStyle,
  commanderHeaderClusterStyle,
  commanderHeaderStyle,
  commanderHintBarStyle,
  commanderHintCellStyle,
  commanderHintKeyStyle,
  commanderHintLabelStyle,
  commanderListHeaderStyle,
  commanderMainStyle,
  commanderModeButtonActiveStyle,
  commanderModeButtonRowStyle,
  commanderModeButtonStyle,
  commanderPaneActiveStyle,
  commanderPaneFooterStyle,
  commanderPaneHeaderActiveStyle,
  commanderPaneHeaderStyle,
  commanderPaneMetaStyle,
  commanderPaneStyle,
  commanderPaneTitleStyle,
  commanderPathTextStyle,
  commanderRootStyle,
  commanderRowFocusedStyle,
  commanderRowHiddenStyle,
  commanderRowMetaTextStyle,
  commanderRowNameCellStyle,
  commanderRowNameTextStyle,
  commanderRowSelectedStyle,
  commanderRowStyle,
  commanderRowsStyle,
  commanderScrollAreaStyle,
  commanderToggleActiveStyle,
  commanderToggleButtonStyle,
  commanderTypeBadgeStyle,
} from './commander-widget.styles'
import {
  commanderWidgetMockState,
  type CommanderFileRow,
  type CommanderPaneState,
  type CommanderWidgetMockState,
} from './commander-widget.mock'

export type CommanderWidgetProps = {
  state?: CommanderWidgetMockState
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

const modeBadgeStyle = {
  borderColor: 'var(--runa-commander-highlight-badge-border)',
  background: 'var(--runa-commander-highlight-badge-bg)',
  color: 'var(--runa-commander-highlight-text)',
  fontFamily: 'var(--font-family-mono)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
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
    return 'LNK'
  }

  if (row.executable) {
    return 'EXE'
  }

  return row.ext ? row.ext.toUpperCase() : 'FILE'
}

function CommanderPane({
  isActive,
  pane,
}: {
  isActive: boolean
  pane: CommanderPaneState
}) {
  return (
    <Surface style={{ ...commanderPaneStyle, ...(isActive ? commanderPaneActiveStyle : null) }}>
      <Box
        style={{
          ...commanderPaneHeaderStyle,
          ...(isActive ? commanderPaneHeaderActiveStyle : null),
        }}
      >
        <Box style={commanderPaneTitleStyle}>
          <Badge style={isActive ? paneStateBadgeStyle : inactivePaneStateBadgeStyle}>
            {isActive ? 'ACTIVE' : 'PANE'}
          </Badge>
          <Text style={commanderPathTextStyle}>{pane.path}</Text>
        </Box>
        <Text style={commanderPaneMetaStyle}>{pane.counters.items} items</Text>
      </Box>
      <Separator />
      <Box style={commanderListHeaderStyle}>
        <Text style={commanderPaneMetaStyle}>T</Text>
        <Text style={commanderPaneMetaStyle}>Name</Text>
        <Text style={commanderPaneMetaStyle}>Git</Text>
        <Text style={commanderPaneMetaStyle}>Size</Text>
        <Text style={commanderPaneMetaStyle}>Modified</Text>
      </Box>
      <Separator />
      <ScrollArea style={commanderScrollAreaStyle}>
        <Box style={commanderRowsStyle}>
          {pane.rows.map((row) => (
            <Box
              key={row.id}
              style={{
                ...commanderRowStyle,
                ...(row.selected ? commanderRowSelectedStyle : null),
                ...(row.focused ? commanderRowFocusedStyle : null),
                ...(row.hidden ? commanderRowHiddenStyle : null),
              }}
            >
              <Box style={{ ...plainClusterStyle, justifyContent: 'center' }}>{getRowIcon(row)}</Box>
              <Box style={commanderRowNameCellStyle}>
                <Text style={commanderRowNameTextStyle}>{row.name}</Text>
                <Badge style={commanderTypeBadgeStyle}>{getRowTypeLabel(row)}</Badge>
              </Box>
              <Text style={commanderRowMetaTextStyle}>{row.gitStatus ?? ''}</Text>
              <Text style={commanderRowMetaTextStyle}>{row.size}</Text>
              <Text style={commanderRowMetaTextStyle}>{row.modified}</Text>
            </Box>
          ))}
        </Box>
      </ScrollArea>
      <Separator />
      <Box style={commanderPaneFooterStyle}>
        <Text style={commanderFooterTextStyle}>
          {pane.counters.selectedItems} selected
        </Text>
        <Text style={commanderFooterTextStyle}>{pane.counters.selectedSize}</Text>
      </Box>
    </Surface>
  )
}

export function CommanderWidget({
  state = commanderWidgetMockState,
}: CommanderWidgetProps) {
  return (
    <Box data-runa-commander-root="" style={commanderRootStyle}>
      <Surface style={commanderHeaderStyle}>
        <Box style={commanderHeaderClusterStyle}>
          <Badge style={modeBadgeStyle}>{state.mode}</Badge>
          <Box role="tablist" style={commanderModeButtonRowStyle}>
            {(['commander', 'split', 'terminal'] as const).map((mode) => (
              <Button
                aria-pressed={state.viewMode === mode}
                key={mode}
                style={{
                  ...commanderModeButtonStyle,
                  ...(state.viewMode === mode ? commanderModeButtonActiveStyle : null),
                }}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </Box>
        </Box>
        <Box style={commanderHeaderClusterStyle}>
          <Button
            aria-pressed={state.showHidden}
            style={{
              ...commanderToggleButtonStyle,
              ...(state.showHidden ? commanderToggleActiveStyle : null),
            }}
          >
            Show hidden
          </Button>
          <Button
            aria-pressed={state.syncCwd}
            style={{
              ...commanderToggleButtonStyle,
              ...(state.syncCwd ? commanderToggleActiveStyle : null),
            }}
          >
            Sync cwd
          </Button>
          <Button aria-pressed="true" style={{ ...commanderToggleButtonStyle, ...commanderToggleActiveStyle }}>
            Sort: {state.sortMode}
          </Button>
        </Box>
      </Surface>
      <Box style={commanderMainStyle}>
        <CommanderPane isActive={state.activePane === 'left'} pane={state.leftPane} />
        <CommanderPane isActive={state.activePane === 'right'} pane={state.rightPane} />
      </Box>
      <Surface style={commanderHintBarStyle}>
        {state.footerHints.map((hint) => (
          <Box key={hint.key} style={commanderHintCellStyle}>
            <Text style={commanderHintKeyStyle}>{hint.key}</Text>
            <Text style={commanderHintLabelStyle}>{hint.label}</Text>
          </Box>
        ))}
      </Surface>
    </Box>
  )
}
