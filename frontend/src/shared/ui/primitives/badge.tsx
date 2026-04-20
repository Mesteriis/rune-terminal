import * as React from 'react'

import { useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  runaComponent?: string
}

const badgeStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '20px',
  padding: '0 var(--space-sm)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-xs)',
  background: 'var(--color-canvas-elevated)',
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  whiteSpace: 'nowrap',
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { id, runaComponent, style, ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const identity = useRunaDomIdentity(runaComponent ?? `${scope.component}-badge`, id)

  return (
    <span
      {...props}
      data-runa-component={identity.scope.component}
      data-runa-layout={identity.scope.layout}
      data-runa-node={identity.node}
      data-runa-widget={identity.scope.widget}
      id={identity.id}
      ref={ref}
      style={{ ...badgeStyle, ...style }}
    />
  )
})
