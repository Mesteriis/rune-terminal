import type * as React from 'react'

import { resetBoxStyle } from '@/shared/ui/components/reset-box-style'

export const terminalStatusHeaderRootStyle: React.CSSProperties = {
  ...resetBoxStyle,
  position: 'relative',
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.7rem',
  minHeight: 'var(--size-terminal-status)',
}

export const terminalStatusHeaderCompactRootStyle: React.CSSProperties = {
  ...terminalStatusHeaderRootStyle,
  minHeight: '100%',
  width: '100%',
}

export const terminalStatusHeaderClusterStyle: React.CSSProperties = {
  ...resetBoxStyle,
  display: 'flex',
  alignItems: 'center',
  gap: '0.55rem',
  minWidth: 0,
}

export const terminalStatusHeaderTextStackStyle: React.CSSProperties = {
  ...resetBoxStyle,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '1px',
  minWidth: 0,
}

export const terminalStatusHeaderCompactClusterStyle: React.CSSProperties = {
  ...terminalStatusHeaderClusterStyle,
  flex: '0 1 auto',
}

export const terminalStatusHeaderMetaWrapStyle: React.CSSProperties = {
  ...resetBoxStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '0.45rem',
  flexWrap: 'wrap',
  minWidth: 0,
  rowGap: '0.35rem',
}

export const terminalStatusHeaderCompactMetaWrapStyle: React.CSSProperties = {
  ...terminalStatusHeaderMetaWrapStyle,
  flex: 1,
  flexWrap: 'nowrap',
  overflow: 'visible',
  gap: '0.4rem',
}

export const terminalStatusHeaderMetaGroupStyle: React.CSSProperties = {
  ...resetBoxStyle,
  position: 'relative',
  zIndex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  minHeight: '28px',
  minWidth: 0,
  padding: '2px',
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 78%, transparent)',
}

export const terminalStatusHeaderActionGroupStyle: React.CSSProperties = {
  ...terminalStatusHeaderMetaGroupStyle,
  flex: '0 0 auto',
}

export const terminalStatusHeaderTitleTextStyle: React.CSSProperties = {
  fontSize: '0.94rem',
  lineHeight: '1.2',
  fontWeight: 600,
  color: 'var(--runa-terminal-text-strong, var(--color-text-primary))',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export const terminalStatusHeaderSecondaryTextStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  lineHeight: '1.2',
  color: 'var(--runa-terminal-text-muted, var(--color-text-muted))',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export const terminalStatusHeaderMetaTextStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  lineHeight: '1.15',
  color: 'var(--runa-terminal-text-secondary, var(--color-text-secondary))',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export const terminalStatusHeaderMetaItemStyle: React.CSSProperties = {
  ['--runa-ui-bg' as string]:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 70%, var(--color-surface-canvas, transparent) 30%)',
  ['--runa-ui-border' as string]:
    'color-mix(in srgb, var(--runa-terminal-surface-border, var(--color-border-subtle)) 92%, transparent)',
  ['--runa-ui-color' as string]: 'var(--runa-terminal-text-strong, var(--color-text-primary))',
  minHeight: '22px',
  padding: '0 7px',
}

export const terminalStatusHeaderShellMenuWrapStyle: React.CSSProperties = {
  ...resetBoxStyle,
  position: 'relative',
  zIndex: 2,
  display: 'inline-flex',
  minWidth: 0,
}

export const terminalStatusHeaderShellTriggerStyle: React.CSSProperties = {
  ...terminalStatusHeaderMetaItemStyle,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  minWidth: 0,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--runa-ui-border, var(--color-border-strong))',
  background: 'var(--runa-ui-bg, var(--color-surface-glass-strong))',
  boxShadow: 'none',
  cursor: 'pointer',
}

export const terminalStatusHeaderShellMenuStyle: React.CSSProperties = {
  ...resetBoxStyle,
  position: 'fixed',
  zIndex: 'var(--z-modal-body)',
  display: 'grid',
  gap: '2px',
  minWidth: '190px',
  maxWidth: 'min(360px, 70vw)',
  maxHeight: 'min(320px, calc(100vh - 16px))',
  overflowY: 'auto',
  padding: '4px',
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-canvas-elevated)',
  boxShadow: 'var(--shadow-menu-popover)',
}

export const terminalStatusHeaderShellMenuItemStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '16px minmax(0, 1fr)',
  alignItems: 'center',
  gap: '7px',
  width: '100%',
  minHeight: '28px',
  padding: '4px 7px',
  border: '1px solid transparent',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  color: 'var(--runa-terminal-text-strong, var(--color-text-primary))',
  cursor: 'pointer',
  textAlign: 'left',
}

export const terminalStatusHeaderShellMenuItemActiveStyle: React.CSSProperties = {
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 82%, transparent)',
  borderColor: 'var(--runa-terminal-surface-border, var(--color-border-subtle))',
}

export const terminalStatusHeaderShellMenuItemNameStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  lineHeight: '1.15',
  color: 'var(--runa-terminal-text-strong, var(--color-text-primary))',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export const terminalStatusHeaderShellMenuItemPathStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  lineHeight: '1.15',
  color: 'var(--runa-terminal-text-muted, var(--color-text-muted))',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
