import type { DockviewApi } from 'dockview-react'
import { Code2, FileText, FolderTree, Globe2, Monitor, Plus, Settings2 } from 'lucide-react'
import { useUnit } from 'effector-react'
import { useEffect, useRef, useState } from 'react'

import { openBodyModal } from '@/shared/model/modal'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Button, Separator, Surface, Text } from '@/shared/ui/primitives'
import { createTerminalTab } from '@/features/terminal/api/client'
import {
  getWorkspaceWidgetKindEntry,
  isWorkspaceWidgetKindCreatable,
  type WorkspaceWidgetCatalogState,
} from '@/features/workspace/model/widget-catalog'
import {
  railButtonStyle,
  resolveUtilityMenuItemStyle,
  rightRailStyle,
  utilityMenuItemStyle,
  utilityMenuMetaStyle,
  utilityMenuSeparatorStyle,
  utilityMenuStatusTextStyle,
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
  widgetCatalog: WorkspaceWidgetCatalogState
}

function getUnavailableWidgetReason(kind: string, widgetCatalog: WorkspaceWidgetCatalogState) {
  if (widgetCatalog.status === 'loading') {
    return 'Loading catalog'
  }

  if (widgetCatalog.status === 'error') {
    return widgetCatalog.errorMessage ?? 'Catalog unavailable'
  }

  const entry = getWorkspaceWidgetKindEntry(widgetCatalog.entries, kind)

  if (!entry) {
    return 'Not reported by backend'
  }

  if (entry.status === 'planned') {
    return 'Planned'
  }

  if (entry.status === 'frontend-local') {
    return 'Frontend-local'
  }

  if (entry.supports_path) {
    return 'Requires path handoff'
  }

  return 'Unavailable'
}

export function RightActionRailWidget({
  dockviewApiRef,
  onAddWorkspace,
  widgetCatalog,
}: RightActionRailWidgetProps) {
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

  const handleCreateTerminalWidget = async () => {
    if (!isWorkspaceWidgetKindCreatable(widgetCatalog.entries, 'terminal')) {
      return
    }

    const dockviewApi = dockviewApiRef.current

    if (!dockviewApi) {
      return
    }

    const nextPanelId = createNextTerminalPanelId(dockviewApi, 'workspace')
    const nextPanelParams = createTerminalPanelParams('workspace', nextPanelId)
    const suffixMatch = nextPanelId.match(/-(\d+)$/)

    try {
      const runtimeTerminal = await createTerminalTab(nextPanelParams.title)

      dockviewApi.addPanel({
        id: nextPanelId,
        title: suffixMatch ? `${nextPanelParams.title} ${suffixMatch[1]}` : nextPanelParams.title,
        component: 'default',
        tabComponent: 'terminal-tab',
        params: createTerminalPanelParams('workspace', runtimeTerminal.widget_id, runtimeTerminal.tab_id),
        position: getPanelPosition(),
      })
    } catch (error) {
      console.error('Unable to create terminal widget', error)
      return
    }

    setIsUtilityMenuOpen(false)
  }

  const terminalEntry = getWorkspaceWidgetKindEntry(widgetCatalog.entries, 'terminal')
  const filesEntry = getWorkspaceWidgetKindEntry(widgetCatalog.entries, 'files')
  const commanderEntry = getWorkspaceWidgetKindEntry(widgetCatalog.entries, 'commander')
  const previewEntry = getWorkspaceWidgetKindEntry(widgetCatalog.entries, 'preview')
  const editorEntry = getWorkspaceWidgetKindEntry(widgetCatalog.entries, 'editor')
  const webEntry = getWorkspaceWidgetKindEntry(widgetCatalog.entries, 'web')
  const canCreateTerminal = isWorkspaceWidgetKindCreatable(widgetCatalog.entries, 'terminal')
  const canCreateCommander = false

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
              {terminalEntry ? (
                <Button
                  aria-label={
                    canCreateTerminal
                      ? `Create ${terminalEntry.label} widget`
                      : `${terminalEntry.label} widget unavailable: ${getUnavailableWidgetReason(
                          'terminal',
                          widgetCatalog,
                        )}`
                  }
                  disabled={!canCreateTerminal}
                  onClick={handleCreateTerminalWidget}
                  runaComponent="right-action-rail-create-terminal"
                  role="menuitem"
                  style={resolveUtilityMenuItemStyle(!canCreateTerminal)}
                >
                  <Monitor {...railIconProps} />
                  <Box runaComponent="right-action-rail-create-terminal-meta" style={utilityMenuMetaStyle}>
                    <Text
                      runaComponent="right-action-rail-create-terminal-title"
                      style={utilityMenuTitleStyle}
                    >
                      {terminalEntry.label}
                    </Text>
                    {!canCreateTerminal ? (
                      <Text
                        runaComponent="right-action-rail-create-terminal-status"
                        style={utilityMenuStatusTextStyle}
                      >
                        {getUnavailableWidgetReason('terminal', widgetCatalog)}
                      </Text>
                    ) : null}
                  </Box>
                </Button>
              ) : null}
              {filesEntry ? (
                <Button
                  aria-label={`${filesEntry.label} widget unavailable: ${getUnavailableWidgetReason(
                    'files',
                    widgetCatalog,
                  )}`}
                  disabled
                  runaComponent="right-action-rail-create-files"
                  role="menuitem"
                  style={resolveUtilityMenuItemStyle(true)}
                >
                  <FileText {...railIconProps} />
                  <Box runaComponent="right-action-rail-create-files-meta" style={utilityMenuMetaStyle}>
                    <Text runaComponent="right-action-rail-create-files-title" style={utilityMenuTitleStyle}>
                      {filesEntry.label}
                    </Text>
                    <Text
                      runaComponent="right-action-rail-create-files-status"
                      style={utilityMenuStatusTextStyle}
                    >
                      {getUnavailableWidgetReason('files', widgetCatalog)}
                    </Text>
                  </Box>
                </Button>
              ) : null}
              {commanderEntry ? (
                <Button
                  aria-label={
                    canCreateCommander
                      ? `Create ${commanderEntry.label} widget`
                      : `${commanderEntry.label} widget unavailable: ${getUnavailableWidgetReason(
                          'commander',
                          widgetCatalog,
                        )}`
                  }
                  disabled={!canCreateCommander}
                  runaComponent="right-action-rail-create-commander"
                  role="menuitem"
                  style={resolveUtilityMenuItemStyle(!canCreateCommander)}
                >
                  <FolderTree {...railIconProps} />
                  <Box runaComponent="right-action-rail-create-commander-meta" style={utilityMenuMetaStyle}>
                    <Text
                      runaComponent="right-action-rail-create-commander-title"
                      style={utilityMenuTitleStyle}
                    >
                      {commanderEntry.label}
                    </Text>
                    {!canCreateCommander ? (
                      <Text
                        runaComponent="right-action-rail-create-commander-status"
                        style={utilityMenuStatusTextStyle}
                      >
                        {getUnavailableWidgetReason('commander', widgetCatalog)}
                      </Text>
                    ) : null}
                  </Box>
                </Button>
              ) : null}
              {previewEntry ? (
                <Button
                  aria-label={`${previewEntry.label} widget unavailable: ${getUnavailableWidgetReason(
                    'preview',
                    widgetCatalog,
                  )}`}
                  disabled
                  runaComponent="right-action-rail-create-preview"
                  role="menuitem"
                  style={resolveUtilityMenuItemStyle(true)}
                >
                  <FileText {...railIconProps} />
                  <Box runaComponent="right-action-rail-create-preview-meta" style={utilityMenuMetaStyle}>
                    <Text
                      runaComponent="right-action-rail-create-preview-title"
                      style={utilityMenuTitleStyle}
                    >
                      {previewEntry.label}
                    </Text>
                    <Text
                      runaComponent="right-action-rail-create-preview-status"
                      style={utilityMenuStatusTextStyle}
                    >
                      {getUnavailableWidgetReason('preview', widgetCatalog)}
                    </Text>
                  </Box>
                </Button>
              ) : null}
              {editorEntry ? (
                <Button
                  aria-label={`${editorEntry.label} widget unavailable: ${getUnavailableWidgetReason(
                    'editor',
                    widgetCatalog,
                  )}`}
                  disabled
                  runaComponent="right-action-rail-create-editor"
                  role="menuitem"
                  style={resolveUtilityMenuItemStyle(true)}
                >
                  <Code2 {...railIconProps} />
                  <Box runaComponent="right-action-rail-create-editor-meta" style={utilityMenuMetaStyle}>
                    <Text runaComponent="right-action-rail-create-editor-title" style={utilityMenuTitleStyle}>
                      {editorEntry.label}
                    </Text>
                    <Text
                      runaComponent="right-action-rail-create-editor-status"
                      style={utilityMenuStatusTextStyle}
                    >
                      {getUnavailableWidgetReason('editor', widgetCatalog)}
                    </Text>
                  </Box>
                </Button>
              ) : null}
              {webEntry ? (
                <Button
                  aria-label={`${webEntry.label} widget unavailable: ${getUnavailableWidgetReason(
                    'web',
                    widgetCatalog,
                  )}`}
                  disabled
                  runaComponent="right-action-rail-create-web"
                  role="menuitem"
                  style={resolveUtilityMenuItemStyle(true)}
                >
                  <Globe2 {...railIconProps} />
                  <Box runaComponent="right-action-rail-create-web-meta" style={utilityMenuMetaStyle}>
                    <Text runaComponent="right-action-rail-create-web-title" style={utilityMenuTitleStyle}>
                      {webEntry.label}
                    </Text>
                    <Text
                      runaComponent="right-action-rail-create-web-status"
                      style={utilityMenuStatusTextStyle}
                    >
                      {getUnavailableWidgetReason('web', widgetCatalog)}
                    </Text>
                  </Box>
                </Button>
              ) : null}
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
