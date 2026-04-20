import * as React from 'react'

import { useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

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

  return (
    <span
      {...props}
      data-runa-component={identity.scope.component}
      data-runa-layout={identity.scope.layout}
      data-runa-node={identity.node}
      data-runa-widget={identity.scope.widget}
      id={identity.id}
      ref={ref}
      style={{ ...textStyle, ...style }}
    />
  )
})
