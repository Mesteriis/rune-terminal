import * as React from 'react'

export type SurfaceProps = React.HTMLAttributes<HTMLDivElement>

const surfaceStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  background: 'var(--color-canvas-elevated)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--padding-panel)',
  boxShadow: 'none',
}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { style, ...props },
  ref,
) {
  return <div {...props} ref={ref} style={{ ...surfaceStyle, ...style }} />
})
