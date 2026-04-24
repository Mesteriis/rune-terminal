import type * as React from 'react'

import { Activity, CircleSlash, Command, Laptop2, LoaderCircle, Server, SquareTerminal } from 'lucide-react'

import {
  terminalStatusHeaderClusterStyle,
  terminalStatusHeaderCompactClusterStyle,
  terminalStatusHeaderCompactMetaWrapStyle,
  terminalStatusHeaderCompactRootStyle,
  terminalStatusHeaderMetaItemStyle,
  terminalStatusHeaderMetaTextStyle,
  terminalStatusHeaderMetaWrapStyle,
  terminalStatusHeaderRootStyle,
  terminalStatusHeaderTitleTextStyle,
} from '@/shared/ui/components/terminal-status-header.styles'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Text } from '@/shared/ui/primitives'
import { DockviewTabPill } from '@/shared/ui/components/dockview-tab-pill'

export type TerminalConnectionKind = 'local' | 'ssh'
export type TerminalSessionState = 'running' | 'idle' | 'starting' | 'exited' | 'failed' | 'disconnected'

export type TerminalStatusHeaderProps = {
  title: string
  cwd: string
  shellLabel: string
  connectionKind: TerminalConnectionKind
  sessionState: TerminalSessionState
  compact?: boolean
  compactMetaMode?: 'full' | 'minimal'
  actionSlot?: React.ReactNode
  primaryText?: string
  showMeta?: boolean
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

  if (sessionState === 'failed') {
    return {
      Icon: CircleSlash,
      label: 'Failed',
      color: 'var(--color-text-danger, #d49797)',
      spin: false,
    }
  }

  if (sessionState === 'disconnected') {
    return {
      Icon: CircleSlash,
      label: 'Disconnected',
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
    <DockviewTabPill
      runaComponent={runaComponent}
      style={compact ? undefined : terminalStatusHeaderMetaItemStyle}
    >
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
  compactMetaMode = 'full',
  actionSlot,
  primaryText,
  showMeta = true,
}: TerminalStatusHeaderProps) {
  const connectionMeta = getConnectionMeta(connectionKind)
  const sessionMeta = getSessionMeta(sessionState)
  const iconSize = 14
  const titleIconSize = compact ? 18 : 16
  const displayText = primaryText ?? (compact ? cwd : title)
  const titleTooltip = compact && cwd.trim() !== '' ? cwd : displayText

  return (
    <RunaDomScopeProvider component="terminal-status-header">
      <Box
        runaComponent="terminal-status-header-root"
        style={compact ? terminalStatusHeaderCompactRootStyle : terminalStatusHeaderRootStyle}
      >
        <Box
          runaComponent="terminal-status-header-title-cluster"
          style={compact ? terminalStatusHeaderCompactClusterStyle : terminalStatusHeaderClusterStyle}
        >
          <SquareTerminal
            color="var(--runa-terminal-status-running, var(--color-accent-emerald-strong))"
            size={titleIconSize}
            strokeWidth={1.8}
          />
          <Text
            runaComponent="terminal-status-header-title"
            style={terminalStatusHeaderTitleTextStyle}
            title={titleTooltip}
          >
            {displayText}
          </Text>
        </Box>
        {showMeta || actionSlot ? (
          <Box
            runaComponent="terminal-status-header-meta-wrap"
            style={compact ? terminalStatusHeaderCompactMetaWrapStyle : terminalStatusHeaderMetaWrapStyle}
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
                    style={terminalStatusHeaderMetaTextStyle}
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
                    style={terminalStatusHeaderMetaTextStyle}
                  >
                    {sessionMeta.label}
                  </Text>
                </MetaItem>
                {!(compact && compactMetaMode === 'minimal') ? (
                  <MetaItem compact={compact} runaComponent="terminal-status-header-shell">
                    <Command
                      color="var(--runa-terminal-icon-muted, var(--color-text-secondary))"
                      size={iconSize}
                      strokeWidth={1.8}
                    />
                    <Text
                      runaComponent="terminal-status-header-shell-text"
                      style={terminalStatusHeaderMetaTextStyle}
                    >
                      {shellLabel}
                    </Text>
                  </MetaItem>
                ) : null}
              </>
            ) : null}
            {actionSlot}
          </Box>
        ) : null}
      </Box>
    </RunaDomScopeProvider>
  )
}
