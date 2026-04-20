import { useUnit } from 'effector-react'
import type { IDockviewPanelProps } from 'dockview-react'
import { useEffect, useRef } from 'react'

import { CommanderDemoLayout } from '@/layouts'
import { $activeWidgetHostId, setActiveWidgetHostId } from '@/shared/model/widget-focus'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Text } from '@/shared/ui/primitives'
import { ModalHostWidget } from '@/widgets/panel/modal-host-widget'
import { PanelModalActionsWidget } from '@/widgets/panel/panel-modal-actions-widget'
import { resolveTerminalPanelParams } from '@/widgets/terminal/terminal-panel'
import { TerminalWidget } from '@/widgets/terminal/terminal-widget'
import { WidgetBusyOverlayWidget } from '@/widgets/panel/widget-busy-overlay-widget'

const panelContentStyle = {
  width: '100%',
  height: '100%',
  position: 'relative' as const,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 0,
  padding: 0,
  overflow: 'hidden' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const panelInnerContentStyle = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
  padding: 'calc(var(--padding-widget) / 2)',
  overflow: 'hidden' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

function isCommanderDemoPanel(panelId: string) {
  return panelId === 'tool' || panelId.startsWith('tool-')
}

export function DockviewPanelWidget(props: IDockviewPanelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [activeWidgetHostId, onSetActiveWidgetHostId] = useUnit([
    $activeWidgetHostId,
    setActiveWidgetHostId,
  ])
  const terminalModel = props.api.id.startsWith('terminal')
    ? resolveTerminalPanelParams(props.api.id, props.params)
    : null
  const isCommanderPanel = isCommanderDemoPanel(props.api.id)
  const isActiveWidget = activeWidgetHostId === props.api.id

  useEffect(() => {
    const groupElement = rootRef.current?.closest('.dv-groupview')

    if (!(groupElement instanceof HTMLElement)) {
      return
    }

    if (activeWidgetHostId === null) {
      delete groupElement.dataset.runaWidgetFocusState
      return
    }

    groupElement.dataset.runaWidgetFocusState = isActiveWidget ? 'active' : 'inactive'
  }, [activeWidgetHostId, isActiveWidget])

  return (
    <RunaDomScopeProvider component="dockview-panel-widget" widget={props.api.id}>
      <Box
        data-runa-modal-anchor={props.api.id}
        data-runa-widget-tone-root=""
        onPointerDownCapture={() => onSetActiveWidgetHostId(props.api.id)}
        ref={rootRef}
        runaComponent="dockview-panel-root"
        style={panelContentStyle}
      >
        <Box
          runaComponent="dockview-panel-content"
          style={panelInnerContentStyle}
        >
          {terminalModel ? (
            <TerminalWidget
              connectionKind={terminalModel.connectionKind}
              cwd={terminalModel.cwd}
              hostId={props.api.id}
              introLines={terminalModel.introLines}
              sessionState={terminalModel.sessionState}
              shellLabel={terminalModel.shellLabel}
            />
          ) : isCommanderPanel ? (
            <CommanderDemoLayout />
          ) : (
            <>
              <Text runaComponent="dockview-panel-label">{`PANEL: ${props.api.id}`}</Text>
              <PanelModalActionsWidget hostId={props.api.id} panelTitle={props.api.id} />
            </>
          )}
        </Box>
        {isCommanderPanel ? null : <ModalHostWidget hostId={props.api.id} scope="widget" />}
        {isCommanderPanel ? null : <WidgetBusyOverlayWidget hostId={props.api.id} />}
      </Box>
    </RunaDomScopeProvider>
  )
}
