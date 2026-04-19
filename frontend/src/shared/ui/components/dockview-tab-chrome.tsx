import type * as React from 'react'

import { Box } from '../primitives'

const dockviewTabRootStyle = {
  width: '100%',
  height: '100%',
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

const dockviewTabChromeActiveStyle = {
  flex: 1,
  minWidth: 0,
  height: 'calc(100% - (var(--padding-widget) / 2))',
  display: 'flex',
  alignItems: 'stretch',
  marginTop: 'calc(var(--padding-widget) / 2)',
  padding: '0 var(--space-xs)',
  border: '1px solid rgba(130, 188, 170, 0.18)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(130, 188, 170, 0.08)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const dockviewTabChromeInactiveStyle = {
  ...dockviewTabChromeActiveStyle,
  border: 'none',
  background: 'transparent',
}

const dockviewTabChromeSingleStyle = {
  ...dockviewTabChromeActiveStyle,
}

type DockviewTabChromeProps = {
  active: boolean
  children: React.ReactNode
  single: boolean
  style?: React.CSSProperties
}

export function DockviewTabChrome({
  active,
  children,
  single,
  style,
}: DockviewTabChromeProps) {
  return (
    <Box runaComponent="dockview-tab-root" style={dockviewTabRootStyle}>
      <Box
        runaComponent="dockview-tab-chrome"
        style={{
          ...(single
            ? dockviewTabChromeSingleStyle
            : (active ? dockviewTabChromeActiveStyle : dockviewTabChromeInactiveStyle)),
          ...style,
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
