import type * as React from 'react'

export type TextProps = React.HTMLAttributes<HTMLSpanElement>

const textStyle: React.CSSProperties = {
  color: 'var(--color-text)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
}

export function Text({ style, ...props }: TextProps) {
  return <span {...props} style={{ ...textStyle, ...style }} />
}
