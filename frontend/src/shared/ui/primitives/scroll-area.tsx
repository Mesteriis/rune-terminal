import * as React from 'react'

import { useRunaDomAttributes, useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

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
  const domAttributes = useRunaDomAttributes(identity)

  return <div {...props} {...domAttributes} ref={ref} style={{ ...scrollAreaStyle, ...style }} />
})
