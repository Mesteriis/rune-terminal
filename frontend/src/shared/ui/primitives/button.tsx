import type * as React from 'react'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>

const buttonStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 'var(--size-control-min)',
  minHeight: 'var(--size-control-min)',
  background: 'var(--color-surface-glass-strong)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--padding-control-y) var(--padding-control-x)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  boxShadow: 'var(--shadow-glass-control)',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
  cursor: 'pointer',
}

export function Button({ style, type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} style={{ ...buttonStyle, ...style }} />
}
