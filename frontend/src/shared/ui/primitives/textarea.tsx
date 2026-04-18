import type * as React from 'react'

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const textAreaStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  minHeight: '120px',
  resize: 'vertical',
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

export function TextArea({ style, ...props }: TextAreaProps) {
  return <textarea {...props} style={{ ...textAreaStyle, ...style }} />
}
