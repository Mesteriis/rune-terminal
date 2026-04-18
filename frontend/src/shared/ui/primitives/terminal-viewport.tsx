import * as React from 'react'

export type TerminalViewportProps = React.HTMLAttributes<HTMLDivElement>

const terminalViewportStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  position: 'relative',
  width: '100%',
  height: '100%',
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
  padding: 0,
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface-glass-soft)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
}

export const TerminalViewport = React.forwardRef<HTMLDivElement, TerminalViewportProps>(
  function TerminalViewport({ style, ...props }, ref) {
    return <div {...props} ref={ref} style={{ ...terminalViewportStyle, ...style }} />
  },
)
