import type * as React from 'react'

import { useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  runaComponent?: string
}

const selectStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  background: 'var(--color-surface-glass-soft)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--padding-control-y) var(--padding-control-x)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
}

export function Select({ id, runaComponent, style, ...props }: SelectProps) {
  const scope = useRunaDomScope()
  const semanticComponent =
    runaComponent ??
    (typeof props['aria-label'] === 'string' && props['aria-label'].trim() !== ''
      ? props['aria-label']
      : props.name ?? `${scope.component}-select`)
  const identity = useRunaDomIdentity(semanticComponent, id)

  return (
    <select
      {...props}
      data-runa-component={identity.scope.component}
      data-runa-layout={identity.scope.layout}
      data-runa-node={identity.node}
      data-runa-widget={identity.scope.widget}
      id={identity.id}
      style={{ ...selectStyle, ...style }}
    />
  )
}
