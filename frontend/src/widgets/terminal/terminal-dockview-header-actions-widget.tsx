import type * as React from 'react'
import type { IDockviewHeaderActionsProps } from 'dockview-react'
import { X } from 'lucide-react'

import type { AppLocale } from '@/shared/api/runtime'
import { resolveLocalizedCopy } from '@/features/i18n/model/localized-copy'
import { useAppLocale } from '@/features/i18n/model/locale-provider'
import { closeWorkspaceWidget, WorkspaceAPIError } from '@/shared/api/workspace'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { IconButton } from '@/shared/ui/components'
import { Box } from '@/shared/ui/primitives'
import { resolveFilesPanelParams } from '@/widgets/files'
import { resolvePreviewPanelParams } from '@/widgets/preview'
import {
  closeTerminalPanel,
  isTerminalPanel,
  resolveTerminalPanelParams,
} from '@/widgets/terminal/terminal-panel'
import {
  resolveDockviewHeaderActionsWrapStyle,
  terminalDockviewActionGroupStyle,
  terminalDockviewIconButtonStyle,
} from '@/widgets/terminal/terminal-dockview-actions.styles'
import { terminalWidgetCopy } from '@/widgets/terminal/terminal-widget-copy'

function useOptionalAppLocale(): AppLocale {
  try {
    return useAppLocale().locale
  } catch {
    return 'en'
  }
}

export function TerminalDockviewHeaderActionsWidget(props: IDockviewHeaderActionsProps) {
  const locale = useOptionalAppLocale()
  const copy = resolveLocalizedCopy(terminalWidgetCopy, locale)

  if (!props.activePanel) {
    return null
  }

  const isTerminal = isTerminalPanel(props.activePanel.id, props.activePanel.params)
  const terminalPanelParams = isTerminal
    ? resolveTerminalPanelParams(props.activePanel.id, props.activePanel.params)
    : null
  const filesPanelParams = resolveFilesPanelParams(props.activePanel.params)
  const previewPanelParams = resolvePreviewPanelParams(props.activePanel.params)
  const headerActionsWrapStyle = resolveDockviewHeaderActionsWrapStyle(Boolean(terminalPanelParams))

  const handleClosePanel = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!props.activePanel) {
      return
    }

    if (terminalPanelParams) {
      await closeTerminalPanel(props.activePanel.api, terminalPanelParams)
      return
    }

    const backendPanelParams = filesPanelParams ?? previewPanelParams

    if (backendPanelParams) {
      try {
        await closeWorkspaceWidget(backendPanelParams.widgetId)
      } catch (error) {
        if (!(error instanceof WorkspaceAPIError && error.status === 404)) {
          console.error('Unable to close workspace widget', error)
          return
        }
      }
    }

    props.activePanel.api.close()
  }

  const handleClosePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  return (
    <RunaDomScopeProvider component="terminal-dockview-header-actions-widget" widget={props.activePanel.id}>
      <Box runaComponent="terminal-dockview-header-actions-wrap" style={headerActionsWrapStyle}>
        <Box runaComponent="terminal-dockview-header-actions-group" style={terminalDockviewActionGroupStyle}>
          <IconButton
            aria-label={copy.closePanelAria(props.activePanel.title ?? props.activePanel.id)}
            onClick={handleClosePanel}
            onPointerDown={handleClosePointerDown}
            runaComponent="dockview-panel-close"
            size="sm"
            style={terminalDockviewIconButtonStyle}
          >
            <X size={14} strokeWidth={1.8} />
          </IconButton>
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
