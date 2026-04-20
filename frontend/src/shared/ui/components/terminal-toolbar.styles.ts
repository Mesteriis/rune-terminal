import type * as React from 'react'

import { resetBoxStyle } from '@/shared/ui/components/reset-box-style'

export const terminalToolbarRootStyle: React.CSSProperties = {
  ...resetBoxStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 'var(--gap-sm)',
  minHeight: '32px',
}

export const terminalToolbarClusterStyle: React.CSSProperties = {
  ...resetBoxStyle,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
}

export const terminalToolbarSearchWrapStyle: React.CSSProperties = {
  ...resetBoxStyle,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
  minWidth: 0,
  flex: 1,
}

export const terminalToolbarSearchInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: '160px',
  padding: 'var(--space-xs) var(--space-sm)',
  borderColor: 'var(--runa-terminal-surface-border, var(--color-border-strong))',
  background: 'var(--runa-terminal-surface-bg, var(--color-surface-glass-soft))',
  color: 'var(--runa-terminal-text-strong, var(--color-text-primary))',
  caretColor: 'var(--runa-terminal-status-running, var(--color-accent-emerald-strong))',
}

export const terminalToolbarIconButtonStyle: React.CSSProperties = {
  minWidth: '28px',
  minHeight: '28px',
  padding: '0 var(--space-sm)',
  borderColor: 'var(--runa-terminal-surface-border, var(--color-border-strong))',
  color: 'var(--runa-terminal-text-secondary, var(--color-text-secondary))',
}

export const terminalToolbarRendererBadgeStyle: React.CSSProperties = {
  ...resetBoxStyle,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
  marginLeft: 'auto',
  padding: '0 var(--space-sm)',
  minHeight: '24px',
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
}

export const terminalToolbarBadgeTextStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  color: 'var(--runa-terminal-text-muted, var(--color-text-muted))',
}
