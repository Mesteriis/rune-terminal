import { DockviewReact, type DockviewReadyEvent, type IDockviewPanelProps } from 'dockview-react'
import { useUnit } from 'effector-react'

import { AiSidebar } from './ai/ai-sidebar'
import { $isAiSidebarOpen, toggleAiSidebar } from '../shared/model/app'

const rootStyle = {
  position: 'relative' as const,
  height: '100vh',
  display: 'flex',
  flexDirection: 'column' as const,
}

const topbarStyle = {
  height: 40,
  flex: '0 0 40px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 12px',
  boxSizing: 'border-box' as const,
}

const tabStripStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const contentAreaStyle = {
  flex: 1,
  display: 'flex',
  overflow: 'hidden' as const,
}

const workspaceStyle = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden' as const,
}

const dockviewContainerStyle = {
  height: '100%',
  width: '100%',
}

function Panel(props: IDockviewPanelProps) {
  return <div>PANEL: {props.api.id}</div>
}

const components = {
  default: Panel,
}

export function App() {
  const [isAiSidebarOpen, onToggleAiSidebar] = useUnit([
    $isAiSidebarOpen,
    toggleAiSidebar,
  ])

  const handleReady = (event: DockviewReadyEvent) => {
    const api = event.api

    if (api.getPanel('terminal-header')) {
      return
    }

    api.addPanel({
      id: 'terminal-header',
      title: 'terminal-header',
      component: 'default',
    })

    api.addPanel({
      id: 'terminal',
      title: 'terminal',
      component: 'default',
      position: {
        direction: 'below',
      },
    })

    api.addPanel({
      id: 'tool',
      title: 'tool',
      component: 'default',
      position: {
        direction: 'right',
        referencePanel: 'terminal',
      },
    })
  }

  return (
    <div style={rootStyle}>
      <div style={topbarStyle}>
        <button type="button" aria-pressed={isAiSidebarOpen} onClick={onToggleAiSidebar}>
          AI
        </button>
        <div role="tablist" aria-label="Workspace tabs" style={tabStripStyle}>
          <button type="button" role="tab" aria-selected="true">
            TAB-1
          </button>
          <button type="button" role="tab" aria-selected="false">
            TAB-2
          </button>
        </div>
      </div>
      <div style={contentAreaStyle}>
        <AiSidebar />
        <div style={workspaceStyle}>
          <div style={dockviewContainerStyle}>
            <DockviewReact components={components} onReady={handleReady} />
          </div>
        </div>
      </div>
    </div>
  )
}
