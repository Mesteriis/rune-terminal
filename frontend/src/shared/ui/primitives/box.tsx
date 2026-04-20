import * as React from 'react'

import { useRunaDomAttributes, useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

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
  const domAttributes = useRunaDomAttributes(identity)

  return <div {...props} {...domAttributes} ref={ref} style={{ ...boxStyle, ...style }} />
})

Box.displayName = 'Box'
