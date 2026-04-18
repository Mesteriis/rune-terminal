import { useId } from 'react'

import { Box, Checkbox, Label, Text, type CheckboxProps } from '../primitives'

export type SwitcherControlProps = Omit<CheckboxProps, 'type'> & {
  label: string
  description?: string
}

const switcherLabelStyle = {
  width: '100%',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const switcherTextStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const switcherDescriptionStyle = {
  color: 'var(--color-text-secondary)',
}

const hiddenCheckboxStyle = {
  position: 'absolute' as const,
  opacity: 0,
  pointerEvents: 'none' as const,
}

const trackBaseStyle = {
  width: '40px',
  minWidth: '40px',
  height: '22px',
  display: 'flex',
  alignItems: 'center',
  padding: '2px',
  border: '1px solid var(--color-border-strong)',
  borderRadius: '999px',
  background: 'var(--color-surface-glass-soft)',
  boxShadow: 'none',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
}

const thumbBaseStyle = {
  width: '16px',
  height: '16px',
  borderRadius: '999px',
  background: 'var(--color-text-primary)',
}

export function SwitcherControl({
  id,
  label,
  description,
  checked = false,
  ...checkboxProps
}: SwitcherControlProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Label htmlFor={inputId} style={switcherLabelStyle}>
      <Box style={switcherTextStyle}>
        <Text>{label}</Text>
        {description ? <Text style={switcherDescriptionStyle}>{description}</Text> : null}
      </Box>
      <Box
        style={{
          ...trackBaseStyle,
          justifyContent: checked ? 'flex-end' : 'flex-start',
          background: checked ? 'var(--color-surface-emerald)' : trackBaseStyle.background,
        }}
      >
        <Box style={thumbBaseStyle} />
      </Box>
      <Checkbox {...checkboxProps} checked={checked} id={inputId} style={hiddenCheckboxStyle} />
    </Label>
  )
}
