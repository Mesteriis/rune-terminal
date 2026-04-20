import * as React from 'react'

import { Box, Button, type BoxProps, type ButtonProps } from '@/shared/ui/primitives'

const commanderPlainElementStyle: React.CSSProperties = {
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

type CommanderPlainBoxProps = BoxProps & {
  runaComponent: string
}

type CommanderPlainButtonProps = ButtonProps & {
  runaComponent: string
}

export const CommanderPlainBox = React.forwardRef<HTMLDivElement, CommanderPlainBoxProps>(function CommanderPlainBox(
  { style, ...props },
  ref,
) {
  return (
    <Box
      {...props}
      ref={ref}
      style={{ ...commanderPlainElementStyle, ...style }}
    />
  )
})

export function CommanderPlainButton({
  style,
  type = 'button',
  ...props
}: CommanderPlainButtonProps) {
  return (
    <Button
      {...props}
      style={{
        ...commanderPlainElementStyle,
        minWidth: 'unset',
        minHeight: 'unset',
        ...style,
      }}
      type={type}
    />
  )
}
