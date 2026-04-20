import { useRef } from 'react'

import { RunaDomScopeProvider, useRunaDomAutoTagging } from '@/shared/ui/dom-id'
import { Box } from '@/shared/ui/primitives'
import {
  TerminalSurface,
  type TerminalSurfaceHandle,
  type TerminalConnectionKind,
  type TerminalSessionState,
} from '@/shared/ui/components'

export type TerminalWidgetProps = {
  hostId: string
  cwd: string
  shellLabel: string
  connectionKind: TerminalConnectionKind
  sessionState: TerminalSessionState
  introLines?: string[]
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
  cwd,
  shellLabel,
  connectionKind,
  sessionState,
  introLines,
}: TerminalWidgetProps) {
  const terminalRootRef = useRunaDomAutoTagging('terminal-widget-root')
  const terminalSurfaceRef = useRef<TerminalSurfaceHandle | null>(null)

  return (
    <RunaDomScopeProvider component="terminal-widget" widget={hostId}>
      <Box
        data-runa-terminal-root=""
        ref={terminalRootRef}
        runaComponent="terminal-widget-root"
        style={rootStyle}
      >
        <TerminalSurface
          connectionKind={connectionKind}
          cwd={cwd}
          hostId={hostId}
          introLines={introLines}
          ref={terminalSurfaceRef}
          sessionState={sessionState}
          shellLabel={shellLabel}
        />
      </Box>
    </RunaDomScopeProvider>
  )
}
