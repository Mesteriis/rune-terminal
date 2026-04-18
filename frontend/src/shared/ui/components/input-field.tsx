import { Box, Input, type InputProps, Text } from '../primitives'

export type InputFieldProps = InputProps & {
  label: string
}

export function InputField({ label, ...inputProps }: InputFieldProps) {
  return (
    <Box style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      <Text>{label}</Text>
      <Input {...inputProps} />
    </Box>
  )
}
