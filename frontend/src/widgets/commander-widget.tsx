import { Columns2, Columns3, Eye, EyeOff, Folder, FileCode2, FileText, Link2, SquareTerminal } from 'lucide-react'

import { RunaDomScopeProvider, useRunaDomAutoTagging } from '../shared/ui/dom-id'
import { Badge, Box, ScrollArea, Separator, Surface, Text } from '../shared/ui/primitives'
import { IconButton } from '../shared/ui/components'

import {
  commanderFooterTextStyle,
  commanderHeaderClusterStyle,
  commanderHeaderStyle,
  commanderIconControlStyle,
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
    <Surface
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
              </Box>
              <Text runaComponent={`commander-pane-${pane.id}-row-${row.id}-git`} style={commanderRowMetaTextStyle}>{row.gitStatus ?? ''}</Text>
              <Text runaComponent={`commander-pane-${pane.id}-row-${row.id}-size`} style={commanderRowMetaTextStyle}>{row.size}</Text>
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

export function CommanderWidget({
  state = commanderWidgetMockState,
}: CommanderWidgetProps) {
  const commanderRootRef = useRunaDomAutoTagging('commander-root')

  return (
    <RunaDomScopeProvider component="commander-widget">
      <Box data-runa-commander-root="" ref={commanderRootRef} runaComponent="commander-root" style={commanderRootStyle}>
      <Surface runaComponent="commander-header" style={commanderHeaderStyle}>
        <Box runaComponent="commander-header-mode-cluster" style={commanderHeaderClusterStyle}>
          <Box role="tablist" runaComponent="commander-view-mode-list" style={commanderModeButtonRowStyle}>
            {(['commander', 'split', 'terminal'] as const).map((mode) => (
              <IconButton
                aria-label={`Set commander view mode to ${mode}`}
                aria-pressed={state.viewMode === mode}
                key={mode}
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
        <CommanderPane isActive={state.activePane === 'left'} pane={state.leftPane} />
        <CommanderPane isActive={state.activePane === 'right'} pane={state.rightPane} />
      </Box>
      <Surface runaComponent="commander-hint-bar" style={commanderHintBarStyle}>
        {state.footerHints.map((hint) => (
          <Box key={hint.key} runaComponent={`commander-hint-${hint.key.toLowerCase()}`} style={commanderHintCellStyle}>
            <Text runaComponent={`commander-hint-${hint.key.toLowerCase()}-key`} style={commanderHintKeyStyle}>{hint.key}</Text>
            <Text runaComponent={`commander-hint-${hint.key.toLowerCase()}-label`} style={commanderHintLabelStyle}>{hint.label}</Text>
          </Box>
        ))}
      </Surface>
    </Box>
    </RunaDomScopeProvider>
  )
}
