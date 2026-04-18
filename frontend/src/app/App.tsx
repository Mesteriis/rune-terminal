import { DockviewReact, type DockviewApi, type DockviewGroupPanel, type DockviewReadyEvent, type IDockviewHeaderActionsProps, type IDockviewPanel, type IDockviewPanelProps } from 'dockview-react'
import { useEffect, useState } from 'react'
import { useUnit } from 'effector-react'

import { AiPanel } from './ai/ai-sidebar'
import { $isAiSidebarOpen, toggleAiSidebar } from '../shared/model/app'

const SHELL_HEADER_SIZE = 40
const AI_PANEL_ID_PREFIX = 'ai-panel-'
const AI_GROUP_ATTRIBUTE = 'data-runa-group'
const AI_GROUP_ATTRIBUTE_VALUE = 'ai'
const AI_GROUP_DEFAULT_RATIO = 0.3

const rootStyle = {
  position: 'relative' as const,
  height: '100vh',
  display: 'flex',
  flexDirection: 'column' as const,
}

const topbarStyle = {
  height: SHELL_HEADER_SIZE,
  flex: `0 0 ${SHELL_HEADER_SIZE}px`,
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
  minHeight: 0,
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

const rightRailStyle = {
  flex: `0 0 ${SHELL_HEADER_SIZE}px`,
  width: SHELL_HEADER_SIZE,
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'space-between',
  alignItems: 'center',
  boxSizing: 'border-box' as const,
  padding: 4,
}

function Panel(props: IDockviewPanelProps) {
  return <div>PANEL: {props.api.id}</div>
}

function isAiPanel(panel: Pick<IDockviewPanel, 'id'> | undefined): boolean {
  return Boolean(panel?.id.startsWith(AI_PANEL_ID_PREFIX))
}

function isAiGroup(group: Pick<DockviewGroupPanel, 'panels' | 'element'> | undefined): boolean {
  if (!group) {
    return false
  }

  return (
    group.element.getAttribute(AI_GROUP_ATTRIBUTE) === AI_GROUP_ATTRIBUTE_VALUE ||
    group.panels.some((panel) => isAiPanel(panel))
  )
}

function markAiGroup(group: DockviewGroupPanel) {
  group.locked = 'no-drop-target'
  group.element.setAttribute(AI_GROUP_ATTRIBUTE, AI_GROUP_ATTRIBUTE_VALUE)
}

function findAiGroup(api: DockviewApi): DockviewGroupPanel | undefined {
  return api.groups.find((group) => isAiGroup(group))
}

function getNextAiPanelNumber(api: DockviewApi) {
  return (
    api.panels.reduce((max, panel) => {
      if (!isAiPanel(panel)) {
        return max
      }

      const panelNumber = Number.parseInt(panel.id.replace(AI_PANEL_ID_PREFIX, ''), 10)

      return Number.isNaN(panelNumber) ? max : Math.max(max, panelNumber)
    }, 0) + 1
  )
}

function getDefaultAiPanelWidth() {
  if (typeof window === 'undefined') {
    return 450
  }

  return Math.round(window.innerWidth * AI_GROUP_DEFAULT_RATIO)
}

function createAiPanel(api: DockviewApi, group?: DockviewGroupPanel) {
  const panelNumber = getNextAiPanelNumber(api)
  const panelId = `${AI_PANEL_ID_PREFIX}${panelNumber}`
  const panelTitle = panelNumber === 1 ? 'AI' : `AI ${panelNumber}`
  const panel = group
    ? api.addPanel({
        id: panelId,
        title: panelTitle,
        component: 'ai',
        position: {
          referenceGroup: group,
        },
      })
    : api.addPanel({
        id: panelId,
        title: panelTitle,
        component: 'ai',
        initialWidth: getDefaultAiPanelWidth(),
        position: {
          direction: 'left',
        },
      })

  markAiGroup(panel.group)

  return panel
}

function AiGroupActions(props: IDockviewHeaderActionsProps) {
  if (!isAiGroup(props.group)) {
    return null
  }

  return (
    <button
      type="button"
      aria-label="Add AI tab"
      onClick={() => createAiPanel(props.containerApi, props.group)}
    >
      +
    </button>
  )
}

const components = {
  default: Panel,
  ai: AiPanel,
}

export function App() {
  const [isAiSidebarOpen, onToggleAiSidebar] = useUnit([
    $isAiSidebarOpen,
    toggleAiSidebar,
  ])
  const [dockviewApi, setDockviewApi] = useState<DockviewApi | null>(null)

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

    setDockviewApi(api)
  }

  useEffect(() => {
    if (!dockviewApi) {
      return
    }

    const aiGroup = findAiGroup(dockviewApi)

    if (isAiSidebarOpen) {
      if (!aiGroup) {
        createAiPanel(dockviewApi)
        return
      }

      markAiGroup(aiGroup)
      return
    }

    if (aiGroup) {
      dockviewApi.removeGroup(aiGroup)
    }
  }, [dockviewApi, isAiSidebarOpen])

  useEffect(() => {
    if (!dockviewApi) {
      return
    }

    const panelDragDisposable = dockviewApi.onWillDragPanel((event) => {
      if (isAiPanel(event.panel)) {
        event.nativeEvent.preventDefault()
      }
    })
    const groupDragDisposable = dockviewApi.onWillDragGroup((event) => {
      if (isAiGroup(event.group)) {
        event.nativeEvent.preventDefault()
      }
    })

    return () => {
      panelDragDisposable.dispose()
      groupDragDisposable.dispose()
    }
  }, [dockviewApi])

  return (
    <div style={rootStyle}>
      <div style={topbarStyle}>
        <button type="button" role="tab" aria-selected="false">
          Close
        </button>
        <button type="button" role="tab" aria-selected="false">
          Collapse
        </button>
        <button type="button" role="tab" aria-selected="false">
          Fullscreen
        </button>
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
        <div style={workspaceStyle}>
          <div style={dockviewContainerStyle}>
            <DockviewReact
              components={components}
              onReady={handleReady}
              rightHeaderActionsComponent={AiGroupActions}
            />
          </div>
        </div>
        <div role="complementary" aria-label="Right action rail" style={rightRailStyle}>
          <button type="button" aria-label="Open utility panel">
            +
          </button>
          <button type="button" aria-label="Open settings panel">
            *
          </button>
        </div>
      </div>
    </div>
  )
}
