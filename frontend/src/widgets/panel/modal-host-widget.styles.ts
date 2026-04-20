import type { CSSProperties } from 'react'

const overlayBaseStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--padding-modal-layer)',
  border: 'none',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const bodyOverlayStyle: CSSProperties = {
  ...overlayBaseStyle,
  zIndex: 'var(--z-modal-body)',
  borderRadius: 0,
  background: 'var(--color-overlay-body)',
  backdropFilter: 'var(--blur-glass-md)',
  WebkitBackdropFilter: 'var(--blur-glass-md)',
}

export const widgetOverlayStyle: CSSProperties = {
  ...overlayBaseStyle,
  zIndex: 'var(--z-modal-widget)',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--color-overlay-widget)',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
}

export const modalStackStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}
