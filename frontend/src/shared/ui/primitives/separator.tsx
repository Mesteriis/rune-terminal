import * as React from 'react'

import { useRunaDomAttributes, useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

export type SeparatorProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical'
  runaComponent?: string
}

const baseStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  flexShrink: 0,
  background: 'var(--color-border-subtle)',
}

const horizontalStyle: React.CSSProperties = {
  width: '100%',
  height: '1px',
}

const verticalStyle: React.CSSProperties = {
  width: '1px',
  alignSelf: 'stretch',
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(function Separator(
  { id, orientation = 'horizontal', role = 'separator', runaComponent, style, ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const identity = useRunaDomIdentity(runaComponent ?? `${scope.component}-separator`, id)
  const domAttributes = useRunaDomAttributes(identity)

  return (
    <div
      {...props}
      aria-orientation={orientation}
      {...domAttributes}
      ref={ref}
      role={role}
      style={{
        ...baseStyle,
        ...(orientation === 'vertical' ? verticalStyle : horizontalStyle),
        ...style,
      }}
    />
  )
})
