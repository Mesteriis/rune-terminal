import * as React from 'react'

export type BoxProps = React.HTMLAttributes<HTMLDivElement>

const boxStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--padding-panel)',
  boxShadow: 'var(--shadow-glass-panel)',
  backdropFilter: 'var(--blur-glass-md)',
  WebkitBackdropFilter: 'var(--blur-glass-md)',
}

export const Box = React.forwardRef<HTMLDivElement, BoxProps>(function Box(
  { style, ...props },
  ref,
) {
  return <div {...props} ref={ref} style={{ ...boxStyle, ...style }} />
})
