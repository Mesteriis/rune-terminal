import type * as React from 'react'

import { resetBoxStyle } from '@/shared/ui/components/reset-box-style'

export const terminalToolbarRootStyle: React.CSSProperties = {
  ...resetBoxStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-xs)',
  minHeight: '28px',
  minWidth: 0,
}

export const terminalToolbarClusterStyle: React.CSSProperties = {
  ...resetBoxStyle,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
  minWidth: 0,
}

export const terminalToolbarSectionStyle: React.CSSProperties = {
  ...resetBoxStyle,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
  minHeight: '28px',
  padding: '2px',
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 78%, transparent)',
}

export const terminalToolbarDividerStyle: React.CSSProperties = {
  ...resetBoxStyle,
  width: '1px',
  alignSelf: 'stretch',
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-border, var(--color-border-subtle)) 82%, transparent)',
}

export const terminalToolbarTrailingClusterStyle: React.CSSProperties = {
  ...resetBoxStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 'var(--gap-xs)',
  minWidth: 0,
  marginLeft: 'auto',
}

export const terminalToolbarSearchWrapStyle: React.CSSProperties = {
  ...terminalToolbarSectionStyle,
  flex: '1 1 240px',
  minWidth: '220px',
  maxWidth: 'min(28rem, 100%)',
}

export const terminalToolbarSearchInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: '120px',
  padding: 'var(--space-xs) var(--space-sm)',
  minHeight: '24px',
  borderColor: 'transparent',
  background: 'transparent',
  boxShadow: 'none',
  color: 'var(--runa-terminal-text-strong, var(--color-text-primary))',
  caretColor: 'var(--runa-terminal-status-running, var(--color-accent-emerald-strong))',
}

export const terminalToolbarSearchStatusStyle: React.CSSProperties = {
  color: 'var(--runa-terminal-text-muted, var(--color-text-muted))',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  minWidth: '4.6rem',
  textAlign: 'right',
  whiteSpace: 'nowrap',
}

export const terminalToolbarIconButtonStyle: React.CSSProperties = {
  minWidth: '24px',
  width: '24px',
  minHeight: '24px',
  height: '24px',
  padding: 0,
  borderColor: 'transparent',
  background: 'transparent',
  boxShadow: 'none',
  color: 'var(--runa-terminal-text-secondary, var(--color-text-secondary))',
}

export const terminalToolbarRendererBadgeStyle: React.CSSProperties = {
  ...terminalToolbarSectionStyle,
  gap: '6px',
  padding: '2px 8px',
  minHeight: '24px',
}

export const terminalToolbarBadgeTextStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  color: 'var(--runa-terminal-text-muted, var(--color-text-muted))',
  whiteSpace: 'nowrap',
}
