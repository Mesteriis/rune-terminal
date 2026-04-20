import { ChevronLeft, ChevronRight, Eye, EyeOff, FolderTree } from 'lucide-react'

import type { CommanderViewMode, CommanderWidgetViewState } from '@/features/commander/model/types'
import { Box, Surface } from '@/shared/ui/primitives'
import { IconButton } from '@/shared/ui/components'

import { commanderViewModeIconMap } from '@/widgets/commander/commander-widget.shared'
import {
  commanderHeaderClusterStyle,
  commanderHeaderStyle,
  commanderIconControlDisabledStyle,
  commanderIconControlStyle,
  commanderModeButtonActiveStyle,
  commanderModeButtonRowStyle,
  commanderToggleActiveStyle,
} from '@/widgets/commander/commander-widget.styles'

type CommanderHeaderActions = {
  setViewMode: (viewMode: CommanderViewMode) => void
  toggleShowHidden: () => void
}

type CommanderHeaderCommanderActions = {
  goBack: () => void
  goForward: () => void
  toggleDirsFirst: () => void
}

type CommanderHeaderRowProps = {
  state: CommanderWidgetViewState
  actions: CommanderHeaderActions
  commanderActions: CommanderHeaderCommanderActions
  onFocusRoot: () => void
}

export function CommanderHeaderRow({
  state,
  actions,
  commanderActions,
  onFocusRoot,
}: CommanderHeaderRowProps) {
  const activePane = state.activePane === 'left' ? state.leftPane : state.rightPane
  const disableHistoryControls = Boolean(state.pendingOperation)

  return (
    <Surface runaComponent="commander-header" style={commanderHeaderStyle}>
      <Box runaComponent="commander-header-mode-cluster" style={commanderHeaderClusterStyle}>
        <IconButton
          aria-label={`Go back in ${state.activePane} pane`}
          disabled={disableHistoryControls || !activePane.canGoBack}
          onClick={() => {
            commanderActions.goBack()
            onFocusRoot()
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
            onFocusRoot()
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
          {(['commander', 'split', 'terminal'] as const).map((mode) => {
            const ModeIcon = commanderViewModeIconMap[mode]

            return (
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
                <ModeIcon size={14} strokeWidth={1.8} />
              </IconButton>
            )
          })}
        </Box>
      </Box>
      <Box runaComponent="commander-header-toggle-cluster" style={commanderHeaderClusterStyle}>
        <IconButton
          aria-label={state.dirsFirst ? 'Disable folders first sorting' : 'Enable folders first sorting'}
          aria-pressed={state.dirsFirst}
          onClick={() => {
            commanderActions.toggleDirsFirst()
            onFocusRoot()
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
  )
}
