import { useUnit } from 'effector-react'

import { $aiBlockedWidgetHostIds, toggleAiBlockedWidget } from '@/shared/model/ai-blocked-widgets'
import { openWidgetModal } from '@/shared/model/modal'
import { Box, Button } from '@/shared/ui/primitives'

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
  const [blockedWidgetHostIds, onOpenWidgetModal, onToggleAiBlockedWidget] = useUnit([
    $aiBlockedWidgetHostIds,
    openWidgetModal,
    toggleAiBlockedWidget,
  ])
  const isBlocked = blockedWidgetHostIds.includes(hostId)

  return (
    <Box style={actionsStyle}>
      <Button
        aria-label={`${isBlocked ? 'Release' : 'Block'} busy state for ${panelTitle}`}
        onClick={() => onToggleAiBlockedWidget(hostId)}
      >
        {isBlocked ? 'Release busy state' : 'Block widget'}
      </Button>
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
