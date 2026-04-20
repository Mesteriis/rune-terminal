import type * as React from 'react'

export const tabsRootStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--gap-sm)',
}

export const tabsHorizontalLayoutStyle: React.CSSProperties = {
  flexDirection: 'column',
}

export const tabsVerticalLayoutStyle: React.CSSProperties = {
  flexDirection: 'row',
}

export const tabsListBaseStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--gap-xs)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const tabsHorizontalListStyle: React.CSSProperties = {
  flexDirection: 'row',
}

export const tabsVerticalListStyle: React.CSSProperties = {
  flexDirection: 'column',
  width: '220px',
}

export const tabsPanelStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
}
