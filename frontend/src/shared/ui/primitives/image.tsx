import * as React from 'react'

import { useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

export type ImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  runaComponent?: string
}

const imageStyle: React.CSSProperties = {
  display: 'block',
  maxWidth: '100%',
}

export const Image = React.forwardRef<HTMLImageElement, ImageProps>(function Image(
  { alt, id, runaComponent, style, ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const semanticComponent =
    runaComponent ?? (typeof alt === 'string' && alt.trim() !== '' ? alt : `${scope.component}-image`)
  const identity = useRunaDomIdentity(semanticComponent, id)

  return (
    <img
      {...props}
      alt={alt}
      data-runa-component={identity.scope.component}
      data-runa-layout={identity.scope.layout}
      data-runa-node={identity.node}
      data-runa-widget={identity.scope.widget}
      id={identity.id}
      ref={ref}
      style={{ ...imageStyle, ...style }}
    />
  )
})
