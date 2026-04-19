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

import { RunaDomScopeProvider } from '../dom-id'
import { Box, Text } from '../primitives'

export type TerminalConnectionKind = 'local' | 'ssh'
export type TerminalSessionState = 'running' | 'idle' | 'starting' | 'exited'

export type TerminalStatusHeaderProps = {
  title: string
  cwd: string
  shellLabel: string
  connectionKind: TerminalConnectionKind
  sessionState: TerminalSessionState
  compact?: boolean
  actionSlot?: React.ReactNode
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

const compactRootStyle = {
  ...rootStyle,
  gap: 'var(--gap-sm)',
  minHeight: '100%',
  width: '100%',
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

const compactClusterStyle = {
  ...clusterStyle,
  gap: 'var(--gap-xs)',
  flex: '0 1 auto',
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

const compactMetaWrapStyle = {
  ...metaWrapStyle,
  flex: 1,
  gap: 'var(--gap-xs)',
  flexWrap: 'nowrap' as const,
  overflow: 'hidden' as const,
}

const metaItemStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  padding: '0 var(--space-sm)',
  minHeight: '24px',
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const compactMetaItemStyle = {
  ...metaItemStyle,
  gap: 'var(--gap-xs)',
  minHeight: '20px',
  padding: '0 var(--space-xs)',
}

const titleTextStyle = {
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  fontWeight: 600,
  color: 'var(--runa-terminal-text-strong, var(--color-text-primary))',
}

const compactTitleTextStyle = {
  ...titleTextStyle,
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

const metaTextStyle = {
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  color: 'var(--runa-terminal-text-secondary, var(--color-text-secondary))',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden' as const,
  textOverflow: 'ellipsis' as const,
}

const compactMetaTextStyle = {
  ...metaTextStyle,
  fontSize: '11px',
  lineHeight: '14px',
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
      color: 'var(--runa-terminal-status-idle, var(--color-accent-cold-tea))',
      spin: true,
    }
  }

  if (sessionState === 'idle') {
    return {
      Icon: Activity,
      label: 'Idle',
      color: 'var(--runa-terminal-status-idle, var(--color-accent-cold-tea))',
      spin: false,
    }
  }

  if (sessionState === 'exited') {
    return {
      Icon: CircleSlash,
      label: 'Exited',
      color: 'var(--runa-terminal-status-muted, var(--color-text-muted))',
      spin: false,
    }
  }

  return {
    Icon: Activity,
    label: 'Running',
    color: 'var(--runa-terminal-status-running, var(--color-accent-emerald-strong))',
    spin: false,
  }
}

function MetaItem({
  runaComponent,
  children,
  compact = false,
}: {
  children: React.ReactNode
  compact?: boolean
  runaComponent: string
}) {
  return (
    <Box
      runaComponent={runaComponent}
      style={compact ? compactMetaItemStyle : metaItemStyle}
    >
      {children}
    </Box>
  )
}

export function TerminalStatusHeader({
  title,
  cwd,
  shellLabel,
  connectionKind,
  sessionState,
  compact = false,
  actionSlot,
}: TerminalStatusHeaderProps) {
  const connectionMeta = getConnectionMeta(connectionKind)
  const sessionMeta = getSessionMeta(sessionState)
  const iconSize = compact ? 13 : 14
  const titleIconSize = compact ? 14 : 16

  return (
    <RunaDomScopeProvider component="terminal-status-header">
      <Box
        runaComponent="terminal-status-header-root"
        style={compact ? compactRootStyle : rootStyle}
      >
        <Box
          runaComponent="terminal-status-header-title-cluster"
          style={compact ? compactClusterStyle : clusterStyle}
        >
          <SquareTerminal
            color="var(--runa-terminal-status-running, var(--color-accent-emerald-strong))"
            size={titleIconSize}
            strokeWidth={1.8}
          />
          <Text
            runaComponent="terminal-status-header-title"
            style={compact ? compactTitleTextStyle : titleTextStyle}
          >
            {title}
          </Text>
        </Box>
        <Box
          runaComponent="terminal-status-header-meta-wrap"
          style={compact ? compactMetaWrapStyle : metaWrapStyle}
        >
          <MetaItem compact={compact} runaComponent="terminal-status-header-connection">
            <connectionMeta.Icon
              color="var(--runa-terminal-icon-muted, var(--color-text-secondary))"
              size={iconSize}
              strokeWidth={1.8}
            />
            <Text
              runaComponent="terminal-status-header-connection-text"
              style={compact ? compactMetaTextStyle : metaTextStyle}
            >
              {connectionMeta.label}
            </Text>
          </MetaItem>
          <MetaItem compact={compact} runaComponent="terminal-status-header-session">
            <sessionMeta.Icon
              color={sessionMeta.color}
              size={iconSize}
              strokeWidth={1.8}
              style={sessionMeta.spin ? { animation: 'runa-terminal-spin 1.2s linear infinite' } : undefined}
            />
            <Text
              runaComponent="terminal-status-header-session-text"
              style={compact ? compactMetaTextStyle : metaTextStyle}
            >
              {sessionMeta.label}
            </Text>
          </MetaItem>
          <MetaItem compact={compact} runaComponent="terminal-status-header-shell">
            <Command color="var(--runa-terminal-icon-muted, var(--color-text-secondary))" size={iconSize} strokeWidth={1.8} />
            <Text
              runaComponent="terminal-status-header-shell-text"
              style={compact ? compactMetaTextStyle : metaTextStyle}
            >
              {shellLabel}
            </Text>
          </MetaItem>
          <MetaItem compact={compact} runaComponent="terminal-status-header-cwd">
            <FolderTree
              color="var(--runa-terminal-icon-muted, var(--color-text-secondary))"
              size={iconSize}
              strokeWidth={1.8}
            />
            <Text
              runaComponent="terminal-status-header-cwd-text"
              style={compact ? compactMetaTextStyle : metaTextStyle}
            >
              {cwd}
            </Text>
          </MetaItem>
          {actionSlot}
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
