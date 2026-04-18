import { Box, Button } from '../shared/ui/primitives'

type ShellTopbarWidgetProps = {
  isAiOpen: boolean
  onToggleAi: () => void
}

const topbarStyle = {
  height: 'var(--size-shell-header)',
  flex: '0 0 var(--size-shell-header)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  padding: '0 var(--padding-shell-inline)',
  border: 'none',
  background: 'transparent',
  borderRadius: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const tabStripStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  border: 'none',
  background: 'transparent',
  padding: 0,
  borderRadius: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
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
