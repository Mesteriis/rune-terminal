import * as React from 'react'

import { useRunaDomAttributes, useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'
import { resolveSemanticComponent } from '@/shared/ui/primitives/semantic-component'

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  runaComponent?: string
}

const textAreaStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  minHeight: '120px',
  resize: 'vertical',
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

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { className, id, runaComponent, style, ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const semanticComponent = resolveSemanticComponent({
    runaComponent,
    ariaLabel: props['aria-label'],
    fallbackCandidates: [props.name, props.placeholder],
    fallbackComponent: `${scope.component}-textarea`,
  })
  const identity = useRunaDomIdentity(semanticComponent, id)
  const domAttributes = useRunaDomAttributes(identity)

  const nextClassName = ['runa-ui-control', 'runa-ui-textarea', className].filter(Boolean).join(' ')

  return (
    <textarea
      {...props}
      {...domAttributes}
      className={nextClassName}
      ref={ref}
      style={{ ...textAreaStyle, ...style }}
    />
  )
})

TextArea.displayName = 'TextArea'
