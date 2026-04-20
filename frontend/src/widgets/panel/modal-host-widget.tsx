import { useEffect, useMemo, useState } from 'react'
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
  scope: 'body' | 'widget'
}

function getWidgetModalMountNode(hostId: string) {
  if (typeof document === 'undefined') {
    return null
  }

  const anchor = document.querySelector(`[data-runa-modal-anchor="${hostId}"]`)

  return anchor?.closest('.dv-groupview') as HTMLElement | null
}

export function ModalHostWidget({ hostId, scope }: ModalHostWidgetProps) {
  const [modals, onCloseModal, onCloseHostModals] = useUnit([$modals, closeModal, closeHostModals])
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null)

  const hostModals = useMemo(() => modals.filter((modal) => modal.hostId === hostId), [hostId, modals])

  useEffect(() => {
    if (scope !== 'widget') {
      return
    }

    const resolveMountNode = () => {
      setMountNode(getWidgetModalMountNode(hostId))
    }

    resolveMountNode()

    const frameId = window.requestAnimationFrame(resolveMountNode)

    return () => {
      window.cancelAnimationFrame(frameId)
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

  return mountNode ? createPortal(overlay, mountNode) : null
}
