import type * as React from 'react'

export const dockviewPanelContentStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  padding: 0,
  overflow: 'hidden',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const terminalPanelInnerContentStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-sm)',
  padding: 'calc(var(--padding-widget) / 2)',
  overflow: 'hidden',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const standardPanelInnerContentStyle: React.CSSProperties = {
  ...terminalPanelInnerContentStyle,
  gap: 'var(--gap-xs)',
  paddingTop: '2px',
}

export function resolveDockviewPanelInnerContentStyle(isTerminalPanel: boolean) {
  return isTerminalPanel ? terminalPanelInnerContentStyle : standardPanelInnerContentStyle
}
