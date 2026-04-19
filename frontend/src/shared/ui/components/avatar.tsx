import { useRunaDomIdentity, useRunaDomScope } from '../dom-id'
import { Box, type BoxProps } from '../primitives'

export type AvatarProps = Omit<BoxProps, 'children'> & {
  label?: string
  size?: number | string
  src: string
}

export function Avatar({
  label,
  runaComponent,
  size = 32,
  src,
  style,
  ...props
}: AvatarProps) {
  const scope = useRunaDomScope()
  const wrapperComponent = runaComponent ?? `${scope.component}-avatar`
  const imageIdentity = useRunaDomIdentity(`${wrapperComponent}-image`)

  return (
    <Box
      {...props}
      runaComponent={wrapperComponent}
      style={{
        width: size,
        minWidth: size,
        height: size,
        minHeight: size,
        padding: 0,
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'transparent',
        backgroundImage: `url(${src})`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        boxShadow: 'none',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        overflow: 'hidden',
        ...style,
      }}
    >
      <img
        alt={label ?? ''}
        aria-hidden={label == null ? true : undefined}
        data-runa-component={imageIdentity.scope.component}
        data-runa-layout={imageIdentity.scope.layout}
        data-runa-node={imageIdentity.node}
        data-runa-widget={imageIdentity.scope.widget}
        id={imageIdentity.id}
        src={src}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'contain',
          objectPosition: 'center',
          background: 'transparent',
        }}
      />
    </Box>
  )
}
