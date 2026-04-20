import type * as React from 'react'

import { Box } from '@/shared/ui/primitives'

type DockviewTabPillProps = React.HTMLAttributes<HTMLDivElement> & {
  runaComponent?: string
}

const dockviewTabPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  minHeight: '28px',
  padding: '0 var(--space-sm)',
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-canvas-elevated)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export function DockviewTabPill({
  runaComponent = 'dockview-tab-pill',
  style,
  ...props
}: DockviewTabPillProps) {
  return (
    <Box
      {...props}
      runaComponent={runaComponent}
      style={{
        ...dockviewTabPillStyle,
        ...style,
      }}
    />
  )
}
