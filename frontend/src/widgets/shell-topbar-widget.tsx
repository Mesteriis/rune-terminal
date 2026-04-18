import { Box, Button } from '../shared/ui/primitives'

type ShellTopbarWidgetProps = {
  isAiOpen: boolean
  onToggleAi: () => void
}

const topbarStyle = {
  height: 40,
  flex: '0 0 40px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 12px',
  border: 'none',
  background: 'transparent',
}

const tabStripStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  background: 'transparent',
  padding: 0,
}

export function ShellTopbarWidget({ isAiOpen, onToggleAi }: ShellTopbarWidgetProps) {
  return (
    <Box style={topbarStyle}>
      <Button role="tab" aria-selected="false">
        Close
      </Button>
      <Button role="tab" aria-selected="false">
        Collapse
      </Button>
      <Button role="tab" aria-selected="false">
        Fullscreen
      </Button>
      <Button aria-pressed={isAiOpen} onClick={onToggleAi}>
        AI
      </Button>
      <Box role="tablist" aria-label="Workspace tabs" style={tabStripStyle}>
        <Button role="tab" aria-selected="true">
          TAB-1
        </Button>
        <Button role="tab" aria-selected="false">
          TAB-2
        </Button>
      </Box>
    </Box>
  )
}
