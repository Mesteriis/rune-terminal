import * as React from 'react'

import { useRunaDomAttributes, useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

export type TextProps = React.HTMLAttributes<HTMLSpanElement> & {
  runaComponent?: string
}

const textStyle: React.CSSProperties = {
  color: 'var(--color-text)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
}

export const Text = React.forwardRef<HTMLSpanElement, TextProps>(function Text(
  { id, runaComponent, style, ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const identity = useRunaDomIdentity(runaComponent ?? `${scope.component}-text`, id)
  const domAttributes = useRunaDomAttributes(identity)

  return <span {...props} {...domAttributes} ref={ref} style={{ ...textStyle, ...style }} />
})

Text.displayName = 'Text'
