import type * as React from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  Activity,
  Check,
  CircleSlash,
  Command,
  Laptop2,
  LoaderCircle,
  Server,
  SquareTerminal,
} from 'lucide-react'

import {
  terminalStatusHeaderClusterStyle,
  terminalStatusHeaderCompactClusterStyle,
  terminalStatusHeaderActionGroupStyle,
  terminalStatusHeaderMetaGroupStyle,
  terminalStatusHeaderCompactMetaWrapStyle,
  terminalStatusHeaderCompactRootStyle,
  terminalStatusHeaderMetaItemStyle,
  terminalStatusHeaderMetaTextStyle,
  terminalStatusHeaderMetaWrapStyle,
  terminalStatusHeaderRootStyle,
  terminalStatusHeaderSecondaryTextStyle,
  terminalStatusHeaderShellMenuItemActiveStyle,
  terminalStatusHeaderShellMenuItemContentStyle,
  terminalStatusHeaderShellMenuItemNameStyle,
  terminalStatusHeaderShellMenuItemPathStyle,
  terminalStatusHeaderShellMenuItemStyle,
  terminalStatusHeaderShellMenuStyle,
  terminalStatusHeaderShellMenuWrapStyle,
  terminalStatusHeaderShellTriggerStyle,
  terminalStatusHeaderTextStackStyle,
  terminalStatusHeaderTitleTextStyle,
} from '@/shared/ui/components/terminal-status-header.styles'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Text } from '@/shared/ui/primitives'
import { DockviewTabPill } from '@/shared/ui/components/dockview-tab-pill'

export type TerminalConnectionKind = 'local' | 'ssh'
export type TerminalSessionState = 'running' | 'idle' | 'starting' | 'exited' | 'failed' | 'disconnected'

export type TerminalStatusShellOption = {
  path: string
  name: string
  default?: boolean
}

export type TerminalStatusHeaderProps = {
  title: string
  cwd: string
  shellLabel: string
  connectionKind: TerminalConnectionKind
  sessionState: TerminalSessionState
  activeShell?: string | null
  compact?: boolean
  compactMetaMode?: 'full' | 'minimal'
  actionSlot?: React.ReactNode
  isShellMenuDisabled?: boolean
  isShellMenuLoading?: boolean
  isShellSwitching?: boolean
  onOpenShellMenu?: () => Promise<void> | void
  onSelectShell?: (shellPath: string) => Promise<void> | void
  primaryText?: string
  secondaryText?: string
  shellOptions?: TerminalStatusShellOption[]
  showMeta?: boolean
}

type ShellMenuPosition = {
  right: number
  top: number
}

const shellMenuGap = 6
const shellMenuViewportMargin = 8

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
      color: 'var(--color-danger-text)',
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
  activeShell,
  compact = false,
  compactMetaMode = 'full',
  actionSlot,
  isShellMenuDisabled = false,
  isShellMenuLoading = false,
  isShellSwitching = false,
  onOpenShellMenu,
  onSelectShell,
  primaryText,
  secondaryText,
  shellOptions = [],
  showMeta = true,
}: TerminalStatusHeaderProps) {
  const connectionMeta = getConnectionMeta(connectionKind)
  const sessionMeta = getSessionMeta(sessionState)
  const [isShellMenuOpen, setIsShellMenuOpen] = useState(false)
  const [shellMenuPosition, setShellMenuPosition] = useState<ShellMenuPosition | null>(null)
  const shellMenuRootRef = useRef<HTMLDivElement | null>(null)
  const shellMenuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const shellMenuPanelRef = useRef<HTMLDivElement | null>(null)
  const shellMenuID = useId()
  const iconSize = 14
  const titleIconSize = compact ? 18 : 16
  const displayText = primaryText ?? (compact ? cwd : title)
  const titleTooltip = compact && cwd.trim() !== '' ? cwd : displayText
  const shouldRenderSecondaryText =
    !compact && typeof secondaryText === 'string' && secondaryText.trim() !== ''
  const canUseShellMenu = connectionKind === 'local' && typeof onSelectShell === 'function'
  const isShellTriggerDisabled = isShellMenuDisabled || isShellSwitching
  const updateShellMenuPosition = useCallback(() => {
    const trigger = shellMenuTriggerRef.current

    if (!trigger || typeof window === 'undefined') {
      return
    }

    const triggerRect = trigger.getBoundingClientRect()
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    const menuHeight = shellMenuPanelRef.current?.getBoundingClientRect().height ?? 0
    const availableTop =
      menuHeight > 0
        ? viewportHeight - shellMenuViewportMargin - menuHeight
        : triggerRect.bottom + shellMenuGap

    setShellMenuPosition({
      right: Math.max(shellMenuViewportMargin, viewportWidth - triggerRect.right),
      top: Math.max(shellMenuViewportMargin, Math.min(triggerRect.bottom + shellMenuGap, availableTop)),
    })
  }, [])

  useEffect(() => {
    if (!isShellMenuOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const root = shellMenuRootRef.current
      const panel = shellMenuPanelRef.current

      if (event.target instanceof Node && !root?.contains(event.target) && !panel?.contains(event.target)) {
        setIsShellMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsShellMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isShellMenuOpen])

  useEffect(() => {
    if (!isShellMenuOpen) {
      setShellMenuPosition(null)
      return
    }

    updateShellMenuPosition()

    window.addEventListener('resize', updateShellMenuPosition)
    window.addEventListener('scroll', updateShellMenuPosition, true)

    return () => {
      window.removeEventListener('resize', updateShellMenuPosition)
      window.removeEventListener('scroll', updateShellMenuPosition, true)
    }
  }, [isShellMenuOpen, updateShellMenuPosition])

  const handleShellTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (isShellTriggerDisabled) {
      return
    }

    setIsShellMenuOpen((current) => {
      const next = !current
      if (next) {
        updateShellMenuPosition()
        void onOpenShellMenu?.()
      }
      return next
    })
  }

  const handleShellSelect = (shellPath: string) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsShellMenuOpen(false)
    void onSelectShell?.(shellPath)
  }

  const shellMenuPanel = isShellMenuOpen ? (
    <Box
      id={shellMenuID}
      onPointerDown={(event) => event.stopPropagation()}
      ref={shellMenuPanelRef}
      role="menu"
      runaComponent="terminal-status-header-shell-menu"
      style={{
        ...terminalStatusHeaderShellMenuStyle,
        ...(shellMenuPosition
          ? {
              right: `${shellMenuPosition.right}px`,
              top: `${shellMenuPosition.top}px`,
            }
          : {
              right: 0,
              top: 0,
              visibility: 'hidden',
            }),
      }}
    >
      {shellOptions.map((shell) => {
        const isActiveShell = shell.path === activeShell
        return (
          <button
            key={shell.path}
            disabled={isShellSwitching}
            aria-label={`[ ${shell.name} ] ${shell.path}`}
            onClick={handleShellSelect(shell.path)}
            role="menuitem"
            style={{
              ...terminalStatusHeaderShellMenuItemStyle,
              ...(isActiveShell ? terminalStatusHeaderShellMenuItemActiveStyle : {}),
            }}
            title={shell.path}
            type="button"
          >
            {isActiveShell ? (
              <Check
                color="var(--runa-terminal-status-running, var(--color-accent-emerald-strong))"
                size={13}
                strokeWidth={2}
              />
            ) : (
              <span aria-hidden="true" />
            )}
            <span style={terminalStatusHeaderShellMenuItemContentStyle}>
              <span style={terminalStatusHeaderShellMenuItemNameStyle}>[ {shell.name} ]</span>
              <span style={terminalStatusHeaderShellMenuItemPathStyle}>{shell.path}</span>
            </span>
          </button>
        )
      })}
    </Box>
  ) : null
  const shellMenuPortal =
    shellMenuPanel && typeof document !== 'undefined' && document.body
      ? createPortal(shellMenuPanel, document.body)
      : shellMenuPanel

  const shellMeta = canUseShellMenu ? (
    <Box
      ref={shellMenuRootRef}
      runaComponent="terminal-status-header-shell-menu-wrap"
      style={terminalStatusHeaderShellMenuWrapStyle}
    >
      <button
        aria-controls={isShellMenuOpen ? shellMenuID : undefined}
        aria-expanded={isShellMenuOpen}
        aria-haspopup="menu"
        disabled={isShellTriggerDisabled}
        ref={shellMenuTriggerRef}
        onClick={handleShellTriggerClick}
        onPointerDown={(event) => event.stopPropagation()}
        style={terminalStatusHeaderShellTriggerStyle}
        title="Switch shell"
        type="button"
      >
        {isShellMenuLoading || isShellSwitching ? (
          <LoaderCircle
            color="var(--runa-terminal-icon-muted, var(--color-text-secondary))"
            size={iconSize}
            strokeWidth={1.8}
            style={{ animation: 'runa-terminal-spin 1.2s linear infinite' }}
          />
        ) : (
          <Command
            color="var(--runa-terminal-icon-muted, var(--color-text-secondary))"
            size={iconSize}
            strokeWidth={1.8}
          />
        )}
        <Text runaComponent="terminal-status-header-shell-text" style={terminalStatusHeaderMetaTextStyle}>
          {shellLabel}
        </Text>
      </button>
      {shellMenuPortal}
    </Box>
  ) : (
    <MetaItem compact={compact} runaComponent="terminal-status-header-shell">
      <Command
        color="var(--runa-terminal-icon-muted, var(--color-text-secondary))"
        size={iconSize}
        strokeWidth={1.8}
      />
      <Text runaComponent="terminal-status-header-shell-text" style={terminalStatusHeaderMetaTextStyle}>
        {shellLabel}
      </Text>
    </MetaItem>
  )

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
          {shouldRenderSecondaryText ? (
            <Box runaComponent="terminal-status-header-text-stack" style={terminalStatusHeaderTextStackStyle}>
              <Text
                runaComponent="terminal-status-header-title"
                style={terminalStatusHeaderTitleTextStyle}
                title={titleTooltip}
              >
                {displayText}
              </Text>
              <Text
                runaComponent="terminal-status-header-secondary"
                style={terminalStatusHeaderSecondaryTextStyle}
                title={secondaryText}
              >
                {secondaryText}
              </Text>
            </Box>
          ) : (
            <Text
              runaComponent="terminal-status-header-title"
              style={terminalStatusHeaderTitleTextStyle}
              title={titleTooltip}
            >
              {displayText}
            </Text>
          )}
        </Box>
        {showMeta || actionSlot ? (
          <Box
            runaComponent="terminal-status-header-meta-wrap"
            style={compact ? terminalStatusHeaderCompactMetaWrapStyle : terminalStatusHeaderMetaWrapStyle}
          >
            {showMeta || (compact && actionSlot) ? (
              <Box
                runaComponent="terminal-status-header-meta-group"
                style={terminalStatusHeaderMetaGroupStyle}
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
                          sessionMeta.spin
                            ? { animation: 'runa-terminal-spin 1.2s linear infinite' }
                            : undefined
                        }
                      />
                      <Text
                        runaComponent="terminal-status-header-session-text"
                        style={terminalStatusHeaderMetaTextStyle}
                      >
                        {sessionMeta.label}
                      </Text>
                    </MetaItem>
                    {!(compact && compactMetaMode === 'minimal') ? shellMeta : null}
                  </>
                ) : null}
                {compact && actionSlot ? actionSlot : null}
              </Box>
            ) : null}
            {actionSlot && !compact ? (
              <Box
                runaComponent="terminal-status-header-action-group"
                style={terminalStatusHeaderActionGroupStyle}
              >
                {actionSlot}
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </RunaDomScopeProvider>
  )
}
