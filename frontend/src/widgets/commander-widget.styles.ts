import type { CSSProperties } from 'react'

export const commanderRootStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-sm)',
  width: '100%',
  height: '100%',
  minWidth: 0,
  minHeight: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const commanderHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-md)',
  padding: 'var(--space-sm) var(--space-md)',
  minHeight: '40px',
  background: 'var(--color-canvas-elevated)',
}

export const commanderHeaderClusterStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const commanderModeButtonRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const commanderModeButtonStyle: CSSProperties = {
  minHeight: '26px',
  minWidth: 'auto',
  padding: '0 var(--space-sm)',
  borderRadius: 'var(--radius-xs)',
  background: 'transparent',
  border: '1px solid var(--color-border-subtle)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const commanderModeButtonActiveStyle: CSSProperties = {
  color: 'var(--runa-commander-highlight-text)',
  borderColor: 'var(--runa-commander-highlight-border)',
  background: 'var(--runa-commander-highlight-fill)',
}

export const commanderToggleButtonStyle: CSSProperties = {
  minHeight: '26px',
  minWidth: 'auto',
  padding: '0 var(--space-sm)',
  borderRadius: 'var(--radius-xs)',
  background: 'transparent',
  border: '1px solid var(--color-border-subtle)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const commanderToggleActiveStyle: CSSProperties = {
  color: 'var(--runa-commander-highlight-text)',
  borderColor: 'var(--runa-commander-highlight-border)',
  background: 'var(--runa-commander-highlight-fill)',
}

export const commanderMainStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: 'var(--gap-sm)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const commanderPaneStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  minHeight: 0,
  padding: 0,
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-canvas-elevated)',
}

export const commanderPaneActiveStyle: CSSProperties = {
  borderColor: 'var(--runa-commander-highlight-border)',
  boxShadow: 'inset 0 0 0 1px var(--runa-commander-highlight-ring)',
}

export const commanderPaneHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  minHeight: '32px',
  padding: '0 var(--space-sm)',
  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
  background: 'rgba(13, 21, 19, 0.96)',
}

export const commanderPaneHeaderActiveStyle: CSSProperties = {
  background: 'var(--runa-commander-highlight-fill-strong)',
}

export const commanderPaneTitleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  flex: 1,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const commanderPathTextStyle: CSSProperties = {
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const commanderPaneMetaStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}

export const commanderListHeaderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '18px minmax(0, 1fr) 34px 72px 116px',
  gap: 'var(--gap-sm)',
  alignItems: 'center',
  minHeight: '24px',
  padding: '0 var(--space-sm)',
  background: 'rgba(9, 16, 15, 0.96)',
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}

export const commanderScrollAreaStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  padding: 0,
  background: 'rgba(5, 11, 10, 0.96)',
}

export const commanderRowsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const commanderRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '18px minmax(0, 1fr) 34px 72px 116px',
  gap: 'var(--gap-sm)',
  alignItems: 'center',
  minHeight: '26px',
  padding: '0 var(--space-sm)',
  borderRadius: 0,
  border: '1px solid transparent',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}

export const commanderRowSelectedStyle: CSSProperties = {
  background: 'rgba(145, 168, 161, 0.12)',
  color: 'var(--color-text-primary)',
}

export const commanderRowFocusedStyle: CSSProperties = {
  borderColor: 'var(--runa-commander-highlight-border)',
  background: 'var(--runa-commander-highlight-fill)',
  color: 'var(--runa-commander-highlight-text)',
}

export const commanderRowHiddenStyle: CSSProperties = {
  opacity: 0.58,
}

export const commanderRowNameCellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const commanderRowNameTextStyle: CSSProperties = {
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export const commanderRowMetaTextStyle: CSSProperties = {
  justifySelf: 'end',
  color: 'inherit',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}

export const commanderTypeBadgeStyle: CSSProperties = {
  minHeight: '18px',
  padding: '0 var(--space-xs)',
  borderRadius: 'var(--radius-xs)',
  borderColor: 'var(--color-border-subtle)',
  background: 'rgba(255, 255, 255, 0.02)',
  color: 'var(--color-text-muted)',
  fontSize: '11px',
  lineHeight: '14px',
  fontFamily: 'var(--font-family-mono)',
}

export const commanderPaneFooterStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  minHeight: '28px',
  padding: '0 var(--space-sm)',
  background: 'rgba(13, 21, 19, 0.98)',
  borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
}

export const commanderFooterTextStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}

export const commanderHintBarStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
  gap: 'var(--gap-xs)',
  padding: 'var(--space-xs)',
  background: 'var(--color-canvas-elevated)',
}

export const commanderHintCellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minHeight: '28px',
  padding: '0 var(--space-sm)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-xs)',
  background: 'rgba(9, 16, 15, 0.98)',
}

export const commanderHintKeyStyle: CSSProperties = {
  color: 'var(--runa-commander-key-color)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const commanderHintLabelStyle: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}
