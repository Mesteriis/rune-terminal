import { DockviewReact, type DockviewTheme } from 'dockview-react'
import { useRef } from 'react'
import { useUnit } from 'effector-react'

import { closeRuntimeWindow, requestRuntimeSettings, requestRuntimeShutdown } from '@/shared/api/runtime'
import { $isAiSidebarOpen, toggleAiSidebar } from '@/shared/model/app'
import { BODY_MODAL_HOST_ID } from '@/shared/model/modal'
import { RunaDomScopeProvider, useRunaDomAutoTagging } from '@/shared/ui/dom-id'
import { Box } from '@/shared/ui/primitives'
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
  workspaceStyle,
} from './app-shell.styles'
import { useDockviewWorkspace } from './use-dockview-workspace'

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
  const contentAreaRef = useRef<HTMLDivElement | null>(null)
  const {
    activeWorkspaceId,
    workspaceTabs,
    dockviewApiRef,
    dockviewContainerRef,
    handleAddWorkspace,
    handleDockviewReady,
    handleSelectWorkspace,
  } = useDockviewWorkspace()
  const appRootRef = useRunaDomAutoTagging('app-root')

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

  return (
    <RunaDomScopeProvider component="app" layout="shell" widget="workspace">
      <Box ref={appRootRef} runaComponent="app-root" style={rootStyle}>
        <Box runaComponent="app-main-shell" style={mainShellStyle}>
          <ShellTopbarWidget
            activeWorkspaceId={activeWorkspaceId}
            isAiOpen={isAiSidebarOpen}
            onClose={handleCloseWindow}
            onAddWorkspace={handleAddWorkspace}
            onSelectWorkspace={handleSelectWorkspace}
            onToggleAi={onToggleAiSidebar}
            workspaceTabs={workspaceTabs}
          />
          <Box runaComponent="app-content-area" ref={contentAreaRef} style={contentAreaStyle}>
            <AppAiSidebar contentAreaRef={contentAreaRef} isOpen={isAiSidebarOpen} />
            <Box runaComponent="app-workspace" style={workspaceStyle}>
              <Box
                ref={dockviewContainerRef}
                runaComponent="app-dockview-container"
                style={dockviewContainerStyle}
              >
                <DockviewReact
                  components={components}
                  onReady={handleDockviewReady}
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
