import type { DockviewApi } from 'dockview-react'
import { FolderTree, Monitor, Plus, Settings2 } from 'lucide-react'
import { useUnit } from 'effector-react'
import { useEffect, useRef, useState } from 'react'

import { openBodyModal } from '../shared/model/modal'
import { RunaDomScopeProvider } from '../shared/ui/dom-id'
import { Box, Button, Surface, Text } from '../shared/ui/primitives'
import { createNextTerminalPanelId, createTerminalPanelParams } from './terminal-panel'

const rightRailStyle = {
  flex: '0 0 var(--size-right-rail)',
  width: 'var(--size-right-rail)',
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'space-between',
  alignItems: 'center',
  boxSizing: 'border-box' as const,
  padding: 'var(--space-xs)',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const railButtonStyle = {
  padding: '0',
  width: 'var(--size-control-min)',
  minWidth: 'var(--size-control-min)',
}

const utilityMenuWrapStyle = {
  position: 'relative' as const,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const utilityMenuStyle = {
  position: 'absolute' as const,
  top: 0,
  right: 'calc(100% + var(--space-xs))',
  width: '220px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
  padding: 'var(--space-xs)',
  zIndex: 'var(--z-modal)',
  border: '1px solid var(--color-border-strong)',
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
  backdropFilter: 'var(--blur-glass-md)',
  WebkitBackdropFilter: 'var(--blur-glass-md)',
}

const utilityMenuItemStyle = {
  width: '100%',
  justifyContent: 'flex-start',
  gap: 'var(--gap-sm)',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const utilityMenuMetaStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'flex-start',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const utilityMenuTitleStyle = {
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  fontWeight: 600,
}

const railIconProps = {
  size: 16,
  strokeWidth: 1.75,
}

type RightActionRailWidgetProps = {
  dockviewApiRef: { current: DockviewApi | null }
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

export function RightActionRailWidget({ dockviewApiRef }: RightActionRailWidgetProps) {
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
    const nextPanelParams = createTerminalPanelParams('workspace')
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
      <Box role="complementary" aria-label="Right action rail" runaComponent="right-action-rail-root" style={rightRailStyle}>
        <Box ref={menuWrapRef} runaComponent="right-action-rail-utility-menu-wrap" style={utilityMenuWrapStyle}>
          {isUtilityMenuOpen ? (
            <Surface
              role="menu"
              aria-label="Create widget menu"
              runaComponent="right-action-rail-utility-menu"
              style={utilityMenuStyle}
            >
              <Button
                aria-label="Create terminal widget"
                onClick={handleCreateTerminalWidget}
                runaComponent="right-action-rail-create-terminal"
                role="menuitem"
                style={utilityMenuItemStyle}
              >
                <Monitor {...railIconProps} />
                <Box runaComponent="right-action-rail-create-terminal-meta" style={utilityMenuMetaStyle}>
                  <Text runaComponent="right-action-rail-create-terminal-title" style={utilityMenuTitleStyle}>Terminal</Text>
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
                  <Text runaComponent="right-action-rail-create-commander-title" style={utilityMenuTitleStyle}>Commander</Text>
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
              title: 'Settings modal',
              description:
                'This modal is mounted on the app shell body layer and stays above every widget.',
              variant: 'settings',
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
