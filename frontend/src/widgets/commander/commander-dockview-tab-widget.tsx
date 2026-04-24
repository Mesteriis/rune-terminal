import type { IDockviewPanelHeaderProps } from 'dockview-react'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { DockviewTabChrome, DockviewTabPill, IconButton } from '@/shared/ui/components'
import { Text } from '@/shared/ui/primitives'
import {
  commanderDockviewModePillStyle,
  commanderDockviewTabChromeStyle,
  commanderDockviewTabCloseButtonStyle,
  commanderDockviewTabTitleActiveStyle,
  commanderDockviewTabTitleStyle,
} from '@/widgets/commander/commander-dockview-tab-widget.styles'

function formatCommanderTabTitle(panelId: string, fallbackTitle: string) {
  const suffixMatch = panelId.match(/-(\d+)$/)

  if (!suffixMatch) {
    return fallbackTitle
  }

  return `${fallbackTitle} ${suffixMatch[1]}`
}

/** Renders the compact commander-specific Dockview tab chrome. */
export function CommanderDockviewTabWidget(props: IDockviewPanelHeaderProps) {
  const [isActiveTab, setIsActiveTab] = useState(props.api.group.activePanel?.id === props.api.id)
  const [panelCount, setPanelCount] = useState(props.api.group.panels.length)
  const isSingleTab = panelCount === 1
  const displayTitle = formatCommanderTabTitle(props.api.id, props.api.title ?? 'tool')

  useEffect(() => {
    const syncActiveTab = () => {
      setIsActiveTab(props.api.group.activePanel?.id === props.api.id)
      setPanelCount(props.api.group.panels.length)
    }

    syncActiveTab()

    const activePanelChangeDisposable = props.api.group.api.onDidActivePanelChange(syncActiveTab)
    const groupChangeDisposable = props.api.onDidGroupChange(syncActiveTab)

    return () => {
      activePanelChangeDisposable.dispose()
      groupChangeDisposable.dispose()
    }
  }, [props.api])

  const handleClosePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleCloseClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    props.api.close()
  }

  return (
    <RunaDomScopeProvider component="commander-dockview-tab-widget" widget={props.api.id}>
      <DockviewTabChrome active={isActiveTab} single={isSingleTab} style={commanderDockviewTabChromeStyle}>
        <DockviewTabPill runaComponent="commander-tab-mode-badge" style={commanderDockviewModePillStyle}>
          commander
        </DockviewTabPill>
        <Text
          runaComponent="commander-tab-title"
          style={isActiveTab ? commanderDockviewTabTitleActiveStyle : commanderDockviewTabTitleStyle}
          title={displayTitle}
        >
          {displayTitle}
        </Text>
        {panelCount > 1 ? (
          <IconButton
            aria-label={`Close ${displayTitle}`}
            onClick={handleCloseClick}
            onPointerDown={handleClosePointerDown}
            runaComponent="commander-tab-close"
            size="sm"
            style={commanderDockviewTabCloseButtonStyle}
          >
            <X size={14} strokeWidth={1.8} />
          </IconButton>
        ) : null}
      </DockviewTabChrome>
    </RunaDomScopeProvider>
  )
}
