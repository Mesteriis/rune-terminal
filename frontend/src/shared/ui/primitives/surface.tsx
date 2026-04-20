import * as React from 'react'

import { useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

export type SurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  runaComponent?: string
}

const surfaceStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  background: 'var(--color-canvas-elevated)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--padding-panel)',
  boxShadow: 'none',
}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { id, runaComponent, style, ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const identity = useRunaDomIdentity(runaComponent ?? `${scope.component}-surface`, id)

  return (
    <div
      {...props}
      ref={ref}
      data-runa-component={identity.scope.component}
      data-runa-layout={identity.scope.layout}
      data-runa-node={identity.node}
      data-runa-widget={identity.scope.widget}
      id={identity.id}
      style={{ ...surfaceStyle, ...style }}
    />
  )
})
