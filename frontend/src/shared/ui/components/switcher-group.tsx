import { Box, Checkbox, Label, Text } from '@/shared/ui/primitives'
import { resetBoxStyle } from '@/shared/ui/components/reset-box-style'

export type SwitcherGroupOption = {
  value: string
  label: string
  description?: string
}

export type SwitcherGroupProps = {
  label?: string
  options: SwitcherGroupOption[]
  value: string[]
  onChange: (value: string[]) => void
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
  justifyContent: 'space-between',
  alignItems: 'center',
}

const optionTextStyle = {
  ...resetBoxStyle,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
}

const optionDescriptionStyle = {
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

export function SwitcherGroup({
  label,
  options,
  value,
  onChange,
  orientation = 'vertical',
}: SwitcherGroupProps) {
  const toggleOption = (nextValue: string) => {
    onChange(
      value.includes(nextValue)
        ? value.filter((currentValue) => currentValue !== nextValue)
        : [...value, nextValue],
    )
  }

  return (
    <Box style={rootStyle}>
      {label ? <Text>{label}</Text> : null}
      <Box
        style={{ ...optionsBaseStyle, ...(orientation === 'horizontal' ? horizontalStyle : verticalStyle) }}
      >
        {options.map((option) => {
          const optionId = `switcher-${option.value}`
          const checked = value.includes(option.value)

          return (
            <Label htmlFor={optionId} key={option.value} style={optionLabelStyle}>
              <Box style={optionTextStyle}>
                <Text>{option.label}</Text>
                {option.description ? <Text style={optionDescriptionStyle}>{option.description}</Text> : null}
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
              <Checkbox
                checked={checked}
                id={optionId}
                onChange={() => toggleOption(option.value)}
                style={hiddenCheckboxStyle}
              />
            </Label>
          )
        })}
      </Box>
    </Box>
  )
}
