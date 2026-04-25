import type { CSSProperties } from 'react'

export const filesPanelRootStyle: CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-sm)',
  minHeight: 0,
}

export const filesPanelHeaderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-xs)',
  padding: 'var(--space-sm) var(--space-md)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-glass-soft)',
}

export const filesPanelTitleStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-md)',
  fontWeight: 700,
  lineHeight: 'var(--line-height-md)',
}

export const filesPanelPathStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const filesPanelListStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-glass)',
}

export const filesPanelListInnerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: 'var(--space-xs)',
}

export const filesPanelRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '32px minmax(0, 1fr) 88px 132px',
  gap: 'var(--gap-sm)',
  alignItems: 'center',
  padding: '5px var(--space-sm)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const filesPanelRowNameStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export const filesPanelStateStyle: CSSProperties = {
  padding: 'var(--space-md)',
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}
