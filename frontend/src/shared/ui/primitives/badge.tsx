import type * as React from 'react'

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement>

const badgeStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '20px',
  padding: '0 var(--space-sm)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-xs)',
  background: 'var(--color-canvas-elevated)',
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  whiteSpace: 'nowrap',
}

export function Badge({ style, ...props }: BadgeProps) {
  return <span {...props} style={{ ...badgeStyle, ...style }} />
}
