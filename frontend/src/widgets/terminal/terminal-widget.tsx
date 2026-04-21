import { useRef } from 'react'

import { useTerminalSession } from '@/features/terminal/model/use-terminal-session'
import { RunaDomScopeProvider, useRunaDomAutoTagging } from '@/shared/ui/dom-id'
import { Box } from '@/shared/ui/primitives'
import { TerminalSurface, type TerminalSurfaceHandle } from '@/shared/ui/components'

export type TerminalWidgetProps = {
  hostId: string
  runtimeWidgetId: string
  title: string
  themeClassTarget?: HTMLElement | null
}

const rootStyle = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-md)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export function TerminalWidget({
  hostId,
  runtimeWidgetId,
  title,
  themeClassTarget = null,
}: TerminalWidgetProps) {
  const terminalRootRef = useRunaDomAutoTagging('terminal-widget-root')
  const terminalSurfaceRef = useRef<TerminalSurfaceHandle | null>(null)
  const terminalSession = useTerminalSession({
    runtimeWidgetId,
    title,
  })

  return (
    <RunaDomScopeProvider component="terminal-widget" widget={hostId}>
      <Box
        data-runa-terminal-root=""
        ref={terminalRootRef}
        runaComponent="terminal-widget-root"
        style={rootStyle}
      >
        <TerminalSurface
          hostId={hostId}
          onInput={terminalSession.canSendInput ? terminalSession.sendInputChunk : undefined}
          outputChunks={terminalSession.outputChunks}
          ref={terminalSurfaceRef}
          sessionKey={terminalSession.sessionKey}
          sessionState={terminalSession.sessionState}
          statusMessage={terminalSession.statusDetail}
          themeClassTarget={themeClassTarget}
        />
      </Box>
    </RunaDomScopeProvider>
  )
}
