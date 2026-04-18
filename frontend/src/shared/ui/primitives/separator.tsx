import type * as React from 'react'

export type SeparatorProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical'
}

const baseStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  flexShrink: 0,
  background: 'var(--color-border-subtle)',
}

const horizontalStyle: React.CSSProperties = {
  width: '100%',
  height: '1px',
}

const verticalStyle: React.CSSProperties = {
  width: '1px',
  alignSelf: 'stretch',
}

export function Separator({
  orientation = 'horizontal',
  role = 'separator',
  style,
  ...props
}: SeparatorProps) {
  return (
    <div
      {...props}
      aria-orientation={orientation}
      role={role}
      style={{
        ...baseStyle,
        ...(orientation === 'vertical' ? verticalStyle : horizontalStyle),
        ...style,
      }}
    />
  )
}
