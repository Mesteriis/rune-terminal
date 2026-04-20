import type { CSSProperties } from 'react'

export const topbarStyle: CSSProperties = {
  height: 'var(--size-shell-header)',
  flex: '0 0 var(--size-shell-header)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  padding: '0 var(--padding-shell-inline) 0 0',
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
  gap: 'var(--gap-sm)',
  marginLeft: 'var(--offset-shell-tab-strip)',
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
  marginLeft: 'auto',
}

export const workspaceTabStyle: CSSProperties = {
  minWidth: 'var(--size-workspace-tab-min)',
}

export const activeWorkspaceTabStyle: CSSProperties = {
  ...workspaceTabStyle,
  background: 'var(--color-accent-shell-tab-active)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-accent-shell-tab-active-border)',
  boxShadow: 'var(--shadow-shell-tab-active)',
}
