import { DockviewReact, type DockviewApi, type DockviewGroupPanel, type DockviewReadyEvent, type IDockviewHeaderActionsProps, type IDockviewPanel, type IDockviewPanelProps } from 'dockview-react'
import { useEffect, useState } from 'react'
import { useUnit } from 'effector-react'

import { $isAiSidebarOpen, toggleAiSidebar } from '../shared/model/app'
import { Box } from '../shared/ui/primitives'
import {
  AiGroupActionsWidget,
  AiPanelWidget,
  DockviewPanelWidget,
  RightActionRailWidget,
  ShellTopbarWidget,
} from '../widgets'

const AI_PANEL_ID_PREFIX = 'ai-panel-'
const AI_GROUP_ATTRIBUTE = 'data-runa-group'
const AI_GROUP_ATTRIBUTE_VALUE = 'ai'
const AI_GROUP_DEFAULT_RATIO = 0.3

const rootStyle = {
  position: 'relative' as const,
  height: '100vh',
  display: 'flex',
  overflow: 'hidden' as const,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'var(--color-canvas)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const mainShellStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const contentAreaStyle = {
  flex: 1,
  display: 'flex',
  minHeight: 0,
  overflow: 'hidden' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: 'var(--gap-shell-chrome) var(--gap-shell-chrome) 0 0',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const workspaceStyle = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const dockviewContainerStyle = {
  height: '100%',
  width: '100%',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
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

  return <AiGroupActionsWidget onAddTab={() => createAiPanel(props.containerApi, props.group)} />
}

const components = {
  default: DockviewPanelWidget,
  ai: AiPanelWidget,
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
    <Box style={rootStyle}>
      <Box style={mainShellStyle}>
        <ShellTopbarWidget isAiOpen={isAiSidebarOpen} onToggleAi={onToggleAiSidebar} />
        <Box style={contentAreaStyle}>
          <Box style={workspaceStyle}>
            <Box style={dockviewContainerStyle}>
              <DockviewReact
                components={components}
                onReady={handleReady}
                rightHeaderActionsComponent={AiGroupActions}
              />
            </Box>
          </Box>
        </Box>
      </Box>
      <RightActionRailWidget />
    </Box>
  )
}
