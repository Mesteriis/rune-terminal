import type * as React from 'react'

import { resetBoxStyle } from '@/shared/ui/components/reset-box-style'

export const terminalDockviewHeaderActionsWrapStyle: React.CSSProperties = {
  ...resetBoxStyle,
  display: 'flex',
  height: 'calc(100% - (var(--padding-widget) / 2))',
  minHeight: 0,
  minWidth: 'max-content',
  alignItems: 'center',
  justifyContent: 'flex-end',
  marginTop: 'calc(var(--padding-widget) / 2)',
  padding: '0 var(--space-xs) 0 0',
}

export const terminalDockviewActionGroupStyle: React.CSSProperties = {
  ...resetBoxStyle,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  minHeight: '28px',
  padding: '2px',
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 78%, transparent)',
}

export const terminalDockviewIconButtonStyle: React.CSSProperties = {
  width: '24px',
  minWidth: '24px',
  height: '24px',
  minHeight: '24px',
  padding: 0,
  borderColor: 'transparent',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  flex: '0 0 auto',
  color: 'var(--runa-terminal-text-secondary, var(--color-text-secondary))',
}

export const terminalDockviewTabCloseButtonStyle: React.CSSProperties = {
  ...terminalDockviewIconButtonStyle,
  marginLeft: '2px',
}
