import { useId } from 'react'

import { Box, Label, Radio, Text, type RadioProps } from '../primitives'

export type RadioControlProps = Omit<RadioProps, 'type'> & {
  label: string
  description?: string
}

const radioLabelStyle = {
  width: '100%',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
}

const radioContentStyle = {
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

const descriptionStyle = {
  color: 'var(--color-text-secondary)',
}

export function RadioControl({ id, label, description, ...radioProps }: RadioControlProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Label htmlFor={inputId} style={radioLabelStyle}>
      <Radio {...radioProps} id={inputId} />
      <Box style={radioContentStyle}>
        <Text>{label}</Text>
        {description ? <Text style={descriptionStyle}>{description}</Text> : null}
      </Box>
    </Label>
  )
}
