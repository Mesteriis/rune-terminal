import type * as React from 'react'

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

const labelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
  color: 'var(--color-text)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
}

export function Label({ style, ...props }: LabelProps) {
  return <label {...props} style={{ ...labelStyle, ...style }} />
}
