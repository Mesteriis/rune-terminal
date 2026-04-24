import type * as React from 'react'

export const commanderDockviewTabChromeStyle: React.CSSProperties = {
  alignItems: 'center',
  gap: '6px',
  padding: '0 6px',
}

export const commanderDockviewTabTitleStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--runa-commander-text-secondary, var(--color-text-secondary))',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const commanderDockviewTabTitleActiveStyle: React.CSSProperties = {
  ...commanderDockviewTabTitleStyle,
  color: 'var(--runa-commander-text-strong, var(--color-text-primary))',
}

export const commanderDockviewModePillStyle: React.CSSProperties = {
  borderColor: 'var(--runa-commander-highlight-badge-border)',
  color: 'var(--runa-commander-highlight-text)',
  fontFamily: 'var(--font-family-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontSize: '11px',
  lineHeight: '14px',
  minHeight: '24px',
  padding: '0 8px',
  flex: '0 0 auto',
}

export const commanderDockviewTabCloseButtonStyle: React.CSSProperties = {
  width: '24px',
  minWidth: '24px',
  height: '24px',
  minHeight: '24px',
  marginLeft: '2px',
  padding: 0,
  borderColor: 'transparent',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  flex: '0 0 auto',
  color: 'var(--runa-commander-text-secondary, var(--color-text-secondary))',
}
