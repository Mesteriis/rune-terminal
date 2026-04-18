import type * as React from 'react'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>

const buttonStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--space-sm) var(--space-md)',
}

export function Button({ style, type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} style={{ ...buttonStyle, ...style }} />
}
