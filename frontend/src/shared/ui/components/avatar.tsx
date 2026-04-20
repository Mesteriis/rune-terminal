import { useRunaDomScope } from '@/shared/ui/dom-id'
import { Box, Image, type BoxProps } from '@/shared/ui/primitives'

export type AvatarProps = Omit<BoxProps, 'children'> & {
  label?: string
  size?: number | string
  src: string
}

export function Avatar({ label, runaComponent, size = 32, src, style, ...props }: AvatarProps) {
  const scope = useRunaDomScope()
  const wrapperComponent = runaComponent ?? `${scope.component}-avatar`

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
      <Image
        alt={label ?? ''}
        aria-hidden={label == null ? true : undefined}
        runaComponent={`${wrapperComponent}-image`}
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
