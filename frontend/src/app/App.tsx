import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { DockviewReact, type DockviewReadyEvent, type IDockviewPanelProps } from 'dockview-react'
import { useUnit } from 'effector-react'

import { AiSidebar } from './ai/ai-sidebar'
import { $isAiSidebarOpen, toggleAiSidebar } from '../shared/model/app'

const AI_SIDEBAR_DEFAULT_RATIO = 0.5
const AI_SIDEBAR_MIN_WIDTH = 320
const AI_SIDEBAR_MAX_RATIO = 0.8
const AI_SIDEBAR_SASH_WIDTH = 4

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

const aiSidebarSashStyle = {
  flex: `0 0 ${AI_SIDEBAR_SASH_WIDTH}px`,
  width: AI_SIDEBAR_SASH_WIDTH,
  cursor: 'col-resize',
  backgroundColor: '#d0d0d0',
}

function Panel(props: IDockviewPanelProps) {
  return <div>PANEL: {props.api.id}</div>
}

const components = {
  default: Panel,
}

function getDefaultAiSidebarWidth() {
  if (typeof window === 'undefined') {
    return 720
  }

  return Math.round(window.innerWidth * AI_SIDEBAR_DEFAULT_RATIO)
}

function clampAiSidebarWidth(width: number, viewportWidth: number) {
  const maxWidth = Math.max(AI_SIDEBAR_MIN_WIDTH, Math.round(viewportWidth * AI_SIDEBAR_MAX_RATIO))

  return Math.min(Math.max(width, AI_SIDEBAR_MIN_WIDTH), maxWidth)
}

export function App() {
  const [isAiSidebarOpen, onToggleAiSidebar] = useUnit([
    $isAiSidebarOpen,
    toggleAiSidebar,
  ])
  const [aiSidebarWidth, setAiSidebarWidth] = useState(getDefaultAiSidebarWidth)
  const [isResizingAiSidebar, setIsResizingAiSidebar] = useState(false)

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

  useEffect(() => {
    if (!isResizingAiSidebar) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      setAiSidebarWidth(clampAiSidebarWidth(event.clientX, window.innerWidth))
    }

    const handleMouseUp = () => {
      setIsResizingAiSidebar(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingAiSidebar])

  useEffect(() => {
    const handleResize = () => {
      setAiSidebarWidth((currentWidth) =>
        clampAiSidebarWidth(currentWidth, window.innerWidth),
      )
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleAiSidebarResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsResizingAiSidebar(true)
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
        <AiSidebar width={aiSidebarWidth} />
        {isAiSidebarOpen ? (
          <div
            role="separator"
            aria-label="Resize AI panel"
            aria-orientation="vertical"
            onMouseDown={handleAiSidebarResizeStart}
            style={aiSidebarSashStyle}
          />
        ) : null}
        <div style={workspaceStyle}>
          <div style={dockviewContainerStyle}>
            <DockviewReact components={components} onReady={handleReady} />
          </div>
        </div>
      </div>
    </div>
  )
}
