import * as React from 'react'

import { useRunaDomAttributes, useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'
import { resolveSemanticComponent } from '@/shared/ui/primitives/semantic-component'

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  runaComponent?: string
}

const selectStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  minWidth: 0,
  background: 'var(--runa-ui-bg, var(--color-surface-glass-soft))',
  color: 'var(--runa-ui-color, var(--color-text))',
  border: '1px solid var(--runa-ui-border, var(--color-border-strong))',
  borderRadius: 'var(--radius-sm)',
  padding:
    'var(--padding-control-y) calc(var(--padding-control-x) + 18px) var(--padding-control-y) var(--padding-control-x)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
  boxShadow: 'var(--runa-ui-shadow, none)',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  backgroundImage:
    'linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%)',
  backgroundPosition: 'calc(100% - 13px) calc(50% - 1px), calc(100% - 9px) calc(50% - 1px)',
  backgroundSize: '4px 4px, 4px 4px',
  backgroundRepeat: 'no-repeat',
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, id, runaComponent, style, ...props },
  ref,
) {
  const scope = useRunaDomScope()
  const semanticComponent = resolveSemanticComponent({
    runaComponent,
    ariaLabel: props['aria-label'],
    fallbackCandidates: [props.name],
    fallbackComponent: `${scope.component}-select`,
  })
  const identity = useRunaDomIdentity(semanticComponent, id)
  const domAttributes = useRunaDomAttributes(identity)

  const nextClassName = ['runa-ui-control', 'runa-ui-select', className].filter(Boolean).join(' ')

  return (
    <select
      {...props}
      {...domAttributes}
      className={nextClassName}
      ref={ref}
      style={{ ...selectStyle, ...style }}
    />
  )
})

Select.displayName = 'Select'
