import type { CSSProperties } from 'react'

export const commanderRootStyle: CSSProperties = {
  position: 'relative',
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

export const commanderIconControlStyle: CSSProperties = {
  width: '28px',
  minWidth: '28px',
  height: '28px',
  minHeight: '28px',
  padding: 0,
  borderRadius: 'var(--radius-xs)',
  background: 'transparent',
  color: 'var(--runa-commander-text-secondary)',
  border: '1px solid var(--runa-commander-surface-border)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const commanderIconControlDisabledStyle: CSSProperties = {
  opacity: 0.4,
}

export const commanderModeButtonActiveStyle: CSSProperties = {
  color: 'var(--runa-commander-highlight-text)',
  borderColor: 'var(--runa-commander-highlight-border)',
  background: 'var(--runa-commander-highlight-fill)',
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
