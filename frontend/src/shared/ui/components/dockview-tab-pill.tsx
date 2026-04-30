import type * as React from 'react'

import { Box } from '@/shared/ui/primitives'

type DockviewTabPillProps = React.HTMLAttributes<HTMLDivElement> & {
  runaComponent?: string
}

const dockviewTabPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  minWidth: 0,
  minHeight: '24px',
  padding: '0 8px',
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-canvas-elevated)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export function DockviewTabPill({
  className,
  runaComponent = 'dockview-tab-pill',
  style,
  ...props
}: DockviewTabPillProps) {
  const nextClassName = ['runa-ui-chip', 'runa-ui-status-badge', className].filter(Boolean).join(' ')

  return (
    <Box
      {...props}
      className={nextClassName}
      runaComponent={runaComponent}
      style={{
        ...dockviewTabPillStyle,
        ...style,
      }}
    />
  )
}
