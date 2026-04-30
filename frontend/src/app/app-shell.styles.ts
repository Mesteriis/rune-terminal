export const rootStyle = {
  position: 'relative' as const,
  height: '100%',
  display: 'flex',
  overflow: 'hidden' as const,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const mainShellStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const contentAreaStyle = {
  flex: 1,
  display: 'flex',
  minHeight: 0,
  overflow: 'hidden' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: '0.36rem 0.36rem 0 0',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPanelShellStyle = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPanelShellContentStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  overflow: 'visible' as const,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPanelFrameStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.45rem',
  overflow: 'visible' as const,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPanelHeaderStyle = {
  position: 'relative' as const,
  zIndex: 'var(--z-modal-widget)',
  flex: '0 0 auto',
  height: 'auto',
  minHeight: '44px',
  display: 'flex',
  alignItems: 'stretch',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPanelBodyStyle = {
  position: 'relative' as const,
  zIndex: 'var(--z-base)',
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden' as const,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiResizeHandleStyle = {
  flex: '0 0 6px',
  width: '6px',
  minWidth: '6px',
  minHeight: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  cursor: 'default',
  position: 'relative' as const,
}

export const workspaceStyle = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const dockviewContainerStyle = {
  height: '100%',
  width: '100%',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const workspaceCatalogStatusStyle = {
  height: '100%',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-glass-soft)',
}
