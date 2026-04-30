import type { CSSProperties } from 'react'

export const topbarStyle: CSSProperties = {
  position: 'relative',
  zIndex: 'var(--z-shell-chrome)',
  height: 'var(--size-shell-header)',
  flex: '0 0 var(--size-shell-header)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.22rem',
  padding: '0 var(--padding-shell-inline) 0 0',
  border: 'none',
  borderBottom: '1px solid var(--color-border-subtle)',
  background: 'transparent',
  borderRadius: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const workspaceStripShellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginLeft: 'var(--offset-shell-tab-strip)',
  marginRight: 'auto',
  minWidth: 0,
  padding: 0,
  border: 'none',
  background: 'transparent',
  borderRadius: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const tabStripStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  minWidth: 0,
  flex: '0 1 auto',
  border: 'none',
  background: 'transparent',
  padding: 0,
  borderRadius: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const iconButtonStyle: CSSProperties = {
  padding: '0',
  width: 'var(--size-control-min)',
  minWidth: 'var(--size-control-min)',
  height: 'var(--size-control-min)',
  minHeight: 'var(--size-control-min)',
  overflow: 'hidden',
}

export const addWorkspaceButtonStyle: CSSProperties = {
  ...iconButtonStyle,
  width: '22px',
  minWidth: '22px',
  height: '22px',
  minHeight: '22px',
  borderColor: 'transparent',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const workspaceTabStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  minWidth: 'var(--size-workspace-tab-min)',
  minHeight: '30px',
  padding: '0 6px 0 9px',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface-glass-soft)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  color: 'var(--color-text-secondary)',
  fontSize: '0.82rem',
  lineHeight: '1.15',
  whiteSpace: 'nowrap',
  overflow: 'visible',
}

export const workspaceTabButtonStyle: CSSProperties = {
  flex: '1 1 auto',
  minWidth: 0,
  minHeight: '28px',
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  justifyContent: 'flex-start',
  overflow: 'hidden',
}

export const activeWorkspaceTabStyle: CSSProperties = {
  ...workspaceTabStyle,
  background: 'var(--color-surface-glass)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-border-strong)',
  boxShadow: 'none',
}

export const workspaceTabLabelStyle: CSSProperties = {
  minWidth: 0,
  flex: '1 1 auto',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export const workspaceTabMenuTriggerStyle: CSSProperties = {
  width: '22px',
  minWidth: '22px',
  height: '22px',
  minHeight: '22px',
  padding: 0,
  borderColor: 'transparent',
  background: 'transparent',
  color: 'inherit',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  flex: '0 0 auto',
}

export const workspaceTabMenuWrapStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  zIndex: 'var(--z-floating)',
}

export const workspaceTabMenuStyle: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  right: 0,
  width: '172px',
  padding: '6px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  background:
    'color-mix(in srgb, var(--color-surface-shell-header-action) 94%, var(--color-surface-glass-strong) 6%)',
  boxShadow: 'var(--shadow-glass-control)',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
  zIndex: 'var(--z-modal-widget)',
}

export const workspaceTabMenuActionStyle: CSSProperties = {
  justifyContent: 'flex-start',
  minHeight: '28px',
  padding: '0 9px',
  fontSize: '0.78rem',
  background: 'transparent',
  boxShadow: 'none',
}

export const workspaceTabDangerActionStyle: CSSProperties = {
  ...workspaceTabMenuActionStyle,
  color: 'var(--color-warning-text)',
}

export const workspaceTabMenuMutedActionStyle: CSSProperties = {
  ...workspaceTabMenuActionStyle,
  color: 'var(--color-text-secondary)',
  cursor: 'not-allowed',
}

export const workspaceTabRenameFormStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

export const workspaceTabRenameInputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  fontSize: '0.78rem',
  padding: '6px 8px',
}

export const workspaceTabRenameActionsStyle: CSSProperties = {
  display: 'flex',
  gap: '6px',
}

export const workspaceTabRenameButtonStyle: CSSProperties = {
  flex: '1 1 0',
  minHeight: '26px',
  fontSize: '0.75rem',
  padding: '0 8px',
  boxShadow: 'none',
}
