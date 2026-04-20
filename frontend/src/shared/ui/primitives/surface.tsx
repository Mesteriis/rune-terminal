import * as React from 'react'

import { useRunaDomAttributes, useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

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
  const domAttributes = useRunaDomAttributes(identity)

  return <div {...props} {...domAttributes} ref={ref} style={{ ...surfaceStyle, ...style }} />
})

Surface.displayName = 'Surface'
