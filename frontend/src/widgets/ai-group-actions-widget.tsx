import { Plus } from 'lucide-react'

import { Button } from '../shared/ui/primitives'

type AiGroupActionsWidgetProps = {
  onAddTab: () => void
}

const iconButtonStyle = {
  padding: '0',
  width: 'var(--size-control-min)',
  minWidth: 'var(--size-control-min)',
}

export function AiGroupActionsWidget({ onAddTab }: AiGroupActionsWidgetProps) {
  return (
    <Button aria-label="Add AI tab" onClick={onAddTab} style={iconButtonStyle}>
      <Plus size={16} strokeWidth={1.75} />
    </Button>
  )
}
