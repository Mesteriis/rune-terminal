import { Plus, Settings2 } from 'lucide-react'

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
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const railButtonStyle = {
  padding: '0',
  width: 'var(--size-control-min)',
  minWidth: 'var(--size-control-min)',
}

const railIconProps = {
  size: 16,
  strokeWidth: 1.75,
}

export function RightActionRailWidget() {
  return (
    <Box role="complementary" aria-label="Right action rail" style={rightRailStyle}>
      <Button aria-label="Open utility panel" style={railButtonStyle}>
        <Plus {...railIconProps} />
      </Button>
      <Button aria-label="Open settings panel" style={railButtonStyle}>
        <Settings2 {...railIconProps} />
      </Button>
    </Box>
  )
}
