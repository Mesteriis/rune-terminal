import * as React from 'react'

import { useRunaDomAttributes, useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'
import { resolveSemanticComponent } from '@/shared/ui/primitives/semantic-component'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  runaComponent?: string
}

const inputStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  minWidth: 0,
  background: 'var(--runa-ui-bg, var(--color-surface-glass-soft))',
  color: 'var(--runa-ui-color, var(--color-text))',
  border: '1px solid var(--runa-ui-border, var(--color-border-strong))',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--padding-control-y) var(--padding-control-x)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  caretColor: 'var(--color-accent-emerald-strong)',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
  boxShadow: 'var(--runa-ui-shadow, none)',
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, id, runaComponent, style, ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const semanticComponent = resolveSemanticComponent({
    runaComponent,
    ariaLabel: props['aria-label'],
    fallbackCandidates: [props.name, props.placeholder],
    fallbackComponent: `${scope.component}-input`,
  })
  const identity = useRunaDomIdentity(semanticComponent, id)
  const domAttributes = useRunaDomAttributes(identity)

  const nextClassName = ['runa-ui-control', 'runa-ui-input', className].filter(Boolean).join(' ')

  return (
    <input
      {...props}
      {...domAttributes}
      className={nextClassName}
      ref={ref}
      style={{ ...inputStyle, ...style }}
    />
  )
})

Input.displayName = 'Input'
