import { DockviewReact, type DockviewReadyEvent, type IDockviewPanelProps } from 'dockview-react'
import { useUnit } from 'effector-react'

import { AiSidebar } from './ai/ai-sidebar'
import { toggleAiSidebar } from '../shared/model/app'

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

const workspaceStyle = {
  flex: 1,
  overflow: 'hidden' as const,
}

const dockviewContainerStyle = {
  height: '100%',
  width: '100%',
}

const overlayLayerStyle = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  pointerEvents: 'none' as const,
}

function Panel(props: IDockviewPanelProps) {
  return <div>PANEL: {props.api.id}</div>
}

const components = {
  default: Panel,
}

export function App() {
  const onToggleAiSidebar = useUnit(toggleAiSidebar)

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
        <span>TAB-1</span>
        <span>TAB-2</span>
        <button type="button" onClick={onToggleAiSidebar}>
          AI
        </button>
      </div>
      <div style={workspaceStyle}>
        <div style={dockviewContainerStyle}>
          <DockviewReact components={components} onReady={handleReady} />
        </div>
      </div>
      <div style={overlayLayerStyle}>
        <AiSidebar />
      </div>
    </div>
  )
}
