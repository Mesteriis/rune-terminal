import type * as React from 'react'

export type BoxProps = React.HTMLAttributes<HTMLDivElement>

const boxStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--space-md)',
}

export function Box({ style, ...props }: BoxProps) {
  return <div {...props} style={{ ...boxStyle, ...style }} />
}
