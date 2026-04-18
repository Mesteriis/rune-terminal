import { Maximize2, Minus, Sparkles, X } from 'lucide-react'

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

const iconButtonStyle = {
  padding: '0',
  width: 'var(--size-control-min)',
  minWidth: 'var(--size-control-min)',
}

const actionIconProps = {
  size: 16,
  strokeWidth: 1.75,
}

export function ShellTopbarWidget({ isAiOpen, onToggleAi }: ShellTopbarWidgetProps) {
  return (
    <Box style={topbarStyle}>
      <Button aria-label="Close window" role="tab" aria-selected="false" style={iconButtonStyle}>
        <X {...actionIconProps} />
      </Button>
      <Button aria-label="Collapse window" role="tab" aria-selected="false" style={iconButtonStyle}>
        <Minus {...actionIconProps} />
      </Button>
      <Button aria-label="Toggle fullscreen" role="tab" aria-selected="false" style={iconButtonStyle}>
        <Maximize2 {...actionIconProps} />
      </Button>
      <Button
        aria-label="Toggle AI panel"
        aria-pressed={isAiOpen}
        onClick={onToggleAi}
        style={iconButtonStyle}
      >
        <Sparkles {...actionIconProps} />
      </Button>
      <Box role="tablist" aria-label="Workspace tabs" style={tabStripStyle}>
        <Button role="tab" aria-selected="true">
          Workspace-1
        </Button>
        <Button role="tab" aria-selected="false">
          Workspace-2
        </Button>
      </Box>
    </Box>
  )
}
