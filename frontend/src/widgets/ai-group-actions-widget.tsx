import { Button } from '../shared/ui/primitives'

type AiGroupActionsWidgetProps = {
  onAddTab: () => void
}

export function AiGroupActionsWidget({ onAddTab }: AiGroupActionsWidgetProps) {
  return (
    <Button aria-label="Add AI tab" onClick={onAddTab}>
      +
    </Button>
  )
}
