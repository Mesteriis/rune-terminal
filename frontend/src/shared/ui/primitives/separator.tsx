import type * as React from 'react'

import { useRunaDomIdentity, useRunaDomScope } from '../dom-id'

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

export function Separator({
  id,
  orientation = 'horizontal',
  role = 'separator',
  runaComponent,
  style,
  ...props
}: SeparatorProps) {
  const scope = useRunaDomScope()
  const identity = useRunaDomIdentity(runaComponent ?? `${scope.component}-separator`, id)

  return (
    <div
      {...props}
      aria-orientation={orientation}
      data-runa-component={identity.scope.component}
      data-runa-layout={identity.scope.layout}
      data-runa-node={identity.node}
      data-runa-widget={identity.scope.widget}
      id={identity.id}
      role={role}
      style={{
        ...baseStyle,
        ...(orientation === 'vertical' ? verticalStyle : horizontalStyle),
        ...style,
      }}
    />
  )
}
