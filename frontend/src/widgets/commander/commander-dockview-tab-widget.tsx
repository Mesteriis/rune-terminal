import type { IDockviewPanelHeaderProps } from 'dockview-react'
import { useEffect, useState } from 'react'

import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { DockviewTabChrome, DockviewTabPill } from '@/shared/ui/components'

const modePillStyle = {
  borderColor: 'var(--runa-commander-highlight-badge-border)',
  color: 'var(--runa-commander-highlight-text)',
  fontFamily: 'var(--font-family-mono)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  fontSize: '12px',
  lineHeight: '16px',
}

export function CommanderDockviewTabWidget(props: IDockviewPanelHeaderProps) {
  const [isActiveTab, setIsActiveTab] = useState(props.api.group.activePanel?.id === props.api.id)
  const [panelCount, setPanelCount] = useState(props.api.group.panels.length)
  const isSingleTab = panelCount === 1

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

  return (
    <RunaDomScopeProvider component="commander-dockview-tab-widget" widget={props.api.id}>
      <DockviewTabChrome active={isActiveTab} single={isSingleTab} style={{ alignItems: 'center', gap: 'var(--gap-sm)' }}>
        <DockviewTabPill runaComponent="commander-tab-mode-badge" style={modePillStyle}>
          commander
        </DockviewTabPill>
      </DockviewTabChrome>
    </RunaDomScopeProvider>
  )
}
