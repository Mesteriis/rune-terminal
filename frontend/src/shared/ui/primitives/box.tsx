import * as React from 'react'

import { useRunaDomIdentity, useRunaDomScope } from '../dom-id'

export type BoxProps = React.HTMLAttributes<HTMLDivElement> & {
  runaComponent?: string
}

const boxStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--padding-panel)',
  boxShadow: 'var(--shadow-glass-panel)',
  backdropFilter: 'var(--blur-glass-md)',
  WebkitBackdropFilter: 'var(--blur-glass-md)',
}

export const Box = React.forwardRef<HTMLDivElement, BoxProps>(function Box(
  { id, runaComponent, style, ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const identity = useRunaDomIdentity(runaComponent ?? `${scope.component}-box`, id)

  return (
    <div
      {...props}
      ref={ref}
      data-runa-component={identity.scope.component}
      data-runa-layout={identity.scope.layout}
      data-runa-node={identity.node}
      data-runa-widget={identity.scope.widget}
      id={identity.id}
      style={{ ...boxStyle, ...style }}
    />
  )
})
