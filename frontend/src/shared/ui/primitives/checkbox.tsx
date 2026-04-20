import * as React from 'react'

import { useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

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

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { id, runaComponent, style, type = 'checkbox', ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const semanticComponent =
    runaComponent ??
    (typeof props['aria-label'] === 'string' && props['aria-label'].trim() !== ''
      ? props['aria-label']
      : (props.name ?? `${scope.component}-checkbox`))
  const identity = useRunaDomIdentity(semanticComponent, id)

  return (
    <input
      {...props}
      data-runa-component={identity.scope.component}
      data-runa-layout={identity.scope.layout}
      data-runa-node={identity.node}
      data-runa-widget={identity.scope.widget}
      id={identity.id}
      ref={ref}
      type={type}
      style={{ ...checkboxStyle, ...style }}
    />
  )
})
