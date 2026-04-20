import { Box, Label, Radio, Text } from '@/shared/ui/primitives'

export type RadioGroupOption = {
  value: string
  label: string
  description?: string
}

export type RadioGroupProps = {
  name: string
  label?: string
  options: RadioGroupOption[]
  value: string
  onChange: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
}

const rootStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
}

const optionsBaseStyle = {
  display: 'flex',
  gap: 'var(--gap-sm)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const horizontalStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
}

const verticalStyle = {
  flexDirection: 'column' as const,
}

const optionLabelStyle = {
  width: '100%',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
}

const optionContentStyle = {
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

export function RadioGroup({
  name,
  label,
  options,
  value,
  onChange,
  orientation = 'vertical',
}: RadioGroupProps) {
  return (
    <Box style={rootStyle}>
      {label ? <Text>{label}</Text> : null}
      <Box
        role="radiogroup"
        style={{ ...optionsBaseStyle, ...(orientation === 'horizontal' ? horizontalStyle : verticalStyle) }}
      >
        {options.map((option) => {
          const optionId = `${name}-${option.value}`

          return (
            <Label htmlFor={optionId} key={option.value} style={optionLabelStyle}>
              <Radio
                checked={option.value === value}
                id={optionId}
                name={name}
                onChange={() => onChange(option.value)}
                value={option.value}
              />
              <Box style={optionContentStyle}>
                <Text>{option.label}</Text>
                {option.description ? (
                  <Text style={descriptionStyle}>{option.description}</Text>
                ) : null}
              </Box>
            </Label>
          )
        })}
      </Box>
    </Box>
  )
}
