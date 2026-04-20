import * as React from 'react'

import { useRunaDomAttributes, useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'

export type TerminalViewportProps = React.HTMLAttributes<HTMLDivElement> & {
  runaComponent?: string
}

const terminalViewportStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  position: 'relative',
  width: '100%',
  height: '100%',
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
  padding: 0,
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--runa-terminal-surface-bg, var(--color-surface-glass-soft))',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  color: 'var(--runa-terminal-text-strong, var(--color-text-primary))',
  fontFamily: 'var(--font-family-mono)',
}

export const TerminalViewport = React.forwardRef<HTMLDivElement, TerminalViewportProps>(
  function TerminalViewport({ id, runaComponent, style, ...props }, ref) {
    const scope = useRunaDomScope()
    const identity = useRunaDomIdentity(runaComponent ?? `${scope.component}-terminal-viewport`, id)
    const domAttributes = useRunaDomAttributes(identity)

    return <div {...props} {...domAttributes} ref={ref} style={{ ...terminalViewportStyle, ...style }} />
  },
)
