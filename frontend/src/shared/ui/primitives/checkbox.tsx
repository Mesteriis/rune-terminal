import type * as React from 'react'

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>

const checkboxStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  margin: 0,
  accentColor: 'var(--color-accent-emerald-strong)',
  cursor: 'pointer',
}

export function Checkbox({ style, type = 'checkbox', ...props }: CheckboxProps) {
  return <input {...props} type={type} style={{ ...checkboxStyle, ...style }} />
}
