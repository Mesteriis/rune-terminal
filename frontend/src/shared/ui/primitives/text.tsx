import type * as React from 'react'

export type TextProps = React.HTMLAttributes<HTMLSpanElement>

const textStyle: React.CSSProperties = {
  color: 'var(--color-text)',
}

export function Text({ style, ...props }: TextProps) {
  return <span {...props} style={{ ...textStyle, ...style }} />
}
