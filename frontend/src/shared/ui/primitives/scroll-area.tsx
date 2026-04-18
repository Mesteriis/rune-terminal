import * as React from 'react'

export type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement>

const scrollAreaStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  minWidth: 0,
  minHeight: 0,
  overflow: 'auto',
  background: 'transparent',
  color: 'var(--color-text)',
  border: 'none',
  borderRadius: 0,
  padding: 0,
  boxShadow: 'none',
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  { style, ...props },
  ref,
) {
  return <div {...props} ref={ref} style={{ ...scrollAreaStyle, ...style }} />
})
