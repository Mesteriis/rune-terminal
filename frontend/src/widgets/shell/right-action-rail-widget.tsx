import type { DockviewApi } from 'dockview-react'
import { FolderTree, Monitor, Plus, Settings2 } from 'lucide-react'
import { useUnit } from 'effector-react'
import { useEffect, useRef, useState } from 'react'

import { openBodyModal } from '@/shared/model/modal'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Button, Separator, Surface, Text } from '@/shared/ui/primitives'
import {
  railButtonStyle,
  rightRailStyle,
  utilityMenuItemStyle,
  utilityMenuMetaStyle,
  utilityMenuSeparatorStyle,
  utilityMenuStyle,
  utilityMenuTitleStyle,
  utilityMenuWrapStyle,
} from '@/widgets/shell/right-action-rail-widget.styles'
import { createNextTerminalPanelId, createTerminalPanelParams } from '@/widgets/terminal/terminal-panel'

const railIconProps = {
  size: 16,
  strokeWidth: 1.75,
}

type RightActionRailWidgetProps = {
  dockviewApiRef: { current: DockviewApi | null }
  onAddWorkspace: () => void
}

function createNextCommanderPanelId(containerApi: DockviewApi) {
  if (!containerApi.getPanel('tool')) {
    return 'tool'
  }

  let index = 2

  while (containerApi.getPanel(`tool-${index}`)) {
    index += 1
  }

  return `tool-${index}`
}

export function RightActionRailWidget({ dockviewApiRef, onAddWorkspace }: RightActionRailWidgetProps) {
  const onOpenBodyModal = useUnit(openBodyModal)
  const [isUtilityMenuOpen, setIsUtilityMenuOpen] = useState(false)
  const menuWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isUtilityMenuOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuWrapRef.current?.contains(event.target as Node)) {
        setIsUtilityMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUtilityMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isUtilityMenuOpen])

  const handleToggleUtilityMenu = () => {
    setIsUtilityMenuOpen((value) => !value)
  }

  const handleCreateWorkspace = () => {
    onAddWorkspace()
    setIsUtilityMenuOpen(false)
  }

  const getPanelPosition = () => {
    const dockviewApi = dockviewApiRef.current
    const referencePanel = dockviewApi?.activePanel?.id

    if (!referencePanel) {
      return undefined
    }

    return {
      direction: 'right' as const,
      referencePanel,
    }
  }

  const handleCreateTerminalWidget = () => {
    const dockviewApi = dockviewApiRef.current

    if (!dockviewApi) {
      return
    }

    const nextPanelId = createNextTerminalPanelId(dockviewApi, 'workspace')
    const nextPanelParams = createTerminalPanelParams('workspace', nextPanelId)
    const suffixMatch = nextPanelId.match(/-(\d+)$/)

    dockviewApi.addPanel({
      id: nextPanelId,
      title: suffixMatch ? `${nextPanelParams.title} ${suffixMatch[1]}` : nextPanelParams.title,
      component: 'default',
      tabComponent: 'terminal-tab',
      params: nextPanelParams,
      position: getPanelPosition(),
    })

    setIsUtilityMenuOpen(false)
  }

  const handleCreateCommanderWidget = () => {
    const dockviewApi = dockviewApiRef.current

    if (!dockviewApi) {
      return
    }

    const nextPanelId = createNextCommanderPanelId(dockviewApi)

    dockviewApi.addPanel({
      id: nextPanelId,
      title: 'tool',
      component: 'default',
      tabComponent: 'commander-tab',
      position: getPanelPosition(),
    })

    setIsUtilityMenuOpen(false)
  }

  return (
    <RunaDomScopeProvider component="right-action-rail-widget">
      <Box
        role="complementary"
        aria-label="Right action rail"
        runaComponent="right-action-rail-root"
        style={rightRailStyle}
      >
        <Box
          ref={menuWrapRef}
          runaComponent="right-action-rail-utility-menu-wrap"
          style={utilityMenuWrapStyle}
        >
          {isUtilityMenuOpen ? (
            <Surface
              role="menu"
              aria-label="Create widget menu"
              runaComponent="right-action-rail-utility-menu"
              style={utilityMenuStyle}
            >
              <Button
                aria-label="Create workspace"
                onClick={handleCreateWorkspace}
                runaComponent="right-action-rail-create-workspace"
                role="menuitem"
                style={utilityMenuItemStyle}
              >
                <Plus {...railIconProps} />
                <Box runaComponent="right-action-rail-create-workspace-meta" style={utilityMenuMetaStyle}>
                  <Text
                    runaComponent="right-action-rail-create-workspace-title"
                    style={utilityMenuTitleStyle}
                  >
                    Workspace
                  </Text>
                </Box>
              </Button>
              <Separator
                orientation="horizontal"
                runaComponent="right-action-rail-utility-menu-separator"
                style={utilityMenuSeparatorStyle}
              />
              <Button
                aria-label="Create terminal widget"
                onClick={handleCreateTerminalWidget}
                runaComponent="right-action-rail-create-terminal"
                role="menuitem"
                style={utilityMenuItemStyle}
              >
                <Monitor {...railIconProps} />
                <Box runaComponent="right-action-rail-create-terminal-meta" style={utilityMenuMetaStyle}>
                  <Text runaComponent="right-action-rail-create-terminal-title" style={utilityMenuTitleStyle}>
                    Terminal
                  </Text>
                </Box>
              </Button>
              <Button
                aria-label="Create commander widget"
                onClick={handleCreateCommanderWidget}
                runaComponent="right-action-rail-create-commander"
                role="menuitem"
                style={utilityMenuItemStyle}
              >
                <FolderTree {...railIconProps} />
                <Box runaComponent="right-action-rail-create-commander-meta" style={utilityMenuMetaStyle}>
                  <Text
                    runaComponent="right-action-rail-create-commander-title"
                    style={utilityMenuTitleStyle}
                  >
                    Commander
                  </Text>
                </Box>
              </Button>
            </Surface>
          ) : null}
          <Button
            aria-expanded={isUtilityMenuOpen}
            aria-haspopup="menu"
            aria-label="Open utility panel"
            onClick={handleToggleUtilityMenu}
            runaComponent="right-action-rail-open-utility-panel"
            style={railButtonStyle}
          >
            <Plus {...railIconProps} />
          </Button>
        </Box>
        <Button
          aria-label="Open settings panel"
          runaComponent="right-action-rail-open-settings-panel"
          onClick={() =>
            onOpenBodyModal({
              title: 'Settings',
              description: 'Navigate shell settings by section: General, AI, Terminal, and Commander.',
              variant: 'settings',
              contentKey: 'settings-shell',
            })
          }
          style={railButtonStyle}
        >
          <Settings2 {...railIconProps} />
        </Button>
      </Box>
    </RunaDomScopeProvider>
  )
}
