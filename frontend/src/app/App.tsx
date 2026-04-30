import { DockviewReact, type DockviewTheme } from 'dockview-react'
import { useRef } from 'react'
import { useUnit } from 'effector-react'

import { useWorkspaceWidgetCatalog } from '@/features/workspace/model/widget-catalog'
import {
  closeRuntimeWindow,
  minimizeRuntimeWindow,
  requestRuntimeSettings,
  requestRuntimeShutdown,
  toggleRuntimeFullscreen,
} from '@/shared/api/runtime'
import { $isAiSidebarOpen, toggleAiSidebar } from '@/shared/model/app'
import { BODY_MODAL_HOST_ID } from '@/shared/model/modal'
import { RunaDomScopeProvider, useRunaDomAutoTagging } from '@/shared/ui/dom-id'
import { Box, Text } from '@/shared/ui/primitives'
import {
  CommanderDockviewTabWidget,
  DockviewPanelWidget,
  ModalHostWidget,
  RightActionRailWidget,
  ShellTopbarWidget,
  TerminalDockviewHeaderActionsWidget,
  TerminalDockviewTabWidget,
} from '@/widgets'
import { AppAiSidebar } from './app-ai-sidebar'
import {
  contentAreaStyle,
  dockviewContainerStyle,
  mainShellStyle,
  rootStyle,
  workspaceCatalogStatusStyle,
  workspaceStyle,
} from './app-shell.styles'
import { useWindowTitleSync } from './use-window-title-sync'
import { useDockviewWorkspace } from './use-dockview-workspace'
import { useWindowTitleSettings } from '@/features/runtime/model/use-window-title-settings'

const DOCKVIEW_GROUP_GAP = 6

const runaDockviewTheme: DockviewTheme = {
  name: 'runa',
  className: 'runa-dockview-theme',
  gap: DOCKVIEW_GROUP_GAP,
}

const components = {
  default: DockviewPanelWidget,
}

const tabComponents = {
  'commander-tab': CommanderDockviewTabWidget,
  'terminal-tab': TerminalDockviewTabWidget,
}

/** Composes the shell topbar, Dockview workspace, AI sidebar, and modal hosts. */
export function App() {
  const [isAiSidebarOpen, onToggleAiSidebar] = useUnit([$isAiSidebarOpen, toggleAiSidebar])
  const widgetCatalog = useWorkspaceWidgetCatalog()
  const windowTitleSettings = useWindowTitleSettings()
  const contentAreaRef = useRef<HTMLDivElement | null>(null)
  const {
    activeWorkspaceId,
    workspaceTabs,
    dockviewApiRef,
    dockviewContainerRef,
    handleAddWorkspace,
    handleDeleteWorkspace,
    handleDockviewReady,
    handleRenameWorkspace,
    handleSelectWorkspace,
  } = useDockviewWorkspace({ widgetCatalogEntries: widgetCatalog.entries })
  const appRootRef = useRunaDomAutoTagging('app-root')

  useWindowTitleSync({
    activeWorkspaceId,
    autoTitle: windowTitleSettings.autoTitle,
    customTitle: windowTitleSettings.customTitle,
    mode: windowTitleSettings.mode,
    workspaceTabs,
  })

  async function handleCloseWindow() {
    try {
      const settings = await requestRuntimeSettings()
      const initial = await requestRuntimeShutdown({ force: false })
      if (!initial.can_close && settings.watcher_mode === 'ephemeral') {
        const shouldContinue = window.confirm(
          'There are running tasks. Closing will terminate them and mark as failed.',
        )
        if (!shouldContinue) {
          return
        }

        const forced = await requestRuntimeShutdown({ force: true })
        if (!forced.can_close) {
          return
        }
      }

      await closeRuntimeWindow()
    } catch (error) {
      console.error('Unable to close runtime cleanly', error)
      await closeRuntimeWindow()
    }
  }

  async function handleMinimizeWindow() {
    try {
      await minimizeRuntimeWindow()
    } catch (error) {
      console.error('Unable to minimize runtime window', error)
    }
  }

  async function handleToggleFullscreen() {
    try {
      await toggleRuntimeFullscreen()
    } catch (error) {
      console.error('Unable to toggle runtime fullscreen', error)
    }
  }

  return (
    <RunaDomScopeProvider component="app" layout="shell" widget="workspace">
      <Box ref={appRootRef} runaComponent="app-root" style={rootStyle}>
        <Box runaComponent="app-main-shell" style={mainShellStyle}>
          <ShellTopbarWidget
            activeWorkspaceId={activeWorkspaceId}
            isAiOpen={isAiSidebarOpen}
            onClose={handleCloseWindow}
            onMinimize={handleMinimizeWindow}
            onAddWorkspace={handleAddWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            onRenameWorkspace={handleRenameWorkspace}
            onSelectWorkspace={handleSelectWorkspace}
            onToggleFullscreen={handleToggleFullscreen}
            onToggleAi={onToggleAiSidebar}
            workspaceTabs={workspaceTabs}
          />
          <Box runaComponent="app-content-area" ref={contentAreaRef} style={contentAreaStyle}>
            <AppAiSidebar
              contentAreaRef={contentAreaRef}
              dockviewApiRef={dockviewApiRef}
              isOpen={isAiSidebarOpen}
            />
            <Box runaComponent="app-workspace" style={workspaceStyle}>
              <Box
                ref={dockviewContainerRef}
                runaComponent="app-dockview-container"
                style={dockviewContainerStyle}
              >
                {widgetCatalog.status === 'loading' ? (
                  <Box
                    aria-label="Loading workspace widget catalog"
                    role="status"
                    runaComponent="workspace-widget-catalog-loading"
                    style={workspaceCatalogStatusStyle}
                  >
                    <Text runaComponent="workspace-widget-catalog-loading-text">Loading widget catalog</Text>
                  </Box>
                ) : (
                  <DockviewReact
                    components={components}
                    onReady={handleDockviewReady}
                    rightHeaderActionsComponent={TerminalDockviewHeaderActionsWidget}
                    tabComponents={tabComponents}
                    theme={runaDockviewTheme}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </Box>
        <RightActionRailWidget
          dockviewApiRef={dockviewApiRef}
          onAddWorkspace={handleAddWorkspace}
          widgetCatalog={widgetCatalog}
        />
        <ModalHostWidget hostId={BODY_MODAL_HOST_ID} scope="body" />
      </Box>
    </RunaDomScopeProvider>
  )
}
