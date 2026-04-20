import type * as React from 'react'

import { useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  runaComponent?: string
}

const labelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
  color: 'var(--color-text)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
}

export function Label({ id, runaComponent, style, ...props }: LabelProps) {
  const scope = useRunaDomScope()
  const identity = useRunaDomIdentity(runaComponent ?? `${scope.component}-label`, id)

  return (
    <label
      {...props}
      data-runa-component={identity.scope.component}
      data-runa-layout={identity.scope.layout}
      data-runa-node={identity.node}
      data-runa-widget={identity.scope.widget}
      id={identity.id}
      style={{ ...labelStyle, ...style }}
    />
  )
}
