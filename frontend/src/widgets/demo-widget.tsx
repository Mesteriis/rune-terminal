import { InputField } from '../shared/ui/components/input-field'
import { Box } from '../shared/ui/primitives/box'
import { Button } from '../shared/ui/primitives/button'
import { Text } from '../shared/ui/primitives/text'

export function DemoWidget() {
  return (
    <Box style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <Text>Widget</Text>
      <InputField label="Name" placeholder="Type here" />
      <Button>Submit</Button>
    </Box>
  )
}
