import { Box, Button } from '../shared/ui/primitives'

const rightRailStyle = {
  flex: '0 0 40px',
  width: 40,
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'space-between',
  alignItems: 'center',
  boxSizing: 'border-box' as const,
  padding: 4,
  borderRadius: 0,
}

export function RightActionRailWidget() {
  return (
    <Box role="complementary" aria-label="Right action rail" style={rightRailStyle}>
      <Button aria-label="Open utility panel">+</Button>
      <Button aria-label="Open settings panel">*</Button>
    </Box>
  )
}
