import { Box, Button } from '../shared/ui/primitives'

const rightRailStyle = {
  flex: '0 0 var(--size-right-rail)',
  width: 'var(--size-right-rail)',
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'space-between',
  alignItems: 'center',
  boxSizing: 'border-box' as const,
  padding: 'var(--space-xs)',
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
