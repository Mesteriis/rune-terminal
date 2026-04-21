import { useId } from 'react'

import { Box, Input, Label, type InputProps } from '@/shared/ui/primitives'

export type InputFieldProps = InputProps & {
  label: string
}

export function InputField({ label, id, ...inputProps }: InputFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}>
      <Label htmlFor={inputId}>{label}</Label>
      <Input {...inputProps} id={inputId} />
    </Box>
  )
}
