import type { CSSProperties } from 'react'

export const rightRailStyle: CSSProperties = {
  flex: '0 0 var(--size-right-rail)',
  width: 'var(--size-right-rail)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxSizing: 'border-box',
  padding: 'var(--space-xs)',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const railButtonStyle: CSSProperties = {
  padding: '0',
  width: 'var(--size-control-min)',
  minWidth: 'var(--size-control-min)',
}

export const utilityMenuWrapStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const utilityMenuStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 'calc(100% + var(--space-xs))',
  width: '220px',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-xs)',
  padding: 'var(--space-xs)',
  zIndex: 'var(--z-modal)',
  border: '1px solid var(--color-border-strong)',
  boxShadow: 'var(--shadow-menu-popover)',
  backdropFilter: 'var(--blur-glass-md)',
  WebkitBackdropFilter: 'var(--blur-glass-md)',
}

export function resolveUtilityMenuItemStyle(isDisabled = false): CSSProperties {
  return {
    width: '100%',
    justifyContent: 'flex-start',
    gap: 'var(--gap-sm)',
    background: 'transparent',
    boxShadow: 'none',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.58 : 1,
  }
}

export const utilityMenuItemStyle: CSSProperties = {
  width: '100%',
  justifyContent: 'flex-start',
  gap: 'var(--gap-sm)',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const utilityMenuMetaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const utilityMenuTitleStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  fontWeight: 600,
}

export const utilityMenuStatusTextStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontWeight: 500,
}

export const utilityMenuSeparatorStyle: CSSProperties = {
  width: '100%',
  margin: '2px 0',
}
