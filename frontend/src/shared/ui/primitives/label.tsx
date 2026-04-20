import * as React from 'react'

import { useRunaDomAttributes, useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

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

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { id, runaComponent, style, ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const identity = useRunaDomIdentity(runaComponent ?? `${scope.component}-label`, id)
  const domAttributes = useRunaDomAttributes(identity)

  return <label {...props} {...domAttributes} ref={ref} style={{ ...labelStyle, ...style }} />
})
