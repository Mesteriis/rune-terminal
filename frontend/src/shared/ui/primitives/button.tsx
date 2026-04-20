import * as React from 'react'

import { useRunaDomAttributes, useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'
import { resolveSemanticComponent } from '@/shared/ui/primitives/semantic-component'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  runaComponent?: string
}

const buttonStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 'var(--size-control-min)',
  minHeight: 'var(--size-control-min)',
  background: 'var(--color-surface-glass-strong)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--padding-control-y) var(--padding-control-x)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  boxShadow: 'var(--shadow-glass-control)',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
  cursor: 'pointer',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { id, runaComponent, style, type = 'button', ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const semanticComponent = resolveSemanticComponent({
    runaComponent,
    ariaLabel: props['aria-label'],
    fallbackComponent: `${scope.component}-button`,
  })
  const identity = useRunaDomIdentity(semanticComponent, id)
  const domAttributes = useRunaDomAttributes(identity)

  return <button {...props} {...domAttributes} ref={ref} type={type} style={{ ...buttonStyle, ...style }} />
})

Button.displayName = 'Button'
