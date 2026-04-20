import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useUnit } from 'effector-react'

import { BODY_MODAL_HOST_ID, $modals, closeHostModals, closeModal } from '@/shared/model/modal'
import { DialogPopup } from '@/shared/ui/components'
import { Box } from '@/shared/ui/primitives'
import {
  bodyOverlayStyle,
  modalStackStyle,
  widgetOverlayStyle,
} from '@/widgets/panel/modal-host-widget.styles'

type ModalHostWidgetProps = {
  hostId: string
  mountNode?: HTMLElement | null
  scope: 'body' | 'widget'
}

export function ModalHostWidget({
  hostId,
  mountNode: explicitMountNode = null,
  scope,
}: ModalHostWidgetProps) {
  const [modals, onCloseModal, onCloseHostModals] = useUnit([$modals, closeModal, closeHostModals])

  const hostModals = useMemo(() => modals.filter((modal) => modal.hostId === hostId), [hostId, modals])

  useEffect(() => {
    if (scope !== 'widget') {
      return
    }

    return () => {
      onCloseHostModals({ hostId })
    }
  }, [hostId, onCloseHostModals, scope])

  if (hostModals.length === 0) {
    return null
  }

  const overlay = (
    <Box
      data-runa-modal-host={scope}
      onClick={() => onCloseHostModals({ hostId })}
      style={scope === 'body' ? bodyOverlayStyle : widgetOverlayStyle}
    >
      <Box onClick={(event) => event.stopPropagation()} style={modalStackStyle}>
        {hostModals.map((modal) => (
          <DialogPopup
            confirmLabel="Acknowledge"
            key={modal.id}
            description={modal.description}
            onDismiss={() => onCloseModal({ id: modal.id })}
            title={modal.title}
            variant={modal.variant}
          />
        ))}
      </Box>
    </Box>
  )

  if (scope === 'body' || hostId === BODY_MODAL_HOST_ID) {
    return overlay
  }

  return explicitMountNode ? createPortal(overlay, explicitMountNode) : null
}
