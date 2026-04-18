import { Box } from '../shared/ui/primitives'
import {
  TerminalStatusHeader,
  TerminalSurface,
  type TerminalConnectionKind,
  type TerminalSessionState,
} from '../shared/ui/components'

export type TerminalWidgetProps = {
  children?: React.ReactNode
  hostId: string
  title: string
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
  children,
  hostId,
  title,
  cwd,
  shellLabel,
  connectionKind,
  sessionState,
  introLines,
}: TerminalWidgetProps) {
  return (
    <Box style={rootStyle}>
      <TerminalStatusHeader
        connectionKind={connectionKind}
        cwd={cwd}
        sessionState={sessionState}
        shellLabel={shellLabel}
        title={title}
      />
      {children ?? null}
      <TerminalSurface
        connectionKind={connectionKind}
        cwd={cwd}
        hostId={hostId}
        introLines={introLines}
        sessionState={sessionState}
        shellLabel={shellLabel}
      />
    </Box>
  )
}
