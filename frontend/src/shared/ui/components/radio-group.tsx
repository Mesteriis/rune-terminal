import { useId } from 'react'

import { Box, Label, Radio, Text } from '@/shared/ui/primitives'
import { resetBoxStyle } from '@/shared/ui/components/reset-box-style'

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
  ...resetBoxStyle,
  display: 'flex',
  gap: 'var(--gap-sm)',
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
  ...resetBoxStyle,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
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
  const groupLabelId = useId()

  return (
    <Box style={rootStyle}>
      {label ? <Text id={groupLabelId}>{label}</Text> : null}
      <Box
        aria-label={label ? undefined : name}
        aria-labelledby={label ? groupLabelId : undefined}
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
                {option.description ? <Text style={descriptionStyle}>{option.description}</Text> : null}
              </Box>
            </Label>
          )
        })}
      </Box>
    </Box>
  )
}
