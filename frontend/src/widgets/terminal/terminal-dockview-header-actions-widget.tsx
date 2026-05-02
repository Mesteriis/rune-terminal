import type * as React from 'react'
import type { IDockviewHeaderActionsProps } from 'dockview-react'
import { Plus, X } from 'lucide-react'

import type { AppLocale } from '@/shared/api/runtime'
import { resolveLocalizedCopy } from '@/features/i18n/model/localized-copy'
import { useAppLocale } from '@/features/i18n/model/locale-provider'
import { createTerminalTab } from '@/features/terminal/api/client'
import { closeWorkspaceWidget, WorkspaceAPIError } from '@/shared/api/workspace'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { IconButton } from '@/shared/ui/components'
import { Box } from '@/shared/ui/primitives'
import { resolveFilesPanelParams } from '@/widgets/files'
import { resolvePreviewPanelParams } from '@/widgets/preview'
import {
  closeTerminalPanel,
  createNextTerminalPanelId,
  createTerminalPanelParams,
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

  const handleAddTerminalTab = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!terminalPanelParams) {
      return
    }

    const nextPanelId = createNextTerminalPanelId(props.containerApi, terminalPanelParams.preset)
    const nextPanelParams = createTerminalPanelParams(terminalPanelParams.preset, nextPanelId)
    const suffixMatch = nextPanelId.match(/-(\d+)$/)

    try {
      const runtimeTerminal = await createTerminalTab(nextPanelParams.title)

      props.containerApi.addPanel({
        id: nextPanelId,
        title: suffixMatch ? `${nextPanelParams.title} ${suffixMatch[1]}` : nextPanelParams.title,
        component: 'default',
        tabComponent: 'terminal-tab',
        params: createTerminalPanelParams(
          terminalPanelParams.preset,
          runtimeTerminal.widget_id,
          runtimeTerminal.tab_id,
        ),
        position: {
          direction: 'within',
          referencePanel: props.activePanel!.id,
        },
      })
    } catch (error) {
      console.error('Unable to add terminal tab', error)
    }
  }

  const handleAddPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

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
          {terminalPanelParams ? (
            <IconButton
              aria-label={copy.addTerminalTabAria(terminalPanelParams.title)}
              onClick={handleAddTerminalTab}
              onPointerDown={handleAddPointerDown}
              runaComponent="terminal-group-add"
              size="sm"
              style={terminalDockviewIconButtonStyle}
            >
              <Plus size={14} strokeWidth={1.8} />
            </IconButton>
          ) : null}
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
