import type * as React from 'react'

import {
  Activity,
  CircleSlash,
  Command,
  FolderTree,
  Laptop2,
  LoaderCircle,
  Server,
  SquareTerminal,
} from 'lucide-react'

import { Box, Text } from '../primitives'

export type TerminalConnectionKind = 'local' | 'ssh'
export type TerminalSessionState = 'running' | 'idle' | 'starting' | 'exited'

export type TerminalStatusHeaderProps = {
  title: string
  cwd: string
  shellLabel: string
  connectionKind: TerminalConnectionKind
  sessionState: TerminalSessionState
}

const rootStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-md)',
  minHeight: 'var(--size-terminal-status)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const clusterStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const metaWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 'var(--gap-sm)',
  flexWrap: 'wrap' as const,
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const metaItemStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  padding: '0 var(--space-sm)',
  minHeight: '24px',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const titleTextStyle = {
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
}

const metaTextStyle = {
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  color: 'var(--color-text-secondary)',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden' as const,
  textOverflow: 'ellipsis' as const,
}

function getConnectionMeta(connectionKind: TerminalConnectionKind) {
  return connectionKind === 'ssh'
    ? { Icon: Server, label: 'SSH' }
    : { Icon: Laptop2, label: 'Local' }
}

function getSessionMeta(sessionState: TerminalSessionState) {
  if (sessionState === 'starting') {
    return {
      Icon: LoaderCircle,
      label: 'Starting',
      color: 'var(--color-accent-cold-tea)',
      spin: true,
    }
  }

  if (sessionState === 'idle') {
    return {
      Icon: Activity,
      label: 'Idle',
      color: 'var(--color-accent-cold-tea)',
      spin: false,
    }
  }

  if (sessionState === 'exited') {
    return {
      Icon: CircleSlash,
      label: 'Exited',
      color: 'var(--color-text-muted)',
      spin: false,
    }
  }

  return {
    Icon: Activity,
    label: 'Running',
    color: 'var(--color-accent-emerald-strong)',
    spin: false,
  }
}

function MetaItem({
  children,
}: {
  children: React.ReactNode
}) {
  return <Box style={metaItemStyle}>{children}</Box>
}

export function TerminalStatusHeader({
  title,
  cwd,
  shellLabel,
  connectionKind,
  sessionState,
}: TerminalStatusHeaderProps) {
  const connectionMeta = getConnectionMeta(connectionKind)
  const sessionMeta = getSessionMeta(sessionState)

  return (
    <Box style={rootStyle}>
      <Box style={clusterStyle}>
        <SquareTerminal color="var(--color-accent-emerald-strong)" size={16} strokeWidth={1.8} />
        <Text style={titleTextStyle}>{title}</Text>
      </Box>
      <Box style={metaWrapStyle}>
        <MetaItem>
          <connectionMeta.Icon color="var(--color-text-secondary)" size={14} strokeWidth={1.8} />
          <Text style={metaTextStyle}>{connectionMeta.label}</Text>
        </MetaItem>
        <MetaItem>
          <sessionMeta.Icon
            color={sessionMeta.color}
            size={14}
            strokeWidth={1.8}
            style={sessionMeta.spin ? { animation: 'runa-terminal-spin 1.2s linear infinite' } : undefined}
          />
          <Text style={metaTextStyle}>{sessionMeta.label}</Text>
        </MetaItem>
        <MetaItem>
          <Command color="var(--color-text-secondary)" size={14} strokeWidth={1.8} />
          <Text style={metaTextStyle}>{shellLabel}</Text>
        </MetaItem>
        <MetaItem>
          <FolderTree color="var(--color-text-secondary)" size={14} strokeWidth={1.8} />
          <Text style={metaTextStyle}>{cwd}</Text>
        </MetaItem>
      </Box>
    </Box>
  )
}
