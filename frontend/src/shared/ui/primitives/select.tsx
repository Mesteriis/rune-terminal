import type * as React from 'react'

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

const selectStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  background: 'var(--color-surface-glass-soft)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--padding-control-y) var(--padding-control-x)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
}

export function Select({ style, ...props }: SelectProps) {
  return <select {...props} style={{ ...selectStyle, ...style }} />
}
