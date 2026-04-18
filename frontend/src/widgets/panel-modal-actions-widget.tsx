import { useUnit } from 'effector-react'

import { openWidgetModal } from '../shared/model/modal'
import { Box, Button } from '../shared/ui/primitives'

type PanelModalActionsWidgetProps = {
  hostId: string
  panelTitle: string
}

const actionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  marginTop: 'var(--margin-block-stack)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export function PanelModalActionsWidget({
  hostId,
  panelTitle,
}: PanelModalActionsWidgetProps) {
  const onOpenWidgetModal = useUnit(openWidgetModal)

  return (
    <Box style={actionsStyle}>
      <Button
        aria-label={`Open widget modal for ${panelTitle}`}
        onClick={() =>
          onOpenWidgetModal({
            hostId,
            title: `${panelTitle} modal`,
            description: `This modal is mounted over widget ${hostId} instead of the global body layer.`,
          })
        }
      >
        Open widget modal
      </Button>
    </Box>
  )
}
