import * as React from 'react'

import { useRunaDomAttributes, useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

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
  const domAttributes = useRunaDomAttributes(identity)

  return <img {...props} alt={alt} {...domAttributes} ref={ref} style={{ ...imageStyle, ...style }} />
})

Image.displayName = 'Image'
