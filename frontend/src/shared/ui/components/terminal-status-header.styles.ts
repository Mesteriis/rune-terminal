import type * as React from 'react'

import { resetBoxStyle } from '@/shared/ui/components/reset-box-style'

export const terminalStatusHeaderRootStyle: React.CSSProperties = {
  ...resetBoxStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-md)',
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
  gap: 'var(--gap-sm)',
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
  gap: 'var(--gap-sm)',
  flexWrap: 'wrap',
  minWidth: 0,
}

export const terminalStatusHeaderCompactMetaWrapStyle: React.CSSProperties = {
  ...terminalStatusHeaderMetaWrapStyle,
  flex: 1,
  flexWrap: 'nowrap',
  overflow: 'hidden',
}

export const terminalStatusHeaderTitleTextStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  fontWeight: 600,
  color: 'var(--runa-terminal-text-strong, var(--color-text-primary))',
}

export const terminalStatusHeaderMetaTextStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  color: 'var(--runa-terminal-text-secondary, var(--color-text-secondary))',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export const terminalStatusHeaderMetaItemStyle: React.CSSProperties = {
  minHeight: '24px',
}
