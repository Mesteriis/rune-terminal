import type { CSSProperties } from 'react'

export const rightRailStyle: CSSProperties = {
  flex: '0 0 var(--size-right-rail)',
  width: 'var(--size-right-rail)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxSizing: 'border-box',
  padding: '0.22rem',
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
  width: '208px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  padding: '0.35rem',
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
    gap: '0.55rem',
    background: 'transparent',
    boxShadow: 'none',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.58 : 1,
    padding: '0.42rem 0.48rem',
  }
}

export const utilityMenuItemStyle: CSSProperties = {
  width: '100%',
  justifyContent: 'flex-start',
  gap: '0.55rem',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  padding: '0.42rem 0.48rem',
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
  fontSize: '0.88rem',
  lineHeight: '1.2',
  fontWeight: 600,
}

export const utilityMenuStatusTextStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: '0.76rem',
  lineHeight: '1.15',
  fontWeight: 500,
}

export const utilityMenuSeparatorStyle: CSSProperties = {
  width: '100%',
  margin: '1px 0',
}
