import { Box } from '../primitives/box'
import { Input, type InputProps } from '../primitives/input'
import { Text } from '../primitives/text'

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
