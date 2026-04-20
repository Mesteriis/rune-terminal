import * as React from 'react'

import { useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  runaComponent?: string
}

const inputStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  background: 'var(--color-surface-glass-soft)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--padding-control-y) var(--padding-control-x)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  caretColor: 'var(--color-accent-emerald-strong)',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, runaComponent, style, ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const semanticComponent =
    runaComponent ??
    (typeof props['aria-label'] === 'string' && props['aria-label'].trim() !== ''
      ? props['aria-label']
      : props.name ?? props.placeholder ?? `${scope.component}-input`)
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
      style={{ ...inputStyle, ...style }}
    />
  )
})
