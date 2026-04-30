import type * as React from 'react'

import { resetBoxStyle } from '@/shared/ui/components/reset-box-style'

export const terminalStatusHeaderRootStyle: React.CSSProperties = {
  ...resetBoxStyle,
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
  overflow: 'hidden',
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
