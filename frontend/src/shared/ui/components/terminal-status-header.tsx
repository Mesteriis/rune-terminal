import type * as React from 'react'

import { Activity, CircleSlash, Command, Laptop2, LoaderCircle, Server, SquareTerminal } from 'lucide-react'

import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Text } from '@/shared/ui/primitives'
import { DockviewTabPill } from '@/shared/ui/components/dockview-tab-pill'

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
  primaryText?: string
  showMeta?: boolean
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
  gap: 'var(--gap-md)',
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
  gap: 'var(--gap-sm)',
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
  gap: 'var(--gap-sm)',
  flexWrap: 'nowrap' as const,
  overflow: 'hidden' as const,
}

const titleTextStyle = {
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  fontWeight: 600,
  color: 'var(--runa-terminal-text-strong, var(--color-text-primary))',
}

const compactTitleTextStyle = {
  ...titleTextStyle,
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
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
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

function getConnectionMeta(connectionKind: TerminalConnectionKind) {
  return connectionKind === 'ssh' ? { Icon: Server, label: 'SSH' } : { Icon: Laptop2, label: 'Local' }
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
    <DockviewTabPill runaComponent={runaComponent} style={compact ? undefined : { minHeight: '24px' }}>
      {children}
    </DockviewTabPill>
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
  primaryText,
  showMeta = true,
}: TerminalStatusHeaderProps) {
  const connectionMeta = getConnectionMeta(connectionKind)
  const sessionMeta = getSessionMeta(sessionState)
  const iconSize = 14
  const titleIconSize = compact ? 18 : 16
  const displayText = primaryText ?? (compact ? cwd : title)

  return (
    <RunaDomScopeProvider component="terminal-status-header">
      <Box runaComponent="terminal-status-header-root" style={compact ? compactRootStyle : rootStyle}>
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
            {displayText}
          </Text>
        </Box>
        {showMeta || actionSlot ? (
          <Box
            runaComponent="terminal-status-header-meta-wrap"
            style={compact ? compactMetaWrapStyle : metaWrapStyle}
          >
            {showMeta ? (
              <>
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
                    style={
                      sessionMeta.spin ? { animation: 'runa-terminal-spin 1.2s linear infinite' } : undefined
                    }
                  />
                  <Text
                    runaComponent="terminal-status-header-session-text"
                    style={compact ? compactMetaTextStyle : metaTextStyle}
                  >
                    {sessionMeta.label}
                  </Text>
                </MetaItem>
                <MetaItem compact={compact} runaComponent="terminal-status-header-shell">
                  <Command
                    color="var(--runa-terminal-icon-muted, var(--color-text-secondary))"
                    size={iconSize}
                    strokeWidth={1.8}
                  />
                  <Text
                    runaComponent="terminal-status-header-shell-text"
                    style={compact ? compactMetaTextStyle : metaTextStyle}
                  >
                    {shellLabel}
                  </Text>
                </MetaItem>
              </>
            ) : null}
            {actionSlot}
          </Box>
        ) : null}
      </Box>
    </RunaDomScopeProvider>
  )
}
