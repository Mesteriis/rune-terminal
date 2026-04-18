import type * as React from 'react'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const inputStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  background: 'var(--color-surface-glass-soft)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--padding-control-y) var(--padding-control-x)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  caretColor: 'var(--color-accent-emerald-strong)',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
}

export function Input({ style, ...props }: InputProps) {
  return <input {...props} style={{ ...inputStyle, ...style }} />
}
