import type * as React from 'react'

export const terminalWidgetRootStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
  flexDirection: 'column',
  gap: 'var(--gap-sm)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const terminalWidgetChromeStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  padding: 0,
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 72%, transparent)',
}

export const terminalWidgetHeaderRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-xs)',
  padding: '0.8rem 0.9rem 0.65rem',
  borderBottom: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
}

export const terminalWidgetToolbarRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-xs)',
  padding: '0.5rem 0.9rem 0.65rem',
}

export const terminalWidgetSurfaceWrapStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
}

export const terminalWidgetHeaderActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 'var(--gap-xs)',
}

export const terminalWidgetHeaderActionButtonStyle: React.CSSProperties = {
  width: '28px',
  minWidth: '28px',
  minHeight: '28px',
  height: '28px',
  padding: 0,
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-canvas-elevated)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  flex: '0 0 auto',
  color: 'var(--runa-terminal-text-muted, var(--color-text-muted))',
}
