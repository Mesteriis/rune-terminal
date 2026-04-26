import type { CSSProperties } from 'react'

export const previewPanelRootStyle: CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-sm)',
  minHeight: 0,
}

export const previewPanelHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  padding: 'var(--space-sm) var(--space-md)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-glass-soft)',
}

export const previewPanelHeaderMetaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-xs)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const previewPanelTitleStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-md)',
  fontWeight: 700,
  lineHeight: 'var(--line-height-md)',
}

export const previewPanelMetaStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const previewPanelRefreshButtonStyle: CSSProperties = {
  flex: '0 0 auto',
  minHeight: '24px',
  minWidth: 'auto',
  padding: '2px var(--space-sm)',
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const previewPanelBodyStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-glass)',
}

export const previewPanelBodyInnerStyle: CSSProperties = {
  minHeight: '100%',
  padding: 'var(--space-md)',
}

export const previewPanelStateStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const previewPanelCodeStyle: CSSProperties = {
  margin: 0,
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-md)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}
