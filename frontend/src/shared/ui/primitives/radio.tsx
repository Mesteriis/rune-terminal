import * as React from 'react'

import { useRunaDomAttributes, useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'
import { resolveSemanticComponent } from '@/shared/ui/primitives/semantic-component'

export type RadioProps = React.InputHTMLAttributes<HTMLInputElement> & {
  runaComponent?: string
}

const radioStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  margin: 0,
  accentColor: 'var(--color-accent-emerald-strong)',
  cursor: 'pointer',
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { id, runaComponent, style, type = 'radio', ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const semanticComponent = resolveSemanticComponent({
    runaComponent,
    ariaLabel: props['aria-label'],
    fallbackCandidates: [props.name],
    fallbackComponent: `${scope.component}-radio`,
  })
  const identity = useRunaDomIdentity(semanticComponent, id)
  const domAttributes = useRunaDomAttributes(identity)

  return <input {...props} {...domAttributes} ref={ref} type={type} style={{ ...radioStyle, ...style }} />
})

Radio.displayName = 'Radio'
