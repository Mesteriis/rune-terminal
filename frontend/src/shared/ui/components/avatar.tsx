import { Box, type BoxProps } from '../primitives'

export type AvatarProps = Omit<BoxProps, 'children'> & {
  label?: string
  size?: number | string
  src: string
}

export function Avatar({
  label,
  size = 32,
  src,
  style,
  ...props
}: AvatarProps) {
  return (
    <Box
      {...props}
      aria-hidden={label == null ? true : undefined}
      aria-label={label}
      role={label == null ? undefined : 'img'}
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
    />
  )
}
