import type { CSSProperties } from 'react'

export const topbarStyle: CSSProperties = {
  height: 'var(--size-shell-header)',
  flex: '0 0 var(--size-shell-header)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.22rem',
  padding: '0 var(--padding-shell-inline) 0 0',
  border: 'none',
  background: 'transparent',
  borderRadius: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const workspaceStripShellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  marginLeft: 'var(--offset-shell-tab-strip)',
  marginRight: 'auto',
  minWidth: 0,
  padding: '1px',
  border: '1px solid var(--color-border-subtle)',
  background: 'color-mix(in srgb, var(--color-surface-shell-header-action) 86%, transparent)',
  borderRadius: 'var(--radius-sm)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const tabStripStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
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
  minWidth: 'var(--size-workspace-tab-min)',
  minHeight: '22px',
  padding: '0 9px',
  borderColor: 'transparent',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  color: 'var(--color-text-secondary)',
  fontSize: '0.82rem',
  lineHeight: '1.15',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export const activeWorkspaceTabStyle: CSSProperties = {
  ...workspaceTabStyle,
  background:
    'color-mix(in srgb, var(--color-accent-shell-tab-active) 84%, var(--color-surface-cold-tea) 16%)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-accent-shell-tab-active-border)',
  boxShadow: 'var(--shadow-shell-tab-active)',
}
