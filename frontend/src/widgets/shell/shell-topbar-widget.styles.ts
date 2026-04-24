import type { CSSProperties } from 'react'

export const topbarStyle: CSSProperties = {
  height: 'var(--size-shell-header)',
  flex: '0 0 var(--size-shell-header)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
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
  padding: '2px',
  border: '1px solid var(--color-border-subtle)',
  background: 'color-mix(in srgb, var(--color-surface-shell-header-action) 82%, transparent)',
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
  width: '24px',
  minWidth: '24px',
  height: '24px',
  minHeight: '24px',
  borderColor: 'transparent',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const workspaceTabStyle: CSSProperties = {
  minWidth: 'var(--size-workspace-tab-min)',
  minHeight: '24px',
  padding: '0 10px',
  borderColor: 'transparent',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export const activeWorkspaceTabStyle: CSSProperties = {
  ...workspaceTabStyle,
  background:
    'color-mix(in srgb, var(--color-accent-shell-tab-active) 88%, var(--color-surface-cold-tea) 12%)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-accent-shell-tab-active-border)',
  boxShadow: 'var(--shadow-shell-tab-active)',
}
