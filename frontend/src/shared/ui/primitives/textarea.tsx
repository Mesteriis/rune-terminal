import type * as React from 'react'

import { useRunaDomIdentity, useRunaDomScope } from '../dom-id'

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  runaComponent?: string
}

const textAreaStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  minHeight: '120px',
  resize: 'vertical',
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

export function TextArea({ id, runaComponent, style, ...props }: TextAreaProps) {
  const scope = useRunaDomScope()
  const semanticComponent =
    runaComponent ??
    (typeof props['aria-label'] === 'string' && props['aria-label'].trim() !== ''
      ? props['aria-label']
      : props.name ?? props.placeholder ?? `${scope.component}-textarea`)
  const identity = useRunaDomIdentity(semanticComponent, id)

  return (
    <textarea
      {...props}
      data-runa-component={identity.scope.component}
      data-runa-layout={identity.scope.layout}
      data-runa-node={identity.node}
      data-runa-widget={identity.scope.widget}
      id={identity.id}
      style={{ ...textAreaStyle, ...style }}
    />
  )
}
