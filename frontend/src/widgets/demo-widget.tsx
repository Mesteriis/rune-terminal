import { InputField } from '../shared/ui/components'
import { Box, Button, Text } from '../shared/ui/primitives'

export function DemoWidget() {
  return (
    <Box style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
      <Text>Widget</Text>
      <InputField label="Name" placeholder="Type here" />
      <Button>Submit</Button>
    </Box>
  )
}
