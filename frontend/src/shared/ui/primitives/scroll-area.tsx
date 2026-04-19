import * as React from 'react'

import { useRunaDomIdentity, useRunaDomScope } from '../dom-id'

export type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement> & {
  runaComponent?: string
}

const scrollAreaStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  minWidth: 0,
  minHeight: 0,
  overflow: 'auto',
  background: 'transparent',
  color: 'var(--color-text)',
  border: 'none',
  borderRadius: 0,
  padding: 0,
  boxShadow: 'none',
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  { id, runaComponent, style, ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const identity = useRunaDomIdentity(runaComponent ?? `${scope.component}-scroll-area`, id)

  return (
    <div
      {...props}
      ref={ref}
      data-runa-component={identity.scope.component}
      data-runa-layout={identity.scope.layout}
      data-runa-node={identity.node}
      data-runa-widget={identity.scope.widget}
      id={identity.id}
      style={{ ...scrollAreaStyle, ...style }}
    />
  )
})
