import { useUnit } from 'effector-react'
import type { IDockviewPanelProps } from 'dockview-react'
import { useCallback, useEffect, useState } from 'react'

import {
  registerTerminalPanelBinding,
  unregisterTerminalPanelBinding,
} from '@/features/terminal/model/panel-registry'
import { $activeWidgetHostId, setActiveWidgetHostId } from '@/shared/model/widget-focus'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Text } from '@/shared/ui/primitives'
import { CommanderPanelWidget } from '@/widgets/commander/commander-panel-widget'
import { FilesPanelWidget, resolveFilesPanelParams } from '@/widgets/files'
import { ModalHostWidget } from '@/widgets/panel/modal-host-widget'
import { PanelModalActionsWidget } from '@/widgets/panel/panel-modal-actions-widget'
import {
  dockviewPanelContentStyle as panelContentStyle,
  resolveDockviewPanelInnerContentStyle,
} from '@/widgets/panel/dockview-panel-widget.styles'
import { createTerminalPanelParams, resolveTerminalPanelParams } from '@/widgets/terminal/terminal-panel'
import { TerminalWidget } from '@/widgets/terminal/terminal-widget'
import { WidgetBusyOverlayWidget } from '@/widgets/panel/widget-busy-overlay-widget'
import { createPreviewPanelParams, PreviewPanelWidget, resolvePreviewPanelParams } from '@/widgets/preview'

function isCommanderDemoPanel(panelId: string) {
  return panelId === 'tool' || panelId.startsWith('tool-')
}

export function DockviewPanelWidget(props: IDockviewPanelProps) {
  const [panelGroupElement, setPanelGroupElement] = useState<HTMLElement | null>(null)
  const [panelCount, setPanelCount] = useState(props.api.group.panels.length)
  const [activeWidgetHostId, onSetActiveWidgetHostId] = useUnit([$activeWidgetHostId, setActiveWidgetHostId])
  const terminalModel = props.api.id.startsWith('terminal')
    ? resolveTerminalPanelParams(props.api.id, props.params)
    : null
  const filesModel = resolveFilesPanelParams(props.params)
  const previewModel = resolvePreviewPanelParams(props.params)
  const isCommanderPanel = isCommanderDemoPanel(props.api.id)
  const isActiveWidget = activeWidgetHostId === props.api.id
  const panelInnerContentStyle = resolveDockviewPanelInnerContentStyle(Boolean(terminalModel))

  const handleRootRef = useCallback((node: HTMLDivElement | null) => {
    const nextPanelGroupElement = node?.closest('.dv-groupview')

    setPanelGroupElement(nextPanelGroupElement instanceof HTMLElement ? nextPanelGroupElement : null)
  }, [])

  useEffect(() => {
    const groupElement = panelGroupElement

    if (!(groupElement instanceof HTMLElement)) {
      return
    }

    if (activeWidgetHostId === null) {
      delete groupElement.dataset.runaWidgetFocusState
      return
    }

    groupElement.dataset.runaWidgetFocusState = isActiveWidget ? 'active' : 'inactive'
  }, [activeWidgetHostId, isActiveWidget, panelGroupElement])

  useEffect(() => {
    if (!terminalModel) {
      return
    }

    registerTerminalPanelBinding({
      hostId: props.api.id,
      preset: terminalModel.preset,
      runtimeTabId: terminalModel.runtimeTabId,
      runtimeWidgetId: terminalModel.widgetId,
    })

    return () => {
      unregisterTerminalPanelBinding({ hostId: props.api.id })
    }
  }, [props.api.id, terminalModel])

  useEffect(() => {
    const syncPanelCount = () => {
      setPanelCount(props.api.group.panels.length)
    }

    syncPanelCount()

    const activePanelChangeDisposable = props.api.group.api.onDidActivePanelChange(syncPanelCount)
    const groupChangeDisposable = props.api.onDidGroupChange(syncPanelCount)

    return () => {
      activePanelChangeDisposable.dispose()
      groupChangeDisposable.dispose()
    }
  }, [props.api])

  return (
    <RunaDomScopeProvider component="dockview-panel-widget" widget={props.api.id}>
      <Box
        data-runa-modal-anchor={props.api.id}
        data-runa-widget-tone-root=""
        onPointerDownCapture={() => onSetActiveWidgetHostId(props.api.id)}
        ref={handleRootRef}
        runaComponent="dockview-panel-root"
        style={panelContentStyle}
      >
        <Box runaComponent="dockview-panel-content" style={panelInnerContentStyle}>
          {terminalModel ? (
            <TerminalWidget
              hostId={props.api.id}
              preferDockviewHeaderChrome={panelCount === 1}
              runtimeWidgetId={terminalModel.widgetId}
              themeClassTarget={panelGroupElement}
              title={terminalModel.title}
            />
          ) : filesModel ? (
            <FilesPanelWidget
              connectionId={filesModel.connectionId}
              onOpenPreview={(preview) => {
                props.containerApi.addPanel({
                  id: preview.widgetId,
                  title: preview.title,
                  component: 'default',
                  params: createPreviewPanelParams(preview),
                  position: {
                    direction: 'right',
                    referencePanel: props.api.id,
                  },
                })
              }}
              onOpenTerminal={(terminal) => {
                props.containerApi.addPanel({
                  id: terminal.widgetId,
                  title: terminal.title,
                  component: 'default',
                  tabComponent: 'terminal-tab',
                  params: createTerminalPanelParams('workspace', terminal.widgetId, terminal.tabId),
                  position: {
                    direction: 'right',
                    referencePanel: props.api.id,
                  },
                })
              }}
              path={filesModel.path}
              title={filesModel.title}
              widgetId={filesModel.widgetId}
            />
          ) : previewModel ? (
            <PreviewPanelWidget
              connectionId={previewModel.connectionId}
              path={previewModel.path}
              title={previewModel.title}
              widgetId={previewModel.widgetId}
            />
          ) : isCommanderPanel ? (
            <CommanderPanelWidget />
          ) : (
            <>
              <Text runaComponent="dockview-panel-label">{`PANEL: ${props.api.id}`}</Text>
              <PanelModalActionsWidget hostId={props.api.id} panelTitle={props.api.id} />
            </>
          )}
        </Box>
        {isCommanderPanel ? null : (
          <ModalHostWidget hostId={props.api.id} mountNode={panelGroupElement} scope="widget" />
        )}
        {isCommanderPanel ? null : (
          <WidgetBusyOverlayWidget hostId={props.api.id} mountNode={panelGroupElement} />
        )}
      </Box>
    </RunaDomScopeProvider>
  )
}
