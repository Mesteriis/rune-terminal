import type * as React from 'react'

export type RadioProps = React.InputHTMLAttributes<HTMLInputElement>

const radioStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  margin: 0,
  accentColor: 'var(--color-accent-emerald-strong)',
  cursor: 'pointer',
}

export function Radio({ style, type = 'radio', ...props }: RadioProps) {
  return <input {...props} type={type} style={{ ...radioStyle, ...style }} />
}
