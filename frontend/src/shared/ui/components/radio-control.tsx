import { useRunaDomIdentity, useRunaDomScope } from '../dom-id'
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
  const scope = useRunaDomScope()
  const identity = useRunaDomIdentity(`${scope.component}-radio-input`, id)
  const inputId = identity.id

  return (
    <Label htmlFor={inputId} runaComponent={`${scope.component}-radio-label`} style={radioLabelStyle}>
      <Radio {...radioProps} id={inputId} runaComponent={`${scope.component}-radio-input`} />
      <Box runaComponent={`${scope.component}-radio-content`} style={radioContentStyle}>
        <Text runaComponent={`${scope.component}-radio-text`}>{label}</Text>
        {description ? (
          <Text runaComponent={`${scope.component}-radio-description`} style={descriptionStyle}>
            {description}
          </Text>
        ) : null}
      </Box>
    </Label>
  )
}
