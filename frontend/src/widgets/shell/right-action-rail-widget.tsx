import type { DockviewApi } from 'dockview-react'
import { Code2, FileText, FolderTree, Globe2, Monitor, Plus, Settings2 } from 'lucide-react'
import { useUnit } from 'effector-react'
import { useEffect, useRef, useState } from 'react'

import { resolveRuntimeContext } from '@/shared/api/runtime'
import type { AppLocale } from '@/shared/api/runtime'
import { openDirectoryWorkspaceWidget } from '@/shared/api/workspace'
import { openBodyModal } from '@/shared/model/modal'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Button, Separator, Surface, Text } from '@/shared/ui/primitives'
import { createTerminalTab } from '@/features/terminal/api/client'
import {
  getWorkspaceWidgetKindEntry,
  isWorkspaceWidgetKindCreatable,
  type WorkspaceWidgetCatalogState,
} from '@/features/workspace/model/widget-catalog'
import { createFilesPanelParams, resolveFilesPanelParams } from '@/widgets/files'
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
import { rightActionRailWidgetCopy } from '@/widgets/shell/right-action-rail-widget-copy'
import {
  createNextTerminalPanelId,
  createTerminalPanelParams,
  isTerminalPanel,
  resolveTerminalPanelParams,
} from '@/widgets/terminal/terminal-panel'
import { TerminalSessionNavigatorWidget } from '@/widgets/terminal/terminal-session-navigator-widget'

const railIconProps = {
  size: 16,
  strokeWidth: 1.75,
}

type RightActionRailWidgetProps = {
  dockviewApiRef: { current: DockviewApi | null }
  locale?: AppLocale
  onAddWorkspace: () => void
  widgetCatalog: WorkspaceWidgetCatalogState
}

function getUnavailableWidgetReason(
  kind: string,
  widgetCatalog: WorkspaceWidgetCatalogState,
  copy: (typeof rightActionRailWidgetCopy)[AppLocale],
) {
  if (widgetCatalog.status === 'loading') {
    return copy.loadingCatalog
  }

  if (widgetCatalog.status === 'error') {
    return widgetCatalog.errorMessage ?? copy.catalogUnavailable
  }

  const entry = getWorkspaceWidgetKindEntry(widgetCatalog.entries, kind)

  if (!entry) {
    return copy.notReportedByBackend
  }

  if (entry.status === 'planned') {
    return copy.planned
  }

  if (entry.status === 'frontend-local') {
    return copy.frontendLocal
  }

  if (entry.status === 'available' && entry.supports_path && !entry.can_create) {
    return copy.needsFilePath
  }

  return copy.unavailable
}

function getPathTitle(path: string) {
  const trimmedPath = path.replace(/\/+$/g, '')
  const title = trimmedPath.split('/').filter(Boolean).pop()

  return title || trimmedPath || 'Files'
}

export function RightActionRailWidget({
  dockviewApiRef,
  locale = 'en',
  onAddWorkspace,
  widgetCatalog,
}: RightActionRailWidgetProps) {
  const copy = rightActionRailWidgetCopy[locale]
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

  const getBackendTargetWidgetId = () => {
    const activePanel = dockviewApiRef.current?.activePanel

    if (!activePanel) {
      return null
    }

    if (isTerminalPanel(activePanel.id, activePanel.params)) {
      return resolveTerminalPanelParams(activePanel.id, activePanel.params).widgetId
    }

    const filesPanelParams = resolveFilesPanelParams(activePanel.params)

    return filesPanelParams?.widgetId ?? null
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

  const handleCreateFilesWidget = async () => {
    if (!isWorkspaceWidgetKindCreatable(widgetCatalog.entries, 'files')) {
      return
    }

    const dockviewApi = dockviewApiRef.current
    const targetWidgetId = getBackendTargetWidgetId()

    if (!dockviewApi || !targetWidgetId) {
      return
    }

    try {
      const runtimeContext = await resolveRuntimeContext()
      const path = runtimeContext.repoRoot
      const result = await openDirectoryWorkspaceWidget({
        path,
        targetWidgetId,
      })
      const title = getPathTitle(path)

      dockviewApi.addPanel({
        id: result.widget_id,
        title,
        component: 'default',
        params: createFilesPanelParams({
          path,
          title,
          widgetId: result.widget_id,
        }),
        position: getPanelPosition(),
      })
    } catch (error) {
      console.error('Unable to create files widget', error)
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
  const canCreateFiles = isWorkspaceWidgetKindCreatable(widgetCatalog.entries, 'files')
  const canCreateCommander = false

  return (
    <RunaDomScopeProvider component="right-action-rail-widget">
      <Box
        role="complementary"
        aria-label={copy.rightActionRail}
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
              aria-label={copy.createWidgetMenu}
              runaComponent="right-action-rail-utility-menu"
              style={utilityMenuStyle}
            >
              <Button
                aria-label={copy.createWorkspace}
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
                    {copy.workspaceTitle}
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
                      ? copy.createWidget(terminalEntry.label)
                      : copy.unavailableWidget(
                          terminalEntry.label,
                          getUnavailableWidgetReason('terminal', widgetCatalog, copy),
                        )
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
                        {getUnavailableWidgetReason('terminal', widgetCatalog, copy)}
                      </Text>
                    ) : null}
                  </Box>
                </Button>
              ) : null}
              {filesEntry ? (
                <Button
                  aria-label={
                    canCreateFiles
                      ? copy.createWidget(filesEntry.label)
                      : copy.unavailableWidget(
                          filesEntry.label,
                          getUnavailableWidgetReason('files', widgetCatalog, copy),
                        )
                  }
                  disabled={!canCreateFiles}
                  onClick={handleCreateFilesWidget}
                  runaComponent="right-action-rail-create-files"
                  role="menuitem"
                  style={resolveUtilityMenuItemStyle(!canCreateFiles)}
                >
                  <FileText {...railIconProps} />
                  <Box runaComponent="right-action-rail-create-files-meta" style={utilityMenuMetaStyle}>
                    <Text runaComponent="right-action-rail-create-files-title" style={utilityMenuTitleStyle}>
                      {filesEntry.label}
                    </Text>
                    {!canCreateFiles ? (
                      <Text
                        runaComponent="right-action-rail-create-files-status"
                        style={utilityMenuStatusTextStyle}
                      >
                        {getUnavailableWidgetReason('files', widgetCatalog, copy)}
                      </Text>
                    ) : null}
                  </Box>
                </Button>
              ) : null}
              <Separator
                orientation="horizontal"
                runaComponent="right-action-rail-session-menu-separator"
                style={utilityMenuSeparatorStyle}
              />
              <TerminalSessionNavigatorWidget dockviewApiRef={dockviewApiRef} />
              {commanderEntry ? (
                <Button
                  aria-label={
                    canCreateCommander
                      ? copy.createWidget(commanderEntry.label)
                      : copy.unavailableWidget(
                          commanderEntry.label,
                          getUnavailableWidgetReason('commander', widgetCatalog, copy),
                        )
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
                        {getUnavailableWidgetReason('commander', widgetCatalog, copy)}
                      </Text>
                    ) : null}
                  </Box>
                </Button>
              ) : null}
              {previewEntry ? (
                <Button
                  aria-label={copy.unavailableWidget(
                    previewEntry.label,
                    getUnavailableWidgetReason('preview', widgetCatalog, copy),
                  )}
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
                      {getUnavailableWidgetReason('preview', widgetCatalog, copy)}
                    </Text>
                  </Box>
                </Button>
              ) : null}
              {editorEntry ? (
                <Button
                  aria-label={copy.unavailableWidget(
                    editorEntry.label,
                    getUnavailableWidgetReason('editor', widgetCatalog, copy),
                  )}
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
                      {getUnavailableWidgetReason('editor', widgetCatalog, copy)}
                    </Text>
                  </Box>
                </Button>
              ) : null}
              {webEntry ? (
                <Button
                  aria-label={copy.unavailableWidget(
                    webEntry.label,
                    getUnavailableWidgetReason('web', widgetCatalog, copy),
                  )}
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
                      {getUnavailableWidgetReason('web', widgetCatalog, copy)}
                    </Text>
                  </Box>
                </Button>
              ) : null}
            </Surface>
          ) : null}
          <Button
            aria-expanded={isUtilityMenuOpen}
            aria-haspopup="menu"
            aria-label={copy.openUtilityPanel}
            onClick={handleToggleUtilityMenu}
            runaComponent="right-action-rail-open-utility-panel"
            style={railButtonStyle}
          >
            <Plus {...railIconProps} />
          </Button>
        </Box>
        <Button
          aria-label={copy.openSettingsPanel}
          runaComponent="right-action-rail-open-settings-panel"
          onClick={() =>
            onOpenBodyModal({
              title: copy.settingsTitle,
              description: copy.settingsDescription,
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
