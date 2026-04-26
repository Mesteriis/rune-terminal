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
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-xs)',
  padding: 'var(--space-sm) var(--space-md)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-glass-soft)',
}

export const filesPanelHeaderMetaStyle: CSSProperties = {
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

export const filesPanelParentButtonStyle: CSSProperties = {
  flex: '0 0 auto',
  minHeight: '24px',
  minWidth: 'auto',
  padding: '2px var(--space-sm)',
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const filesPanelControlsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  flex: '0 0 auto',
  minWidth: 0,
}

export const filesPanelFilterInputStyle: CSSProperties = {
  width: '150px',
  minHeight: '24px',
  padding: '2px var(--space-sm)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const filesPanelPathInputStyle: CSSProperties = {
  width: '220px',
  minHeight: '24px',
  padding: '2px var(--space-sm)',
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

export const filesPanelListHeaderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '56px minmax(0, 1fr) 88px 132px 184px',
  gap: 'var(--gap-sm)',
  alignItems: 'center',
  padding: '0 var(--space-sm) var(--space-xs)',
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-xs)',
  lineHeight: 'var(--line-height-sm)',
}

export const filesPanelSortButtonStyle: CSSProperties = {
  justifyContent: 'flex-start',
  minHeight: '22px',
  minWidth: 0,
  padding: '1px 0',
  border: 'none',
  background: 'transparent',
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-xs)',
  lineHeight: 'var(--line-height-sm)',
  boxShadow: 'none',
}

export const filesPanelSortButtonActiveStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
}

export const filesPanelSortButtonEndAlignedStyle: CSSProperties = {
  justifyContent: 'flex-end',
  textAlign: 'right',
}

export function resolveFilesPanelRowStyle(isDirectory: boolean, isInteractive = isDirectory): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: '56px minmax(0, 1fr) 88px 132px 184px',
    gap: 'var(--gap-sm)',
    alignItems: 'center',
    padding: '5px var(--space-sm)',
    borderRadius: 'var(--radius-sm)',
    color: isDirectory ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    cursor: isInteractive ? 'pointer' : 'default',
    fontSize: 'var(--font-size-sm)',
    lineHeight: 'var(--line-height-sm)',
  }
}

export const filesPanelRowActionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--gap-xs)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const filesPanelRowActionButtonStyle: CSSProperties = {
  minHeight: '22px',
  minWidth: 'auto',
  padding: '1px var(--space-xs)',
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-xs)',
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
