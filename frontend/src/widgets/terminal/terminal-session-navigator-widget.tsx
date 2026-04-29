import type { DockviewApi } from 'dockview-react'
import { RefreshCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  fetchTerminalSessionCatalog,
  restartTerminal,
  setActiveTerminalSession,
  type TerminalSessionCatalogEntry,
} from '@/features/terminal/api/client'
import { focusWorkspaceWidget } from '@/shared/api/workspace'
import { Box, Button, Text } from '@/shared/ui/primitives'
import { ensureAiTerminalVisibility } from '@/widgets/terminal/ensure-terminal-visibility'

const navigatorRootStyle = {
  display: 'grid',
  gap: '0.45rem',
} as const

const navigatorHeaderStyle = {
  alignItems: 'center',
  display: 'flex',
  gap: '0.45rem',
  justifyContent: 'space-between',
} as const

const navigatorFilterStyle = {
  background: 'color-mix(in srgb, var(--color-surface-glass-strong) 82%, transparent)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: '0.65rem',
  color: 'var(--color-text-primary)',
  font: 'inherit',
  minWidth: 0,
  outline: 'none',
  padding: '0.46rem 0.62rem',
} as const

const navigatorListStyle = {
  display: 'grid',
  gap: '0.42rem',
  maxHeight: '18rem',
  overflowY: 'auto',
} as const

const navigatorCardStyle = {
  background: 'color-mix(in srgb, var(--color-surface-glass-soft) 88%, transparent)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: '0.8rem',
  display: 'grid',
  gap: '0.35rem',
  padding: '0.62rem 0.72rem',
} as const

const navigatorCardHeaderStyle = {
  alignItems: 'center',
  display: 'flex',
  gap: '0.45rem',
  justifyContent: 'space-between',
} as const

const navigatorMetaRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.35rem',
} as const

const navigatorMetaBadgeStyle = {
  background: 'color-mix(in srgb, var(--color-surface-cold-tea) 52%, transparent)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: '999px',
  color: 'var(--color-text-secondary)',
  fontSize: '0.72rem',
  lineHeight: 1,
  padding: '0.18rem 0.42rem',
} as const

const navigatorActionRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.4rem',
} as const

function formatTerminalSessionScope(entry: TerminalSessionCatalogEntry) {
  const workspaceName = entry.workspace_name.trim() || 'Workspace'
  const tabTitle = entry.tab_title?.trim() || entry.widget_title.trim() || 'Terminal'
  return `${workspaceName} / ${tabTitle}`
}

function formatTerminalSessionPrimaryText(entry: TerminalSessionCatalogEntry) {
  return (
    entry.working_dir?.trim() ||
    entry.connection_name?.trim() ||
    entry.widget_title.trim() ||
    entry.session_id
  )
}

function resolveRecoveryLabel(entry: TerminalSessionCatalogEntry) {
  if (entry.status === 'running' || entry.status === 'starting') {
    return ''
  }
  if (entry.connection_kind === 'ssh' && entry.remote_launch_mode === 'tmux') {
    return 'Resume session'
  }
  if (entry.connection_kind === 'ssh') {
    return 'Reconnect shell'
  }
  return 'Restart shell'
}

type TerminalSessionNavigatorWidgetProps = {
  dockviewApiRef: { current: DockviewApi | null }
}

export function TerminalSessionNavigatorWidget({ dockviewApiRef }: TerminalSessionNavigatorWidgetProps) {
  const [entries, setEntries] = useState<TerminalSessionCatalogEntry[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null)

  const refresh = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const snapshot = await fetchTerminalSessionCatalog()
      setEntries(snapshot.sessions)
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim() ? error.message : 'Unable to load sessions.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const visibleEntries = useMemo(() => {
    const filter = filterQuery.trim().toLowerCase()
    if (filter === '') {
      return entries
    }

    return entries.filter((entry) =>
      [
        entry.workspace_name,
        entry.tab_title ?? '',
        entry.widget_title,
        entry.session_id,
        entry.connection_name ?? '',
        entry.connection_kind ?? '',
        entry.remote_session_name ?? '',
        entry.remote_launch_mode ?? '',
        entry.working_dir ?? '',
        entry.status,
        entry.status_detail ?? '',
      ].some((field) => field.toLowerCase().includes(filter)),
    )
  }, [entries, filterQuery])

  const handleFocus = async (entry: TerminalSessionCatalogEntry) => {
    const actionKey = `focus:${entry.widget_id}:${entry.session_id}`
    setPendingActionKey(actionKey)
    setErrorMessage(null)

    try {
      if (!entry.is_active_session) {
        await setActiveTerminalSession(entry.widget_id, entry.session_id)
      }
      await focusWorkspaceWidget(entry.widget_id)
      await ensureAiTerminalVisibility(dockviewApiRef.current, {
        requestedWidgetId: entry.widget_id,
        requestedWidgetTitle: entry.widget_title,
      })
      await refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim() ? error.message : 'Unable to focus session.',
      )
    } finally {
      setPendingActionKey(null)
    }
  }

  const handleRecover = async (entry: TerminalSessionCatalogEntry) => {
    const actionKey = `recover:${entry.widget_id}:${entry.session_id}`
    setPendingActionKey(actionKey)
    setErrorMessage(null)

    try {
      await restartTerminal(entry.widget_id)
      await focusWorkspaceWidget(entry.widget_id)
      await ensureAiTerminalVisibility(dockviewApiRef.current, {
        requestedWidgetId: entry.widget_id,
        requestedWidgetTitle: entry.widget_title,
      })
      await refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim() ? error.message : 'Unable to recover session.',
      )
    } finally {
      setPendingActionKey(null)
    }
  }

  return (
    <Box runaComponent="terminal-session-navigator-root" style={navigatorRootStyle}>
      <Box runaComponent="terminal-session-navigator-header" style={navigatorHeaderStyle}>
        <Text runaComponent="terminal-session-navigator-title">Terminal sessions</Text>
        <Button
          aria-label="Refresh terminal sessions"
          disabled={isLoading || pendingActionKey !== null}
          onClick={() => {
            void refresh()
          }}
        >
          <RefreshCcw size={12} strokeWidth={1.8} />
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </Box>
      <input
        aria-label="Filter terminal sessions"
        onChange={(event) => setFilterQuery(event.target.value)}
        placeholder="Filter by workspace, host, cwd, or status"
        style={navigatorFilterStyle}
        value={filterQuery}
      />
      {errorMessage ? <Text style={{ color: 'var(--color-danger-text)' }}>{errorMessage}</Text> : null}
      <Box runaComponent="terminal-session-navigator-list" style={navigatorListStyle}>
        {visibleEntries.map((entry) => {
          const recoveryLabel = resolveRecoveryLabel(entry)
          const focusActionKey = `focus:${entry.widget_id}:${entry.session_id}`
          const recoverActionKey = `recover:${entry.widget_id}:${entry.session_id}`
          const primaryText = formatTerminalSessionPrimaryText(entry)

          return (
            <Box
              key={`${entry.widget_id}:${entry.session_id}`}
              runaComponent="terminal-session-navigator-card"
              style={navigatorCardStyle}
            >
              <Box style={navigatorCardHeaderStyle}>
                <strong>{primaryText}</strong>
                <span style={navigatorMetaBadgeStyle}>
                  {entry.is_active_session ? 'active' : entry.status}
                </span>
              </Box>
              <Text>{formatTerminalSessionScope(entry)}</Text>
              <Box style={navigatorMetaRowStyle}>
                <span style={navigatorMetaBadgeStyle}>
                  {entry.connection_kind === 'ssh' ? 'SSH' : 'Local'}
                </span>
                <span style={navigatorMetaBadgeStyle}>{entry.shell || 'shell'}</span>
                {entry.connection_name ? (
                  <span style={navigatorMetaBadgeStyle}>{entry.connection_name}</span>
                ) : null}
                {entry.remote_session_name ? (
                  <span style={navigatorMetaBadgeStyle}>{`tmux:${entry.remote_session_name}`}</span>
                ) : null}
                {entry.is_active_widget ? <span style={navigatorMetaBadgeStyle}>focused widget</span> : null}
              </Box>
              {entry.status_detail ? <Text>{entry.status_detail}</Text> : null}
              <Box style={navigatorActionRowStyle}>
                <Button
                  aria-label={`Focus terminal session ${entry.session_id}`}
                  disabled={pendingActionKey !== null}
                  onClick={() => {
                    void handleFocus(entry)
                  }}
                >
                  {pendingActionKey === focusActionKey ? 'Opening…' : 'Open'}
                </Button>
                {recoveryLabel !== '' ? (
                  <Button
                    aria-label={`Recover terminal session ${entry.session_id}`}
                    disabled={pendingActionKey !== null}
                    onClick={() => {
                      void handleRecover(entry)
                    }}
                  >
                    {pendingActionKey === recoverActionKey ? 'Recovering…' : recoveryLabel}
                  </Button>
                ) : null}
              </Box>
            </Box>
          )
        })}
        {visibleEntries.length === 0 ? (
          <Text style={{ color: 'var(--color-text-secondary)' }}>
            No terminal sessions match the current filter.
          </Text>
        ) : null}
      </Box>
    </Box>
  )
}
