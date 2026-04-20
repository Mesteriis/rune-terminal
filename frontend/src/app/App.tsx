import { DockviewReact, type DockviewApi, type DockviewReadyEvent, type DockviewTheme, type SerializedDockview } from 'dockview-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useUnit } from 'effector-react'

import { $isAiSidebarOpen, toggleAiSidebar } from '@/shared/model/app'
import { BODY_MODAL_HOST_ID } from '@/shared/model/modal'
import { RunaDomScopeProvider, useRunaDomAutoTagging } from '@/shared/ui/dom-id'
import { Box } from '@/shared/ui/primitives'
import { createTerminalPanelParams } from '@/widgets/terminal/terminal-panel'
import {
  AiPanelHeaderWidget,
  AiPanelWidget,
  CommanderDockviewTabWidget,
  DockviewPanelWidget,
  ModalHostWidget,
  RightActionRailWidget,
  ShellTopbarWidget,
  type ShellWorkspaceTab,
  TerminalDockviewHeaderActionsWidget,
  TerminalDockviewTabWidget,
} from '@/widgets'

const AI_PANEL_DEFAULT_RATIO = 0.3
const AI_PANEL_MIN_WIDTH = 320
const AI_PANEL_RESIZE_HANDLE_WIDTH = 6
const AI_SHELL_PANEL_HOST_ID = 'ai-shell-panel'
const AI_PANEL_ANIMATION_SECONDS = 0.84
const AI_PANEL_ANIMATION_EASE = [0.22, 0.61, 0.36, 1] as const
const DOCKVIEW_GROUP_GAP = 6
const DOCKVIEW_WORKSPACE_STORAGE_KEY = 'runa-terminal:dockview-workspaces:v1'
const DOCKVIEW_PERSIST_DEBOUNCE_MS = 120
const WORKSPACE_MIN_WIDTH = 420

const runaDockviewTheme: DockviewTheme = {
  name: 'runa',
  className: 'runa-dockview-theme',
  gap: DOCKVIEW_GROUP_GAP,
}

const rootStyle = {
  position: 'relative' as const,
  height: '100%',
  display: 'flex',
  overflow: 'hidden' as const,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
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

const aiPanelShellStyle = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const aiPanelShellContentStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  overflow: 'hidden' as const,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const aiPanelFrameStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
  overflow: 'hidden' as const,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const aiPanelHeaderStyle = {
  flex: '0 0 auto',
  height: 'auto',
  minHeight: '44px',
  display: 'flex',
  alignItems: 'stretch',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const aiPanelBodyStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden' as const,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const aiResizeHandleStyle = {
  flex: `0 0 ${AI_PANEL_RESIZE_HANDLE_WIDTH}px`,
  width: `${AI_PANEL_RESIZE_HANDLE_WIDTH}px`,
  minWidth: `${AI_PANEL_RESIZE_HANDLE_WIDTH}px`,
  minHeight: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  cursor: 'default',
  position: 'relative' as const,
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

type WorkspaceLayoutTab = ShellWorkspaceTab & {
  snapshot: SerializedDockview | null
}

type PersistedDockviewWorkspaceState = {
  activeWorkspaceId: number
  workspaceTabs: WorkspaceLayoutTab[]
}

function createDefaultWorkspaceTabs(): WorkspaceLayoutTab[] {
  return [
    { id: 1, title: 'Workspace-1', snapshot: null },
    { id: 2, title: 'Workspace-2', snapshot: null },
  ]
}

function readPersistedWorkspaceState(): PersistedDockviewWorkspaceState | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(DOCKVIEW_WORKSPACE_STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    const parsedValue = JSON.parse(rawValue) as Partial<PersistedDockviewWorkspaceState>

    if (!Array.isArray(parsedValue.workspaceTabs) || typeof parsedValue.activeWorkspaceId !== 'number') {
      return null
    }

    const workspaceTabs = parsedValue.workspaceTabs
      .filter((workspace): workspace is WorkspaceLayoutTab =>
        Boolean(
          workspace
          && typeof workspace.id === 'number'
          && typeof workspace.title === 'string'
          && ('snapshot' in workspace),
        ),
      )
      .map((workspace) => ({
        id: workspace.id,
        title: workspace.title,
        snapshot: workspace.snapshot ?? null,
      }))

    if (workspaceTabs.length === 0) {
      return null
    }

    const hasActiveWorkspace = workspaceTabs.some((workspace) => workspace.id === parsedValue.activeWorkspaceId)

    if (!hasActiveWorkspace) {
      return null
    }

    return {
      activeWorkspaceId: parsedValue.activeWorkspaceId,
      workspaceTabs,
    }
  } catch {
    return null
  }
}

function writePersistedWorkspaceState(state: PersistedDockviewWorkspaceState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(DOCKVIEW_WORKSPACE_STORAGE_KEY, JSON.stringify(state))
}

function getDefaultAiPanelWidth() {
  if (typeof window === 'undefined') {
    return 450
  }

  return Math.round(window.innerWidth * AI_PANEL_DEFAULT_RATIO)
}

function clampAiPanelWidth(requestedWidth: number, contentAreaElement: HTMLDivElement | null) {
  if (!contentAreaElement) {
    return Math.max(AI_PANEL_MIN_WIDTH, requestedWidth)
  }

  const maxWidth = Math.max(
    AI_PANEL_MIN_WIDTH,
    contentAreaElement.clientWidth - WORKSPACE_MIN_WIDTH - AI_PANEL_RESIZE_HANDLE_WIDTH,
  )

  return Math.min(Math.max(requestedWidth, AI_PANEL_MIN_WIDTH), maxWidth)
}

const components = {
  default: DockviewPanelWidget,
}

const tabComponents = {
  'commander-tab': CommanderDockviewTabWidget,
  'terminal-tab': TerminalDockviewTabWidget,
}

export function App() {
  const [isAiSidebarOpen, onToggleAiSidebar] = useUnit([
    $isAiSidebarOpen,
    toggleAiSidebar,
  ])
  const [aiPanelWidth, setAiPanelWidth] = useState(getDefaultAiPanelWidth())
  const [isAiPanelResizing, setIsAiPanelResizing] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const contentAreaRef = useRef<HTMLDivElement | null>(null)
  const dockviewApiRef = useRef<DockviewApi | null>(null)
  const dockviewContainerRef = useRef<HTMLDivElement | null>(null)
  const aiResizeStartRef = useRef<{ startWidth: number; startX: number } | null>(null)
  const initialWorkspaceStateRef = useRef<PersistedDockviewWorkspaceState | null>(readPersistedWorkspaceState())
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceLayoutTab[]>(
    initialWorkspaceStateRef.current?.workspaceTabs ?? createDefaultWorkspaceTabs(),
  )
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    initialWorkspaceStateRef.current?.activeWorkspaceId ?? 2,
  )
  const workspaceTabsRef = useRef<WorkspaceLayoutTab[]>(
    initialWorkspaceStateRef.current?.workspaceTabs ?? createDefaultWorkspaceTabs(),
  )
  const activeWorkspaceIdRef = useRef(initialWorkspaceStateRef.current?.activeWorkspaceId ?? 2)
  const dockviewPersistenceTimeoutRef = useRef<number | null>(null)
  const dockviewPersistenceDisposablesRef = useRef<Array<{ dispose: () => void }>>([])

  const updateWorkspaceTabs = (updater: (tabs: WorkspaceLayoutTab[]) => WorkspaceLayoutTab[]) => {
    const nextTabs = updater(workspaceTabsRef.current)
    workspaceTabsRef.current = nextTabs
    setWorkspaceTabs(nextTabs)
  }

  const disposeDockviewPersistenceBindings = () => {
    dockviewPersistenceDisposablesRef.current.forEach((disposable) => disposable.dispose())
    dockviewPersistenceDisposablesRef.current = []
  }

  const syncDockviewLayout = () => {
    const api = dockviewApiRef.current
    const container = dockviewContainerRef.current

    if (!api || !container) {
      return
    }

    api.layout(container.clientWidth, container.clientHeight)
  }

  const scheduleDockviewLayoutSync = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        syncDockviewLayout()
      })
    })
  }

  const schedulePersistCurrentWorkspaceSnapshot = () => {
    if (typeof window === 'undefined') {
      return
    }

    if (dockviewPersistenceTimeoutRef.current !== null) {
      window.clearTimeout(dockviewPersistenceTimeoutRef.current)
    }

    dockviewPersistenceTimeoutRef.current = window.setTimeout(() => {
      dockviewPersistenceTimeoutRef.current = null
      persistCurrentWorkspaceSnapshot()
    }, DOCKVIEW_PERSIST_DEBOUNCE_MS)
  }

  const persistCurrentWorkspaceSnapshot = () => {
    const api = dockviewApiRef.current

    if (!api) {
      return
    }

    const activeId = activeWorkspaceIdRef.current
    const nextSnapshot = api.panels.length > 0 ? api.toJSON() : null

    updateWorkspaceTabs((tabs) =>
      tabs.map((workspace) =>
        workspace.id === activeId
          ? { ...workspace, snapshot: nextSnapshot }
          : workspace,
      ),
    )
  }

  const bindDockviewPersistence = (api: DockviewApi) => {
    disposeDockviewPersistenceBindings()

    dockviewPersistenceDisposablesRef.current = [
      api.onDidLayoutChange(schedulePersistCurrentWorkspaceSnapshot),
      api.onDidAddPanel(schedulePersistCurrentWorkspaceSnapshot),
      api.onDidRemovePanel(schedulePersistCurrentWorkspaceSnapshot),
      api.onDidMovePanel(schedulePersistCurrentWorkspaceSnapshot),
      api.onDidAddGroup(schedulePersistCurrentWorkspaceSnapshot),
      api.onDidRemoveGroup(schedulePersistCurrentWorkspaceSnapshot),
      api.onDidActivePanelChange(schedulePersistCurrentWorkspaceSnapshot),
      api.onDidActiveGroupChange(schedulePersistCurrentWorkspaceSnapshot),
    ]
  }

  const restoreWorkspaceSnapshot = (workspaceId: number) => {
    const api = dockviewApiRef.current

    if (!api) {
      return
    }

    const targetWorkspace = workspaceTabsRef.current.find((workspace) => workspace.id === workspaceId)

    if (!targetWorkspace?.snapshot) {
      api.clear()
      scheduleDockviewLayoutSync()
      return
    }

    api.fromJSON(targetWorkspace.snapshot)
    scheduleDockviewLayoutSync()
  }

  const handleSelectWorkspace = (workspaceId: number) => {
    if (workspaceId === activeWorkspaceIdRef.current) {
      return
    }

    persistCurrentWorkspaceSnapshot()
    activeWorkspaceIdRef.current = workspaceId
    setActiveWorkspaceId(workspaceId)
    restoreWorkspaceSnapshot(workspaceId)
  }

  const handleAddWorkspace = () => {
    persistCurrentWorkspaceSnapshot()

    const nextWorkspaceId = workspaceTabsRef.current.length + 1
    const nextWorkspace: WorkspaceLayoutTab = {
      id: nextWorkspaceId,
      title: `Workspace-${nextWorkspaceId}`,
      snapshot: null,
    }

    updateWorkspaceTabs((tabs) => [...tabs, nextWorkspace])
    activeWorkspaceIdRef.current = nextWorkspaceId
    setActiveWorkspaceId(nextWorkspaceId)

    const api = dockviewApiRef.current

    if (api) {
      api.clear()
      scheduleDockviewLayoutSync()
    }
  }

  const handleReady = (event: DockviewReadyEvent) => {
    const api = event.api
    dockviewApiRef.current = api
    bindDockviewPersistence(api)

    if (api.getPanel('terminal-header')) {
      scheduleDockviewLayoutSync()
      return
    }

    const initialWorkspace = workspaceTabsRef.current.find(
      (workspace) => workspace.id === activeWorkspaceIdRef.current,
    )

    if (initialWorkspace?.snapshot) {
      api.fromJSON(initialWorkspace.snapshot)
      scheduleDockviewLayoutSync()
      return
    }

    if (initialWorkspaceStateRef.current) {
      api.clear()
      scheduleDockviewLayoutSync()
      return
    }

    api.addPanel({
      id: 'terminal-header',
      title: 'Main terminal',
      component: 'default',
      tabComponent: 'terminal-tab',
      params: createTerminalPanelParams('main'),
    })

    api.addPanel({
      id: 'terminal',
      title: 'Workspace shell',
      component: 'default',
      tabComponent: 'terminal-tab',
      params: createTerminalPanelParams('workspace'),
      position: {
        direction: 'below',
      },
    })

    api.addPanel({
      id: 'tool',
      title: 'tool',
      component: 'default',
      tabComponent: 'commander-tab',
      position: {
        direction: 'right',
        referencePanel: 'terminal',
      },
    })

    const initialWorkspaceSnapshot = api.toJSON()

    updateWorkspaceTabs((tabs) =>
      tabs.map((workspace) =>
        workspace.id === 2
          ? { ...workspace, snapshot: initialWorkspaceSnapshot }
          : workspace,
      ),
    )

    scheduleDockviewLayoutSync()
  }

  useEffect(() => {
    const container = dockviewContainerRef.current

    if (!container || typeof ResizeObserver === 'undefined') {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      syncDockviewLayout()
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    writePersistedWorkspaceState({
      activeWorkspaceId,
      workspaceTabs,
    })
  }, [activeWorkspaceId, workspaceTabs])

  useEffect(() => {
    return () => {
      disposeDockviewPersistenceBindings()

      if (dockviewPersistenceTimeoutRef.current !== null) {
        window.clearTimeout(dockviewPersistenceTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isAiSidebarOpen) {
      return
    }

    setAiPanelWidth((width) => clampAiPanelWidth(width, contentAreaRef.current))
  }, [isAiSidebarOpen])

  useEffect(() => {
    if (!isAiSidebarOpen) {
      return
    }

    const handleWindowResize = () => {
      setAiPanelWidth((width) => clampAiPanelWidth(width, contentAreaRef.current))
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [isAiSidebarOpen])

  useEffect(() => {
    if (!isAiPanelResizing) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const resizeStart = aiResizeStartRef.current

      if (!resizeStart) {
        return
      }

      const nextWidth = resizeStart.startWidth + (event.clientX - resizeStart.startX)

      setAiPanelWidth(clampAiPanelWidth(nextWidth, contentAreaRef.current))
    }

    const handlePointerUp = () => {
      aiResizeStartRef.current = null
      setIsAiPanelResizing(false)
    }

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isAiPanelResizing])

  const aiShellWidth = aiPanelWidth + AI_PANEL_RESIZE_HANDLE_WIDTH
  const aiWidthTransition = isAiPanelResizing || prefersReducedMotion
    ? { duration: 0 }
    : { duration: AI_PANEL_ANIMATION_SECONDS, ease: AI_PANEL_ANIMATION_EASE }
  const appRootRef = useRunaDomAutoTagging('app-root')

  return (
    <RunaDomScopeProvider component="app" layout="shell" widget="workspace">
      <Box ref={appRootRef} runaComponent="app-root" style={rootStyle}>
        <Box runaComponent="app-main-shell" style={mainShellStyle}>
          <ShellTopbarWidget
            activeWorkspaceId={activeWorkspaceId}
            isAiOpen={isAiSidebarOpen}
            onAddWorkspace={handleAddWorkspace}
            onSelectWorkspace={handleSelectWorkspace}
            onToggleAi={onToggleAiSidebar}
            workspaceTabs={workspaceTabs}
          />
          <Box runaComponent="app-content-area" ref={contentAreaRef} style={contentAreaStyle}>
            <AnimatePresence initial={false}>
              {isAiSidebarOpen ? (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: aiShellWidth }}
                  exit={{ width: 0 }}
                  key="ai-shell-panel"
                  style={{
                    ...aiPanelShellStyle,
                    flex: '0 0 auto',
                  }}
                  transition={{ width: aiWidthTransition }}
                >
                  <RunaDomScopeProvider component="ai-shell-panel" widget={AI_SHELL_PANEL_HOST_ID}>
                    <Box runaComponent="ai-shell-panel-content" style={aiPanelShellContentStyle}>
                      <Box
                        runaComponent="ai-shell-panel-frame-wrap"
                        style={{ ...aiPanelFrameStyle, flex: `0 0 ${aiPanelWidth}px`, width: `${aiPanelWidth}px` }}
                      >
                        <Box
                          data-runa-shell-widget-frame=""
                          data-runa-shell-widget-kind="ai"
                          runaComponent="ai-shell-panel-frame"
                          style={aiPanelFrameStyle}
                        >
                          <Box
                            data-runa-shell-widget-header=""
                            runaComponent="ai-shell-panel-header"
                            style={aiPanelHeaderStyle}
                          >
                            <AiPanelHeaderWidget title="AI Rune" />
                          </Box>
                          <Box runaComponent="ai-shell-panel-body" style={aiPanelBodyStyle}>
                            <AiPanelWidget hostId={AI_SHELL_PANEL_HOST_ID} />
                          </Box>
                        </Box>
                      </Box>
                      <Box
                        aria-hidden="true"
                        data-runa-shell-sash=""
                        onPointerDown={(event) => {
                          aiResizeStartRef.current = {
                            startWidth: aiPanelWidth,
                            startX: event.clientX,
                          }
                          setIsAiPanelResizing(true)
                          event.preventDefault()
                        }}
                        runaComponent="ai-shell-panel-sash"
                        style={aiResizeHandleStyle}
                      />
                    </Box>
                  </RunaDomScopeProvider>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <Box runaComponent="app-workspace" style={workspaceStyle}>
              <Box
                ref={dockviewContainerRef}
                runaComponent="app-dockview-container"
                style={dockviewContainerStyle}
              >
                <DockviewReact
                  components={components}
                  onReady={handleReady}
                  rightHeaderActionsComponent={TerminalDockviewHeaderActionsWidget}
                  tabComponents={tabComponents}
                  theme={runaDockviewTheme}
                />
              </Box>
            </Box>
          </Box>
        </Box>
        <RightActionRailWidget dockviewApiRef={dockviewApiRef} onAddWorkspace={handleAddWorkspace} />
        <ModalHostWidget hostId={BODY_MODAL_HOST_ID} scope="body" />
      </Box>
    </RunaDomScopeProvider>
  )
}
