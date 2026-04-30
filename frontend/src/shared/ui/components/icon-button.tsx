import type * as React from 'react'

import { Button, type ButtonProps } from '@/shared/ui/primitives'

export type IconButtonProps = ButtonProps & {
  size?: 'sm' | 'md'
}

const sizeStyleMap = {
  sm: {
    width: '28px',
    minWidth: '28px',
    minHeight: '28px',
    height: '28px',
    padding: 0,
  },
  md: {
    width: '34px',
    minWidth: '34px',
    minHeight: '34px',
    height: '34px',
    padding: 0,
  },
} satisfies Record<'sm' | 'md', React.CSSProperties>

export function IconButton({ className, size = 'md', style, ...props }: IconButtonProps) {
  const nextClassName = ['runa-ui-icon-button', className].filter(Boolean).join(' ')

  return (
    <Button
      {...props}
      className={nextClassName}
      style={{
        ...sizeStyleMap[size],
        ...style,
      }}
    />
  )
}
