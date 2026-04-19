import type * as React from 'react'

import { useRunaDomIdentity, useRunaDomScope } from '../dom-id'

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  runaComponent?: string
}

const checkboxStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  margin: 0,
  accentColor: 'var(--color-accent-emerald-strong)',
  cursor: 'pointer',
}

export function Checkbox({ id, runaComponent, style, type = 'checkbox', ...props }: CheckboxProps) {
  const scope = useRunaDomScope()
  const semanticComponent =
    runaComponent ??
    (typeof props['aria-label'] === 'string' && props['aria-label'].trim() !== ''
      ? props['aria-label']
      : props.name ?? `${scope.component}-checkbox`)
  const identity = useRunaDomIdentity(semanticComponent, id)

  return (
    <input
      {...props}
      data-runa-component={identity.scope.component}
      data-runa-layout={identity.scope.layout}
      data-runa-node={identity.node}
      data-runa-widget={identity.scope.widget}
      id={identity.id}
      type={type}
      style={{ ...checkboxStyle, ...style }}
    />
  )
}
