import type * as React from 'react'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const inputStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--space-sm) var(--space-md)',
}

export function Input({ style, ...props }: InputProps) {
  return <input {...props} style={{ ...inputStyle, ...style }} />
}
